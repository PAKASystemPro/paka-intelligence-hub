// supabase/functions/enrich-data/index.ts
// FINAL, VERIFIED SCRIPT: Uses correct, efficient SQL for enrichment.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// These are the correct, efficient SQL commands we built.
const UPDATE_CUSTOMER_AGGREGATES_SQL = `
  UPDATE production.customers c
  SET orders_count = subquery.order_count, total_spent = subquery.total_spent
  FROM (
    SELECT o.customer_id, COUNT(o.id) as order_count, SUM(o.total_price) as total_spent
    FROM production.orders o WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id
  ) AS subquery
  WHERE c.id = subquery.customer_id;
`;

const UPDATE_COHORT_MONTH_SQL = `
  UPDATE production.customers c
  SET first_order_at = subquery.first_order_timestamp, cohort_month = DATE_TRUNC('month', subquery.first_order_timestamp)
  FROM (
    SELECT o.customer_id, MIN(o.ordered_at) as first_order_timestamp
    FROM production.orders o WHERE o.customer_id IS NOT NULL GROUP BY o.customer_id
  ) AS subquery
  WHERE c.id = subquery.customer_id;
`;

const CATEGORIZE_PRODUCTS_SQL = `
  UPDATE production.products
  SET product_group = CASE
    WHEN title LIKE '%深睡寶寶%' THEN '深睡寶寶'
    WHEN title LIKE '%天皇丸%' THEN '天皇丸'
    WHEN title LIKE '%皇后丸%' THEN '皇后丸'
    ELSE 'Others'
  END;
`;

const UPDATE_INITIAL_PRODUCT_GROUP_SQL = `
  WITH ranked_orders AS (
    SELECT o.customer_id, o.id as order_id, ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.ordered_at ASC, o.created_at ASC) as order_rank
    FROM production.orders o WHERE o.customer_id IS NOT NULL
  ), first_order_products AS (
    SELECT ro.customer_id, p.product_group, CASE WHEN p.product_group = '深睡寶寶' THEN 1 WHEN p.product_group = '天皇丸' THEN 2 WHEN p.product_group = '皇后丸' THEN 3 ELSE 4 END as priority_rank
    FROM ranked_orders ro
    JOIN production.order_line_items oli ON ro.order_id = oli.order_id
    JOIN production.products p ON oli.product_id = p.id
    WHERE ro.order_rank = 1
  ), customer_top_priority AS (
    SELECT DISTINCT ON (customer_id) customer_id, product_group
    FROM first_order_products ORDER BY customer_id, priority_rank ASC
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

    const enrichmentTask = async () => {
      console.log('Starting data enrichment background task...');
      try {
        console.log('Step 1: Updating customer aggregates (count and spend)...');
        await supabase.rpc('execute_sql', { sql_statement: UPDATE_CUSTOMER_AGGREGATES_SQL });
        console.log('✅ Step 1 complete.');
        
        console.log('Step 2: Updating cohort month...');
        await supabase.rpc('execute_sql', { sql_statement: UPDATE_COHORT_MONTH_SQL });
        console.log('✅ Step 2 complete.');
        
        console.log('Step 3: Categorizing products...');
        await supabase.rpc('execute_sql', { sql_statement: CATEGORIZE_PRODUCTS_SQL });
        console.log('✅ Step 3 complete.');
        
        console.log('Step 4: Setting initial product group...');
        await supabase.rpc('execute_sql', { sql_statement: UPDATE_INITIAL_PRODUCT_GROUP_SQL });
        console.log('✅ Step 4 complete.');
        
        console.log('🎉 Data enrichment completed successfully!');
      } catch (error) {
        console.error('Error during data enrichment background task:', error);
      }
    };

    // EdgeRuntime is only available in the Supabase Edge environment
    // @ts-ignore
    EdgeRuntime.waitUntil(enrichmentTask());

    return new Response(JSON.stringify({ message: "Data enrichment process started in the background." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 202, // 202 Accepted
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
