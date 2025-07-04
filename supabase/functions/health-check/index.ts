// supabase/functions/health-check/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        db: { schema: 'production' },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    const { count: customerCount, error: customerError } = await supabaseClient
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (customerError) throw customerError;

    const { count: orderCount, error: orderError } = await supabaseClient
      .from('orders')
      .select('*', { count: 'exact', head: true });

    if (orderError) throw orderError;

    const { count: lineItemCount, error: lineItemError } = await supabaseClient
      .from('order_line_items')
      .select('*', { count: 'exact', head: true });

    if (lineItemError) throw lineItemError;

    const healthData = {
      success: true,
      data: {
        customer_count: customerCount,
        order_count: orderCount,
        line_item_count: lineItemCount,
      },
    };

    return new Response(JSON.stringify(healthData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
