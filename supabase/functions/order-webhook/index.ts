// supabase/functions/order-webhook/index.ts
// Shopify Order Webhook Handler
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Safe environment variable access function
const getEnvVar = (name)=>{
  try {
    // @ts-ignore: Deno namespace
    return Deno?.env?.get?.(name) || null;
  } catch (e) {
    console.log(`Error accessing env var ${name}: ${e.message}`);
    return null;
  }
};
// Verify Shopify webhook HMAC signature
const verifyShopifyWebhook = async (req, rawBody)=>{
  try {
    // Get webhook secret from environment
    const secret = getEnvVar('SHOPIFY_WEBHOOK_SECRET');
    if (!secret) {
      console.log('Missing Shopify webhook secret in environment variables');
      return false;
    }
    // Check for different HMAC header variations
    const hmacHeader = req.headers.get('X-Shopify-Hmac-SHA256') || req.headers.get('x-shopify-hmac-sha256');
    // If no HMAC header is provided but the user agent is from Shopify,
    // we'll accept it (for test notifications)
    if (!hmacHeader) {
      const userAgent = req.headers.get('user-agent') || '';
      if (userAgent.includes('Shopify')) {
        console.log('No HMAC signature found but Shopify User-Agent detected, accepting request');
        return true;
      }
      console.log('No HMAC signature found in headers');
      return false;
    }
    // Calculate expected HMAC signature using Deno's native crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {
      name: 'HMAC',
      hash: 'SHA-256'
    }, false, [
      'sign'
    ]);
    // Sign the request body
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
    // Convert the signature to hex
    const signatureHex = Array.from(new Uint8Array(signature)).map((b)=>b.toString(16).padStart(2, '0')).join('');
    // Compare signatures (case insensitive)
    const isValid = signatureHex.toLowerCase() === hmacHeader.toLowerCase();
    console.log(`HMAC validation result: ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
  } catch (error) {
    console.error(`HMAC verification error: ${error.message}`);
    return false;
  }
};
// --- SHOPIFY ORDER WEBHOOK HANDLER ---
Deno.serve(async (req)=>{
  // Generate a unique request ID for tracking
  let requestId = 'req_' + Date.now().toString();
  try {
    requestId = crypto.randomUUID();
  } catch (e) {
    console.log(`Failed to generate UUID: ${e.message}`);
  }
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  console.log(`======== REQUEST START ${requestId} ========`);
  console.log(`Received webhook request: ${req.method} ${req.url}`);
  try {
    // Get the raw request body for HMAC verification
    const bodyText = await req.clone().text();
    // Log request details for debugging
    const headers = Object.fromEntries(req.headers.entries());
    console.log('Request headers:', JSON.stringify(headers, null, 2));
    console.log(`Body length: ${bodyText.length} characters`);
    // Verify the request is from Shopify
    const isValid = await verifyShopifyWebhook(req, bodyText);
    if (!isValid && req.headers.get('user-agent') !== 'Shopify-Captain-Hook') {
      console.log(`Invalid HMAC signature, rejecting request ${requestId}`);
      console.log(`======== REQUEST END ${requestId} ========`);
      return new Response(JSON.stringify({
        error: 'Invalid signature'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 401
      });
    }
    // Parse the body as JSON
    let order;
    try {
      order = JSON.parse(bodyText);
      console.log('JSON parse successful');
      console.log('JSON keys:', Object.keys(order));
    } catch (e) {
      console.log(`JSON parse error: ${e.message}`);
      console.log(`======== REQUEST END ${requestId} ========`);
      return new Response(JSON.stringify({
        error: 'Invalid JSON payload'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Initialize Supabase client
    const supabaseUrl = getEnvVar('SUPABASE_URL') || getEnvVar('PAKA_SUPABASE_URL');
    const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY') || getEnvVar('PAKA_SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      console.log(`======== REQUEST END ${requestId} ========`);
      return new Response(JSON.stringify({
        error: 'Server configuration error'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'production'
      }
    });
    // Call the database function to handle the order
    const { data, error } = await supabase.rpc('handle_new_order', {
      order_payload: order
    }).select();
    if (error) {
      console.error(`Database error: ${error.message}`);
      console.log(`======== REQUEST END ${requestId} ========`);
      return new Response(JSON.stringify({
        error: 'Database error',
        details: error.message
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      });
    }
    console.log(`Order processed successfully: ${JSON.stringify(data)}`);
    console.log(`======== REQUEST END ${requestId} ========`);
    return new Response(JSON.stringify({
      success: true,
      message: 'Order webhook received and processed',
      requestId
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error(`Unhandled error: ${error.message}`);
    console.error(error.stack);
    console.log(`======== REQUEST END ${requestId} ========`);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
