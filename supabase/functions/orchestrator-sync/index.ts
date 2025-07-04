// Follow this setup guide to integrate the Deno runtime into your application:
// https://docs.supabase.com/guides/functions/deno-runtime

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve((req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {


    console.log("Asynchronously invoking delta-sync function...");

    // Invoke the delta-sync function asynchronously using a direct fetch call.
    // This is a more robust method than using the invoke() helper.
    // We do not await the response, achieving a "fire-and-forget" invocation.
    const deltaSyncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/delta-sync`;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    fetch(deltaSyncUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    }).catch(e => {
        // Log any error from the fetch call itself, but don't block the orchestrator's response.
        console.error("Error during fire-and-forget invocation of delta-sync:", e);
    });

    const successMessage = 'Successfully invoked delta-sync. The sync is now running in the background.';
    console.log(successMessage);

    // Return an immediate success response
    return new Response(
      JSON.stringify({
        success: true,
        message: successMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 202, // Use 202 Accepted to indicate the request was accepted but is processing asynchronously.
      }
    );
  } catch (e) {
    const error = e as Error;
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
