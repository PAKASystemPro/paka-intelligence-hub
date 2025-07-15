// supabase/functions/enrich-product-group/index.ts
// FINAL CORRECTED VERSION

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const ENRICHMENT_SQL = `
  WITH ranked_orders AS (
    SELECT
      o.customer_id,
      o.id as order_id,
      ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.ordered_at ASC, o.created_at ASC) as order_rank
    FROM
      production.orders o
    WHERE
      o.customer_id IS NOT NULL
  ),
  first_order_products AS (
    SELECT
      ro.customer_id,
      p.product_group,
      CASE
        WHEN p.product_group = '深睡寶寶' THEN 1
        WHEN p.product_group = '天皇丸' THEN 2
        WHEN p.product_group = '皇后丸' THEN 3
        ELSE 4
      END as priority_rank
    FROM ranked_orders ro
    JOIN production.order_line_items oli ON ro.order_id = oli.order_id
    JOIN production.products p ON oli.product_id = p.id
    WHERE ro.order_rank = 1
  ),
  customer_top_priority AS (
    SELECT DISTINCT ON (customer_id)
      customer_id,
      product_group
    FROM first_order_products
    ORDER BY customer_id, priority_rank ASC
  )
  UPDATE production.customers c
  SET initial_product_group = ctp.product_group
  FROM customer_top_priority ctp
  WHERE c.id = ctp.customer_id;
`;

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    );

    console.log("Starting initial_product_group enrichment...");
    
    // This is the corrected line, using the RPC call
    const { error } = await supabase.rpc('execute_sql', { 
      sql_statement: ENRICHMENT_SQL 
    });

    if (error) {
      throw error;
    }

    const successMessage = "✅ Initial product group enrichment completed successfully.";
    console.log(successMessage);

    return new Response(JSON.stringify({ message: successMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error during enrichment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
