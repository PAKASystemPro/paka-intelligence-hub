// Script to create materialized views directly
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Creating materialized views...');
    
    // Create cohort_sizes view
    console.log('Creating cohort_sizes view...');
    const { error: sizesError } = await supabase.rest.sql(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS production.cohort_sizes AS
      SELECT
          TO_CHAR(DATE_TRUNC('month', MIN(o.processed_at)), 'YYYY-MM') AS cohort_month,
          c.primary_product_cohort,
          COUNT(DISTINCT c.id) AS new_customers
      FROM
          production.customers c
      JOIN
          production.orders o ON c.id = o.customer_id
      WHERE
          c.primary_product_cohort IS NOT NULL
      GROUP BY
          TO_CHAR(DATE_TRUNC('month', MIN(o.processed_at)), 'YYYY-MM'),
          c.primary_product_cohort;
    `);
    
    if (sizesError) {
      console.error('Error creating cohort_sizes view:', sizesError);
    } else {
      console.log('cohort_sizes view created successfully');
    }
    
    // Create cohort_second_orders view
    console.log('Creating cohort_second_orders view...');
    const { error: secondOrdersError } = await supabase.rest.sql(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS production.cohort_second_orders AS
      WITH first_orders AS (
          SELECT
              c.id AS customer_id,
              c.primary_product_cohort,
              MIN(o.processed_at) AS first_order_date,
              TO_CHAR(DATE_TRUNC('month', MIN(o.processed_at)), 'YYYY-MM') AS cohort_month
          FROM
              production.customers c
          JOIN
              production.orders o ON c.id = o.customer_id
          GROUP BY
              c.id,
              c.primary_product_cohort
      ),
      second_orders AS (
          SELECT
              fo.customer_id,
              fo.primary_product_cohort,
              fo.cohort_month,
              MIN(o.processed_at) AS second_order_date
          FROM
              first_orders fo
          JOIN
              production.orders o ON fo.customer_id = o.customer_id
          WHERE
              o.processed_at > fo.first_order_date
          GROUP BY
              fo.customer_id,
              fo.primary_product_cohort,
              fo.cohort_month
      )
      SELECT
          fo.cohort_month,
          fo.primary_product_cohort,
          EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                               DATE_TRUNC('month', fo.first_order_date))) AS months_since_first,
          COUNT(DISTINCT so.customer_id) AS second_order_customers
      FROM
          first_orders fo
      JOIN
          second_orders so ON fo.customer_id = so.customer_id
      GROUP BY
          fo.cohort_month,
          fo.primary_product_cohort,
          EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                               DATE_TRUNC('month', fo.first_order_date)));
    `);
    
    if (secondOrdersError) {
      console.error('Error creating cohort_second_orders view:', secondOrdersError);
    } else {
      console.log('cohort_second_orders view created successfully');
    }
    
    // Create cohort_heatmap view
    console.log('Creating cohort_heatmap view...');
    const { error: heatmapError } = await supabase.rest.sql(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS production.cohort_heatmap AS
      WITH cohort_data AS (
          SELECT
              cs.cohort_month,
              cs.primary_product_cohort,
              cs.new_customers,
              COALESCE(SUM(so.second_order_customers), 0) AS total_second_orders
          FROM
              production.cohort_sizes cs
          LEFT JOIN
              production.cohort_second_orders so ON cs.cohort_month = so.cohort_month 
                                               AND cs.primary_product_cohort = so.primary_product_cohort
          GROUP BY
              cs.cohort_month,
              cs.primary_product_cohort,
              cs.new_customers
      ),
      monthly_breakdown AS (
          SELECT
              cs.cohort_month,
              cs.primary_product_cohort,
              so.months_since_first,
              COALESCE(so.second_order_customers, 0) AS second_order_customers
          FROM
              production.cohort_sizes cs
          LEFT JOIN
              production.cohort_second_orders so ON cs.cohort_month = so.cohort_month 
                                               AND cs.primary_product_cohort = so.primary_product_cohort
      )
      SELECT
          cd.cohort_month,
          cd.primary_product_cohort,
          cd.new_customers,
          cd.total_second_orders,
          ROUND((cd.total_second_orders::NUMERIC / NULLIF(cd.new_customers, 0)) * 100, 1) AS retention_percentage,
          JSONB_OBJECT_AGG(
              COALESCE('m' || mb.months_since_first::TEXT, 'unknown'),
              JSONB_BUILD_OBJECT(
                  'count', COALESCE(mb.second_order_customers, 0),
                  'percentage', ROUND((COALESCE(mb.second_order_customers, 0)::NUMERIC / NULLIF(cd.new_customers, 0)) * 100, 1)
              )
          ) AS monthly_data
      FROM
          cohort_data cd
      LEFT JOIN
          monthly_breakdown mb ON cd.cohort_month = mb.cohort_month 
                              AND cd.primary_product_cohort = mb.primary_product_cohort
      GROUP BY
          cd.cohort_month,
          cd.primary_product_cohort,
          cd.new_customers,
          cd.total_second_orders,
          cd.retention_percentage;
    `);
    
    if (heatmapError) {
      console.error('Error creating cohort_heatmap view:', heatmapError);
    } else {
      console.log('cohort_heatmap view created successfully');
    }
    
    // Create refresh function
    console.log('Creating refresh_all_materialized_views function...');
    const { error: refreshFuncError } = await supabase.rest.sql(`
      CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views()
      RETURNS INTEGER AS $$
      DECLARE
          view_count INTEGER := 0;
      BEGIN
          REFRESH MATERIALIZED VIEW production.cohort_sizes;
          view_count := view_count + 1;
          
          REFRESH MATERIALIZED VIEW production.cohort_second_orders;
          view_count := view_count + 1;
          
          REFRESH MATERIALIZED VIEW production.cohort_heatmap;
          view_count := view_count + 1;
          
          RETURN view_count;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    if (refreshFuncError) {
      console.error('Error creating refresh function:', refreshFuncError);
    } else {
      console.log('refresh_all_materialized_views function created successfully');
    }
    
    console.log('All database objects created');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the main function
main();
