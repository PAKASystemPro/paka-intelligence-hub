// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/deno-runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Starting orchestrator sync process...");

    // Step 1: Call the delta-sync function to get the latest data
    console.log("Calling Shopify delta sync...");
    
    const shopifySyncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/delta-sync`;
    const shopifySyncResponse = await fetch(shopifySyncUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    });
    
    if (!shopifySyncResponse.ok) {
      const errorText = await shopifySyncResponse.text();
      throw new Error(`Shopify sync failed: ${errorText}`);
    }
    
    const shopifySyncResult = await shopifySyncResponse.json();
    console.log("Shopify sync result:", shopifySyncResult);
    
    // Step 2: Classify new customers
    console.log("Classifying new customers...");
    const { data: classifyResult, error: classifyError } = await supabaseClient.rpc(
      'classify_new_customers'
    );
    
    if (classifyError) {
      throw new Error(`Error classifying customers: ${classifyError.message}`);
    }
    
    console.log(`Classified ${classifyResult} new customers`);
    
    // Step 3: Refresh materialized views
    console.log("Refreshing materialized views...");
    const { data: refreshResult, error: refreshError } = await supabaseClient.rpc(
      'refresh_all_materialized_views'
    );
    
    if (refreshError) {
      throw new Error(`Error refreshing views: ${refreshError.message}`);
    }
    
    console.log(`Refreshed ${refreshResult} materialized views`);
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Orchestrator sync completed successfully",
        shopifySyncResult,
        classifiedCustomers: classifyResult,
        refreshedViews: refreshResult
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in orchestrator sync:", error);
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
