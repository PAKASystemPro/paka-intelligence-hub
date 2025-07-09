

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "production";


ALTER SCHEMA "production" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."order_line_item_type" AS (
	"id" "text",
	"order_id" "text",
	"shopify_order_id" "text",
	"product_id" "text",
	"variant_id" "text",
	"title" "text",
	"quantity" integer,
	"price" numeric,
	"sku" "text",
	"product_type" "text",
	"vendor" "text",
	"fulfillment_status" "text",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone
);


ALTER TYPE "public"."order_line_item_type" OWNER TO "postgres";


CREATE TYPE "public"."order_type" AS (
	"id" "text",
	"shopify_order_id" "text",
	"customer_id" "text",
	"shopify_customer_id" "text",
	"name" "text",
	"total_price" numeric,
	"processed_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"currency_code" "text",
	"email" "text",
	"fulfillment_status" "text",
	"financial_status" "text",
	"sales_channel" "text",
	"tags" "text"[]
);


ALTER TYPE "public"."order_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."check_schema_exists"("schema_name" "text") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = $1);
END;
$_$;


ALTER FUNCTION "production"."check_schema_exists"("schema_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."classify_new_customers"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE updated_count INTEGER;
BEGIN
    UPDATE production.customers c
    SET primary_product_cohort = subquery.product_title
    FROM (
        SELECT c.id AS customer_id,
            CASE
                WHEN EXISTS (SELECT 1 FROM production.orders o JOIN production.order_line_items li ON o.id = li.order_id WHERE o.customer_id = c.id AND li.title LIKE '%深睡寶寶%' ORDER BY o.processed_at ASC LIMIT 1) THEN '深睡寶寶'
                WHEN EXISTS (SELECT 1 FROM production.orders o JOIN production.order_line_items li ON o.id = li.order_id WHERE o.customer_id = c.id AND li.title LIKE '%天皇丸%' ORDER BY o.processed_at ASC LIMIT 1) THEN '天皇丸'
                WHEN EXISTS (SELECT 1 FROM production.orders o JOIN production.order_line_items li ON o.id = li.order_id WHERE o.customer_id = c.id AND li.title LIKE '%皇后丸%' ORDER BY o.processed_at ASC LIMIT 1) THEN '皇后丸'
                ELSE 'Others'
            END AS product_title
        FROM production.customers c
        WHERE c.primary_product_cohort IS NULL AND EXISTS (SELECT 1 FROM production.orders o WHERE o.customer_id = c.id)
    ) AS subquery
    WHERE c.id = subquery.customer_id;
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;


ALTER FUNCTION "production"."classify_new_customers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."get_cohort_opportunity_customers"("p_cohort_month" "text", "p_product_filter" "text" DEFAULT 'ALL'::"text") RETURNS TABLE("customer_id" bigint, "email" "text", "first_name" "text", "last_name" "text", "first_order_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at AS first_order_at
    FROM
        production.customers c
    JOIN (
        -- Find the first order for each customer to confirm their cohort entry
        SELECT
            customer_id,
            MIN(processed_at) as processed_at
        FROM
            production.orders
        GROUP BY
            customer_id
    ) o ON c.id = o.customer_id
    WHERE
        c.orders_count = 1
        AND TO_CHAR(c.created_at, 'YYYY-MM') = p_cohort_month
        AND (p_product_filter = 'ALL' OR c.primary_product_cohort = p_product_filter);
END;
$$;


ALTER FUNCTION "production"."get_cohort_opportunity_customers"("p_cohort_month" "text", "p_product_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) RETURNS TABLE("o_shopify_id" "text", "o_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT c.shopify_customer_id, c.id::uuid
  FROM production.customers c
  WHERE c.shopify_customer_id = ANY(p_shopify_ids);
END;
$$;


ALTER FUNCTION "production"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."get_distinct_product_cohorts"() RETURNS TABLE("cohort" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT primary_product_cohort
    FROM production.customers
    WHERE primary_product_cohort IS NOT NULL;
END; $$;


ALTER FUNCTION "production"."get_distinct_product_cohorts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."get_order_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) RETURNS TABLE("o_shopify_id" "text", "o_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.shopify_order_id::TEXT,
    o.id::UUID
  FROM
    production.orders o
  WHERE
    o.shopify_order_id = ANY(p_shopify_ids);
END;
$$;


ALTER FUNCTION "production"."get_order_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "production"."upsert_shopify_data_batch"("orders_data" "jsonb", "line_items_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    CREATE TEMP TABLE temp_order_ids AS SELECT (o->>'id')::UUID AS id FROM jsonb_array_elements(orders_data) AS o;
    DELETE FROM production.order_line_items oli WHERE oli.order_id IN (SELECT id FROM temp_order_ids);
    INSERT INTO production.orders (id, shopify_order_id, customer_id, shopify_customer_id, order_number, total_price, processed_at, updated_at, created_at, cancelled_at, currency_code, email, fulfillment_status, financial_status, sales_channel, tags)
    SELECT (o->>'id')::UUID, o->>'shopify_order_id', (o->>'customer_id')::UUID, o->>'shopify_customer_id', o->>'order_number', (o->>'total_price')::NUMERIC, (o->>'processed_at')::TIMESTAMPTZ, (o->>'updated_at')::TIMESTAMPTZ, (o->>'created_at')::TIMESTAMPTZ, (o->>'cancelled_at')::TIMESTAMPTZ, o->>'currency_code', o->>'email', o->>'fulfillment_status', o->>'financial_status', o->>'sales_channel', COALESCE((SELECT jsonb_agg(e) FROM jsonb_array_elements_text(o->'tags') e), '[]'::jsonb)::text[]
    FROM jsonb_array_elements(orders_data) AS o
    ON CONFLICT (id) DO UPDATE SET customer_id = EXCLUDED.customer_id, total_price = EXCLUDED.total_price, processed_at = EXCLUDED.processed_at, updated_at = EXCLUDED.updated_at, cancelled_at = EXCLUDED.cancelled_at, fulfillment_status = EXCLUDED.fulfillment_status, financial_status = EXCLUDED.financial_status, tags = EXCLUDED.tags;
    INSERT INTO production.order_line_items (id, order_id, shopify_order_id, product_id, variant_id, title, quantity, price, sku, product_type, vendor, fulfillment_status, updated_at, created_at)
    SELECT (li->>'id')::UUID, (li->>'order_id')::UUID, li->>'shopify_order_id', li->>'product_id', li->>'variant_id', li->>'title', (li->>'quantity')::INTEGER, (li->>'price')::NUMERIC, li->>'sku', li->>'product_type', li->>'vendor', li->>'fulfillment_status', (li->>'updated_at')::TIMESTAMPTZ, (li->>'created_at')::TIMESTAMPTZ
    FROM jsonb_array_elements(line_items_data) AS li;
    DROP TABLE temp_order_ids;
END;
$$;


ALTER FUNCTION "production"."upsert_shopify_data_batch"("orders_data" "jsonb", "line_items_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_analysis_data"("p_nth_order" integer, "p_product_filter" "text") RETURNS TABLE("cohort_month" "text", "new_customers" bigint, "total_nth_orders" bigint, "m0" bigint, "m1" bigint, "m2" bigint, "m3" bigint, "m4" bigint, "m5" bigint, "m6" bigint, "m7" bigint, "m8" bigint, "m9" bigint, "m10" bigint, "m11" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH ranked_orders AS (
        SELECT
            o.customer_id,
            o.processed_at as created_at,
            oli.product_type,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as rn
        FROM
            production.orders o
        JOIN
            production.order_line_items oli ON o.id = oli.order_id
        WHERE
            (p_product_filter = 'ALL' OR oli.product_type = p_product_filter)
    ),
    first_orders AS (
        SELECT
            customer_id,
            created_at AS first_order_at
        FROM
            ranked_orders
        WHERE
            rn = 1
    ),
    nth_orders AS (
        SELECT
            customer_id,
            created_at AS nth_order_at
        FROM
            ranked_orders
        WHERE
            rn = p_nth_order
    ),
    prev_orders AS (
        -- Get the (N-1)th order date for each customer
        SELECT
            customer_id,
            created_at AS prev_order_at
        FROM
            ranked_orders
        WHERE
            rn = p_nth_order - 1
    ),
    -- Use customer creation date for cohort assignment
    cohorts AS (
        SELECT
            TO_CHAR(c.created_at, 'YYYY-MM') AS cohort_month,
            f.customer_id
        FROM
            first_orders f
        JOIN
            production.customers c ON f.customer_id = c.id
    ),
    cohort_sizes AS (
        SELECT
            c.cohort_month,
            COUNT(DISTINCT c.customer_id) AS new_customers
        FROM
            cohorts c
        GROUP BY
            c.cohort_month
    ),
    cohort_nth_orders AS (
        SELECT
            c.cohort_month,
            n.customer_id,
            -- Calculate month difference based on nth order
            -- For first order, compare to first order date
            -- For higher orders, compare to previous order date
            CASE WHEN p_nth_order = 1 THEN
                DATE_PART('year', n.nth_order_at) * 12 + DATE_PART('month', n.nth_order_at) - 
                (DATE_PART('year', f.first_order_at) * 12 + DATE_PART('month', f.first_order_at))
            ELSE
                DATE_PART('year', n.nth_order_at) * 12 + DATE_PART('month', n.nth_order_at) - 
                (DATE_PART('year', p.prev_order_at) * 12 + DATE_PART('month', p.prev_order_at))
            END AS month_number
        FROM
            nth_orders n
        JOIN
            first_orders f ON n.customer_id = f.customer_id
        LEFT JOIN
            prev_orders p ON n.customer_id = p.customer_id
        JOIN
            cohorts c ON n.customer_id = c.customer_id
    )
    SELECT
        cs.cohort_month,
        cs.new_customers,
        COUNT(cno.customer_id) AS total_nth_orders,
        COUNT(CASE WHEN cno.month_number = 0 THEN cno.customer_id END) AS m0,
        COUNT(CASE WHEN cno.month_number = 1 THEN cno.customer_id END) AS m1,
        COUNT(CASE WHEN cno.month_number = 2 THEN cno.customer_id END) AS m2,
        COUNT(CASE WHEN cno.month_number = 3 THEN cno.customer_id END) AS m3,
        COUNT(CASE WHEN cno.month_number = 4 THEN cno.customer_id END) AS m4,
        COUNT(CASE WHEN cno.month_number = 5 THEN cno.customer_id END) AS m5,
        COUNT(CASE WHEN cno.month_number = 6 THEN cno.customer_id END) AS m6,
        COUNT(CASE WHEN cno.month_number = 7 THEN cno.customer_id END) AS m7,
        COUNT(CASE WHEN cno.month_number = 8 THEN cno.customer_id END) AS m8,
        COUNT(CASE WHEN cno.month_number = 9 THEN cno.customer_id END) AS m9,
        COUNT(CASE WHEN cno.month_number = 10 THEN cno.customer_id END) AS m10,
        COUNT(CASE WHEN cno.month_number = 11 THEN cno.customer_id END) AS m11
    FROM
        cohort_sizes cs
    LEFT JOIN
        cohort_nth_orders cno ON cs.cohort_month = cno.cohort_month
    GROUP BY
        cs.cohort_month, cs.new_customers
    ORDER BY
        cs.cohort_month;
END;
$$;


ALTER FUNCTION "public"."get_cohort_analysis_data"("p_nth_order" integer, "p_product_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_heatmap"() RETURNS TABLE("cohort_month" "text", "cohort_size" integer, "month_number" integer, "second_orders" integer, "retention_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH cohort_sizes AS (
    SELECT 
      ca.cohort_month,
      COUNT(DISTINCT ca.customer_id)::INTEGER AS cohort_size
    FROM 
      production.cohort_analysis ca
    WHERE 
      ca.order_number = 1
    GROUP BY 
      ca.cohort_month
  ),
  second_orders_by_month AS (
    SELECT 
      ca.cohort_month,
      ca.months_since_first,
      COUNT(DISTINCT ca.customer_id)::INTEGER AS second_orders
    FROM 
      production.cohort_analysis ca
    WHERE 
      ca.order_number = 2
    GROUP BY 
      ca.cohort_month, ca.months_since_first
  )
  SELECT 
    cs.cohort_month,
    cs.cohort_size,
    so.months_since_first::INTEGER AS month_number,
    so.second_orders,
    ROUND((so.second_orders::NUMERIC / cs.cohort_size) * 100, 1) AS retention_rate
  FROM 
    cohort_sizes cs
    LEFT JOIN second_orders_by_month so ON cs.cohort_month = so.cohort_month
  ORDER BY 
    cs.cohort_month, so.months_since_first;
END;
$$;


ALTER FUNCTION "public"."get_cohort_heatmap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_heatmap_by_product"("p_product_cohort" "text") RETURNS TABLE("cohort_month" "text", "cohort_size" integer, "month_number" integer, "second_orders" integer, "retention_rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH cohort_sizes AS (
    SELECT 
      ca.cohort_month,
      COUNT(DISTINCT ca.customer_id)::INTEGER AS cohort_size
    FROM 
      production.cohort_analysis ca
    WHERE 
      ca.order_number = 1
      AND ca.primary_product_cohort = p_product_cohort
    GROUP BY 
      ca.cohort_month
  ),
  second_orders_by_month AS (
    SELECT 
      ca.cohort_month,
      ca.months_since_first,
      COUNT(DISTINCT ca.customer_id)::INTEGER AS second_orders
    FROM 
      production.cohort_analysis ca
    WHERE 
      ca.order_number = 2
      AND ca.primary_product_cohort = p_product_cohort
    GROUP BY 
      ca.cohort_month, ca.months_since_first
  )
  SELECT 
    cs.cohort_month,
    cs.cohort_size,
    so.months_since_first::INTEGER AS month_number,
    so.second_orders,
    ROUND((so.second_orders::NUMERIC / cs.cohort_size) * 100, 1) AS retention_rate
  FROM 
    cohort_sizes cs
    LEFT JOIN second_orders_by_month so ON cs.cohort_month = so.cohort_month
  ORDER BY 
    cs.cohort_month, so.months_since_first;
END;
$$;


ALTER FUNCTION "public"."get_cohort_heatmap_by_product"("p_product_cohort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_sizes"() RETURNS TABLE("cohort_month" "text", "primary_product_cohort" "text", "new_customers" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM production.cohort_sizes LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_cohort_sizes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_verification_stats"("start_date_param" "text", "end_date_param" "text") RETURNS TABLE("metric" "text", "value" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH customer_order_ranks AS (
    SELECT
      customer_id,
      processed_at,
      ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY processed_at ASC) as order_rank
    FROM
      production.orders
    WHERE customer_id IS NOT NULL
  )
  SELECT
    'new_customers' AS metric,
    COUNT(DISTINCT customer_id) AS value
  FROM
    customer_order_ranks
  WHERE
    order_rank = 1
    AND processed_at >= start_date_param::TIMESTAMPTZ
    AND processed_at <= end_date_param::TIMESTAMPTZ

  UNION ALL

  SELECT
    'second_order_customers' AS metric,
    COUNT(DISTINCT customer_id) AS value
  FROM
    customer_order_ranks
  WHERE
    order_rank = 2
    AND processed_at >= start_date_param::TIMESTAMPTZ
    AND processed_at <= end_date_param::TIMESTAMPTZ;

END;
$$;


ALTER FUNCTION "public"."get_cohort_verification_stats"("start_date_param" "text", "end_date_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) RETURNS TABLE("o_shopify_id" "text", "o_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.shopify_customer_id::TEXT as o_shopify_id, 
        c.id::UUID as o_id
    FROM production.customers c
    WHERE c.shopify_customer_id = ANY(p_shopify_ids);
END;
$$;


ALTER FUNCTION "public"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_multi_order_cohort_customers"("cohort_month" "text", "month_index" integer, "product_type" "text" DEFAULT 'All'::"text", "order_number" integer DEFAULT 3) RETURNS TABLE("customer_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "first_order_date" timestamp without time zone, "nth_order_date" timestamp without time zone, "months_between" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF product_type = 'All' THEN
    RETURN QUERY
    WITH order_sequence AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
    ),
    first_orders AS (
      SELECT
        customer_id,
        email,
        first_name,
        last_name,
        processed_at AS first_order_date,
        TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month
      FROM
        order_sequence
      WHERE
        order_num = 1
        AND TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') = cohort_month
    ),
    previous_orders AS (
      SELECT
        customer_id,
        processed_at AS prev_order_date
      FROM
        order_sequence
      WHERE
        order_num = order_number - 1
    ),
    nth_orders AS (
      SELECT
        os.customer_id,
        os.processed_at AS nth_order_date,
        po.prev_order_date,
        EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                            DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
      FROM
        order_sequence os
      JOIN
        previous_orders po ON os.customer_id = po.customer_id
      WHERE
        os.order_num = order_number
        AND os.processed_at > po.prev_order_date
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      no.nth_order_date,
      no.months_since_prev::integer AS months_between
    FROM
      first_orders fo
    JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    WHERE
      no.months_since_prev = month_index;
  ELSE
    RETURN QUERY
    WITH order_sequence AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        o.processed_at,
        ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        c.primary_product_cohort = product_type
    ),
    first_orders AS (
      SELECT
        customer_id,
        email,
        first_name,
        last_name,
        processed_at AS first_order_date,
        TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month
      FROM
        order_sequence
      WHERE
        order_num = 1
        AND TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') = cohort_month
    ),
    previous_orders AS (
      SELECT
        customer_id,
        processed_at AS prev_order_date
      FROM
        order_sequence
      WHERE
        order_num = order_number - 1
    ),
    nth_orders AS (
      SELECT
        os.customer_id,
        os.processed_at AS nth_order_date,
        po.prev_order_date,
        EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                            DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
      FROM
        order_sequence os
      JOIN
        previous_orders po ON os.customer_id = po.customer_id
      WHERE
        os.order_num = order_number
        AND os.processed_at > po.prev_order_date
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      no.nth_order_date,
      no.months_since_prev::integer AS months_between
    FROM
      first_orders fo
    JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    WHERE
      no.months_since_prev = month_index;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_multi_order_cohort_customers"("cohort_month" "text", "month_index" integer, "product_type" "text", "order_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_multi_order_cohort_heatmap"("order_number" integer DEFAULT 3) RETURNS TABLE("cohort_month" "text", "previous_order_customers" bigint, "nth_orders" bigint, "m0" bigint, "m1" bigint, "m2" bigint, "m3" bigint, "m4" bigint, "m5" bigint, "m6" bigint, "m7" bigint, "m8" bigint, "m9" bigint, "m10" bigint, "m11" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH cohort_months AS (
    SELECT DISTINCT
      TO_CHAR(DATE_TRUNC('month', o.processed_at), 'YYYY-MM') AS cohort_month
    FROM
      production.orders o
    ORDER BY
      cohort_month
  ),
  order_sequence AS (
    SELECT
      c.id AS customer_id,
      o.processed_at,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
    FROM
      production.customers c
    JOIN
      production.orders o ON c.id = o.customer_id
  ),
  first_orders AS (
    SELECT
      customer_id,
      TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month,
      processed_at AS first_order_date
    FROM
      order_sequence
    WHERE
      order_num = 1
  ),
  previous_orders AS (
    SELECT
      customer_id,
      processed_at AS prev_order_date
    FROM
      order_sequence
    WHERE
      order_num = order_number - 1
  ),
  nth_orders AS (
    SELECT
      os.customer_id,
      fo.cohort_month,
      os.processed_at AS nth_order_date,
      po.prev_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                          DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
    FROM
      order_sequence os
    JOIN
      first_orders fo ON os.customer_id = fo.customer_id
    JOIN
      previous_orders po ON os.customer_id = po.customer_id
    WHERE
      os.order_num = order_number
      AND os.processed_at > po.prev_order_date
  ),
  cohort_data AS (
    SELECT
      cm.cohort_month,
      COUNT(DISTINCT po.customer_id) AS previous_order_customers,
      COUNT(DISTINCT no.customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 0 THEN no.customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 1 THEN no.customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 2 THEN no.customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 3 THEN no.customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 4 THEN no.customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 5 THEN no.customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 6 THEN no.customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 7 THEN no.customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 8 THEN no.customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 9 THEN no.customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 10 THEN no.customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 11 THEN no.customer_id END) AS m11
    FROM
      cohort_months cm
    LEFT JOIN
      first_orders fo ON cm.cohort_month = fo.cohort_month
    LEFT JOIN
      previous_orders po ON fo.customer_id = po.customer_id
    LEFT JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    GROUP BY
      cm.cohort_month
    ORDER BY
      cm.cohort_month
  )
  SELECT * FROM cohort_data;
END;
$$;


ALTER FUNCTION "public"."get_multi_order_cohort_heatmap"("order_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_multi_order_cohort_heatmap"("product_type" "text", "order_number" integer DEFAULT 3) RETURNS TABLE("cohort_month" "text", "previous_order_customers" bigint, "nth_orders" bigint, "m0" bigint, "m1" bigint, "m2" bigint, "m3" bigint, "m4" bigint, "m5" bigint, "m6" bigint, "m7" bigint, "m8" bigint, "m9" bigint, "m10" bigint, "m11" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH cohort_months AS (
    SELECT DISTINCT
      TO_CHAR(DATE_TRUNC('month', o.processed_at), 'YYYY-MM') AS cohort_month
    FROM
      production.orders o
    ORDER BY
      cohort_month
  ),
  order_sequence AS (
    SELECT
      c.id AS customer_id,
      o.processed_at,
      ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY o.processed_at) AS order_num
    FROM
      production.customers c
    JOIN
      production.orders o ON c.id = o.customer_id
    WHERE
      c.primary_product_cohort = product_type
  ),
  first_orders AS (
    SELECT
      customer_id,
      TO_CHAR(DATE_TRUNC('month', processed_at), 'YYYY-MM') AS cohort_month,
      processed_at AS first_order_date
    FROM
      order_sequence
    WHERE
      order_num = 1
  ),
  previous_orders AS (
    SELECT
      customer_id,
      processed_at AS prev_order_date
    FROM
      order_sequence
    WHERE
      order_num = order_number - 1
  ),
  nth_orders AS (
    SELECT
      os.customer_id,
      fo.cohort_month,
      os.processed_at AS nth_order_date,
      po.prev_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', os.processed_at), 
                          DATE_TRUNC('month', po.prev_order_date))) AS months_since_prev
    FROM
      order_sequence os
    JOIN
      first_orders fo ON os.customer_id = fo.customer_id
    JOIN
      previous_orders po ON os.customer_id = po.customer_id
    WHERE
      os.order_num = order_number
      AND os.processed_at > po.prev_order_date
  ),
  cohort_data AS (
    SELECT
      cm.cohort_month,
      COUNT(DISTINCT po.customer_id) AS previous_order_customers,
      COUNT(DISTINCT no.customer_id) AS nth_orders,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 0 THEN no.customer_id END) AS m0,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 1 THEN no.customer_id END) AS m1,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 2 THEN no.customer_id END) AS m2,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 3 THEN no.customer_id END) AS m3,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 4 THEN no.customer_id END) AS m4,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 5 THEN no.customer_id END) AS m5,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 6 THEN no.customer_id END) AS m6,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 7 THEN no.customer_id END) AS m7,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 8 THEN no.customer_id END) AS m8,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 9 THEN no.customer_id END) AS m9,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 10 THEN no.customer_id END) AS m10,
      COUNT(DISTINCT CASE WHEN no.months_since_prev = 11 THEN no.customer_id END) AS m11
    FROM
      cohort_months cm
    LEFT JOIN
      first_orders fo ON cm.cohort_month = fo.cohort_month
    LEFT JOIN
      previous_orders po ON fo.customer_id = po.customer_id
    LEFT JOIN
      nth_orders no ON fo.customer_id = no.customer_id
    GROUP BY
      cm.cohort_month
    ORDER BY
      cm.cohort_month
  )
  SELECT * FROM cohort_data;
END;
$$;


ALTER FUNCTION "public"."get_multi_order_cohort_heatmap"("product_type" "text", "order_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_order_uuids_by_shopify_gids"("p_shopify_ids" "text"[]) RETURNS TABLE("o_shopify_id" "text", "o_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.shopify_order_id::TEXT as o_shopify_id,
        o.id::UUID as o_id
    FROM production.orders o
    WHERE o.shopify_order_id = ANY(p_shopify_ids);
END;
$$;


ALTER FUNCTION "public"."get_order_uuids_by_shopify_gids"("p_shopify_ids" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_cohort_customers"("cohort_start_date" "text", "cohort_end_date" "text", "month_index" integer, "product_type" "text" DEFAULT NULL::"text", "order_number" integer DEFAULT 2) RETURNS TABLE("customer_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "first_order_date" timestamp without time zone, "second_order_date" timestamp without time zone, "months_between" integer)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF product_type IS NULL THEN
    RETURN QUERY
    WITH first_orders AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        MIN(o.processed_at) AS first_order_date
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        o.processed_at >= cohort_start_date::timestamp
        AND o.processed_at <= cohort_end_date::timestamp
      GROUP BY
        c.id, c.email, c.first_name, c.last_name
    ),
    second_orders AS (
      SELECT
        c.id AS customer_id,
        MIN(o2.processed_at) AS second_order_date
      FROM
        production.customers c
      JOIN
        production.orders o1 ON c.id = o1.customer_id
      JOIN
        production.orders o2 ON c.id = o2.customer_id
      WHERE
        o1.processed_at >= cohort_start_date::timestamp
        AND o1.processed_at <= cohort_end_date::timestamp
        AND o2.processed_at > o1.processed_at
      GROUP BY
        c.id
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      so.second_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer AS months_between
    FROM
      first_orders fo
    JOIN
      second_orders so ON fo.customer_id = so.customer_id
    WHERE
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer = month_index;
  ELSE
    RETURN QUERY
    WITH first_orders AS (
      SELECT
        c.id AS customer_id,
        c.email,
        c.first_name,
        c.last_name,
        MIN(o.processed_at) AS first_order_date
      FROM
        production.customers c
      JOIN
        production.orders o ON c.id = o.customer_id
      WHERE
        o.processed_at >= cohort_start_date::timestamp
        AND o.processed_at <= cohort_end_date::timestamp
        AND c.primary_product_cohort = product_type
      GROUP BY
        c.id, c.email, c.first_name, c.last_name
    ),
    second_orders AS (
      SELECT
        c.id AS customer_id,
        MIN(o2.processed_at) AS second_order_date
      FROM
        production.customers c
      JOIN
        production.orders o1 ON c.id = o1.customer_id
      JOIN
        production.orders o2 ON c.id = o2.customer_id
      WHERE
        o1.processed_at >= cohort_start_date::timestamp
        AND o1.processed_at <= cohort_end_date::timestamp
        AND o2.processed_at > o1.processed_at
        AND c.primary_product_cohort = product_type
      GROUP BY
        c.id
    )
    SELECT
      fo.customer_id,
      fo.email,
      fo.first_name,
      fo.last_name,
      fo.first_order_date,
      so.second_order_date,
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer AS months_between
    FROM
      first_orders fo
    JOIN
      second_orders so ON fo.customer_id = so.customer_id
    WHERE
      EXTRACT(MONTH FROM AGE(DATE_TRUNC('month', so.second_order_date), 
                           DATE_TRUNC('month', fo.first_order_date)))::integer = month_index;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_test_cohort_customers"("cohort_start_date" "text", "cohort_end_date" "text", "month_index" integer, "product_type" "text", "order_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_cohort_heatmap"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(ch) INTO result FROM production.cohort_heatmap ch;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_test_cohort_heatmap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_cohort_heatmap_by_product"("p_product_cohort" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(ch) INTO result 
  FROM production.cohort_heatmap ch
  WHERE ch.primary_product_cohort = p_product_cohort;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_test_cohort_heatmap_by_product"("p_product_cohort" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_customers"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(c) INTO result FROM production.customers c;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_test_customers"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_line_items"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(li) INTO result FROM production.order_line_items li;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_test_line_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_test_orders"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(o) INTO result FROM production.orders o;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."get_test_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_test_customer"("p_shopify_customer_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_total_spent" numeric, "p_orders_count" integer, "p_created_at" timestamp without time zone, "p_updated_at" timestamp without time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.customers (
      shopify_customer_id, email, first_name, last_name, 
      total_spent, orders_count, created_at, updated_at
    ) VALUES (
      p_shopify_customer_id, p_email, p_first_name, p_last_name,
      p_total_spent, p_orders_count, p_created_at, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."insert_test_customer"("p_shopify_customer_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_total_spent" numeric, "p_orders_count" integer, "p_created_at" timestamp without time zone, "p_updated_at" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_test_line_item"("p_order_id" integer, "p_shopify_order_id" "text", "p_product_id" "text", "p_variant_id" "text", "p_title" "text", "p_quantity" integer, "p_price" numeric, "p_sku" "text", "p_product_type" "text", "p_vendor" "text", "p_updated_at" timestamp without time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.order_line_items (
      order_id, shopify_order_id, product_id, variant_id,
      title, quantity, price, sku, product_type, vendor, updated_at
    ) VALUES (
      p_order_id, p_shopify_order_id, p_product_id, p_variant_id,
      p_title, p_quantity, p_price, p_sku, p_product_type, p_vendor, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."insert_test_line_item"("p_order_id" integer, "p_shopify_order_id" "text", "p_product_id" "text", "p_variant_id" "text", "p_title" "text", "p_quantity" integer, "p_price" numeric, "p_sku" "text", "p_product_type" "text", "p_vendor" "text", "p_updated_at" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_test_order"("p_shopify_order_id" "text", "p_customer_id" integer, "p_shopify_customer_id" "text", "p_order_number" "text", "p_total_price" numeric, "p_processed_at" timestamp without time zone, "p_updated_at" timestamp without time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  result JSONB;
BEGIN
  WITH inserted AS (
    INSERT INTO production.orders (
      shopify_order_id, customer_id, shopify_customer_id,
      order_number, total_price, processed_at, updated_at
    ) VALUES (
      p_shopify_order_id, p_customer_id, p_shopify_customer_id,
      p_order_number, p_total_price, p_processed_at, p_updated_at
    )
    RETURNING *
  )
  SELECT jsonb_agg(inserted) INTO result FROM inserted;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;


ALTER FUNCTION "public"."insert_test_order"("p_shopify_order_id" "text", "p_customer_id" integer, "p_shopify_customer_id" "text", "p_order_number" "text", "p_total_price" numeric, "p_processed_at" timestamp without time zone, "p_updated_at" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_all_materialized_views"() RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    view_count INTEGER := 0;
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY production.cohort_sizes;
    view_count := view_count + 1;
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY production.cohort_second_orders;
    view_count := view_count + 1;
    
    REFRESH MATERIALIZED VIEW CONCURRENTLY production.cohort_heatmap;
    view_count := view_count + 1;
    
    RETURN view_count;
END;
$$;


ALTER FUNCTION "public"."refresh_all_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_materialized_views"() RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY production.cohort_analysis;
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error refreshing materialized views: %', SQLERRM;
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."refresh_materialized_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_connection"() RETURNS TABLE("id" "uuid", "email" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT c.id, c.email FROM production.customers c LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."test_connection"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_line_items"() RETURNS TABLE("id" "uuid", "order_id" "uuid", "product_id" "text", "title" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT li.id, li.order_id, li.product_id, li.title FROM production.order_line_items li LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."test_line_items"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_orders"() RETURNS TABLE("id" "uuid", "shopify_order_id" "text", "customer_id" "uuid")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY SELECT o.id, o.shopify_order_id, o.customer_id FROM production.orders o LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."test_orders"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_shopify_data_batch"("orders_data" "public"."order_type"[], "line_items_data" "public"."order_line_item_type"[]) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    order_ids_to_update TEXT[];
BEGIN
    -- Set a longer timeout for this transaction to handle large batches.
    SET LOCAL statement_timeout = '600s';

    -- Get the list of Shopify order IDs from the input batch.
    SELECT array_agg(o.shopify_order_id) INTO order_ids_to_update
    FROM unnest(orders_data) AS o;

    -- If there are orders in the batch, delete their existing line items for a clean insert.
    IF array_length(order_ids_to_update, 1) > 0 THEN
        DELETE FROM production.order_line_items
        WHERE shopify_order_id = ANY(order_ids_to_update);
    END IF;

    -- Upsert the orders. This will insert new orders or update existing ones based on shopify_order_id.
    INSERT INTO production.orders (
        id, shopify_order_id, customer_id, shopify_customer_id, name, total_price, processed_at, 
        updated_at, created_at, cancelled_at, currency_code, email, fulfillment_status, financial_status, sales_channel, tags
    )
    SELECT 
        o.id, o.shopify_order_id, o.customer_id, o.shopify_customer_id, o.name, o.total_price, o.processed_at,
        o.updated_at, o.created_at, o.cancelled_at, o.currency_code, o.email, o.fulfillment_status, o.financial_status, o.sales_channel, o.tags
    FROM unnest(orders_data) AS o
    ON CONFLICT (shopify_order_id) DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        total_price = EXCLUDED.total_price,
        processed_at = EXCLUDED.processed_at,
        updated_at = EXCLUDED.updated_at,
        created_at = EXCLUDED.created_at,
        cancelled_at = EXCLUDED.cancelled_at,
        currency_code = EXCLUDED.currency_code,
        email = EXCLUDED.email,
        fulfillment_status = EXCLUDED.fulfillment_status,
        financial_status = EXCLUDED.financial_status,
        sales_channel = EXCLUDED.sales_channel,
        tags = EXCLUDED.tags;

    -- Insert the new line items for the orders in the batch.
    INSERT INTO production.order_line_items (
        id, order_id, shopify_order_id, product_id, variant_id, title, quantity, price, sku, 
        product_type, vendor, fulfillment_status, updated_at, created_at
    )
    SELECT
        li.id, li.order_id, li.shopify_order_id, li.product_id, li.variant_id, li.title, li.quantity, li.price, li.sku,
        li.product_type, li.vendor, li.fulfillment_status, li.updated_at, li.created_at
    FROM unnest(line_items_data) AS li;

END;
$$;


ALTER FUNCTION "public"."upsert_shopify_data_batch"("orders_data" "public"."order_type"[], "line_items_data" "public"."order_line_item_type"[]) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "production"."customers" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "shopify_customer_id" "text" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "total_spent" numeric DEFAULT 0.00 NOT NULL,
    "orders_count" integer DEFAULT 0 NOT NULL,
    "primary_product_cohort" "text",
    "accepts_marketing" boolean,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "currency" "text",
    "phone" "text",
    "tags" "text"[],
    "last_order_at" timestamp with time zone
);


ALTER TABLE "production"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "production"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "shopify_order_id" "text" NOT NULL,
    "customer_id" "text",
    "shopify_customer_id" "text",
    "order_number" "text",
    "total_price" numeric,
    "processed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "currency_code" "text",
    "email" "text",
    "name" "text",
    "fulfillment_status" "text",
    "financial_status" "text",
    "tags" "text"[],
    "created_at" timestamp with time zone,
    "sales_channel" "text",
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "production"."orders" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "production"."cohort_second_orders" AS
 WITH "first_orders" AS (
         SELECT "c"."id" AS "customer_id",
            "c"."primary_product_cohort",
            "min"("o"."processed_at") AS "first_order_date"
           FROM ("production"."customers" "c"
             JOIN "production"."orders" "o" ON (("c"."id" = "o"."customer_id")))
          GROUP BY "c"."id", "c"."primary_product_cohort"
        ), "second_orders" AS (
         SELECT "fo"."customer_id",
            "min"("o"."processed_at") AS "second_order_date"
           FROM ("first_orders" "fo"
             JOIN "production"."orders" "o" ON (("fo"."customer_id" = "o"."customer_id")))
          WHERE ("o"."processed_at" > "fo"."first_order_date")
          GROUP BY "fo"."customer_id"
        ), "cohort_details" AS (
         SELECT "to_char"("date_trunc"('month'::"text", "fo"."first_order_date"), 'YYYY-MM'::"text") AS "cohort_month",
            "fo"."primary_product_cohort",
            (((EXTRACT(year FROM "age"("so"."second_order_date", "fo"."first_order_date")) * (12)::numeric) + EXTRACT(month FROM "age"("so"."second_order_date", "fo"."first_order_date"))))::integer AS "months_since_first",
            "so"."customer_id"
           FROM ("first_orders" "fo"
             JOIN "second_orders" "so" ON (("fo"."customer_id" = "so"."customer_id")))
        )
 SELECT "cohort_month",
    "primary_product_cohort",
    "months_since_first",
    "count"(DISTINCT "customer_id") AS "second_order_customers"
   FROM "cohort_details" "cd"
  GROUP BY "cohort_month", "primary_product_cohort", "months_since_first"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "production"."cohort_second_orders" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "production"."cohort_sizes" AS
 WITH "customer_cohorts" AS (
         SELECT "c"."id" AS "customer_id",
            "c"."primary_product_cohort",
            "to_char"("date_trunc"('month'::"text", "min"("o"."processed_at")), 'YYYY-MM'::"text") AS "cohort_month"
           FROM ("production"."customers" "c"
             JOIN "production"."orders" "o" ON (("c"."id" = "o"."customer_id")))
          WHERE ("c"."primary_product_cohort" IS NOT NULL)
          GROUP BY "c"."id", "c"."primary_product_cohort"
        )
 SELECT "cohort_month",
    "primary_product_cohort",
    "count"(DISTINCT "customer_id") AS "new_customers"
   FROM "customer_cohorts" "cc"
  GROUP BY "cohort_month", "primary_product_cohort"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "production"."cohort_sizes" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "production"."cohort_heatmap" AS
 WITH "cohort_data" AS (
         SELECT "cs"."cohort_month",
            "cs"."primary_product_cohort",
            "cs"."new_customers",
            COALESCE("sum"("so"."second_order_customers"), (0)::numeric) AS "total_second_orders"
           FROM ("production"."cohort_sizes" "cs"
             LEFT JOIN "production"."cohort_second_orders" "so" ON ((("cs"."cohort_month" = "so"."cohort_month") AND ("cs"."primary_product_cohort" = "so"."primary_product_cohort"))))
          GROUP BY "cs"."cohort_month", "cs"."primary_product_cohort", "cs"."new_customers"
        ), "monthly_breakdown" AS (
         SELECT "cs"."cohort_month",
            "cs"."primary_product_cohort",
            "so"."months_since_first",
            COALESCE("so"."second_order_customers", (0)::bigint) AS "second_order_customers"
           FROM ("production"."cohort_sizes" "cs"
             LEFT JOIN "production"."cohort_second_orders" "so" ON ((("cs"."cohort_month" = "so"."cohort_month") AND ("cs"."primary_product_cohort" = "so"."primary_product_cohort"))))
        )
 SELECT "cd"."cohort_month",
    "cd"."primary_product_cohort",
    "cd"."new_customers",
    "cd"."total_second_orders",
    "round"((("cd"."total_second_orders" / (NULLIF("cd"."new_customers", 0))::numeric) * (100)::numeric), 1) AS "retention_percentage",
    "jsonb_object_agg"(COALESCE(('m'::"text" || ("mb"."months_since_first")::"text"), 'unknown'::"text"), "jsonb_build_object"('count', COALESCE("mb"."second_order_customers", (0)::bigint), 'percentage', "round"((((COALESCE("mb"."second_order_customers", (0)::bigint))::numeric / (NULLIF("cd"."new_customers", 0))::numeric) * (100)::numeric), 1))) AS "monthly_data"
   FROM ("cohort_data" "cd"
     LEFT JOIN "monthly_breakdown" "mb" ON ((("cd"."cohort_month" = "mb"."cohort_month") AND ("cd"."primary_product_cohort" = "mb"."primary_product_cohort"))))
  GROUP BY "cd"."cohort_month", "cd"."primary_product_cohort", "cd"."new_customers", "cd"."total_second_orders"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "production"."cohort_heatmap" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "production"."order_line_items" (
    "id" "text" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid",
    "shopify_order_id" "text" NOT NULL,
    "product_id" "text",
    "variant_id" "text",
    "title" "text",
    "quantity" integer,
    "price" numeric,
    "sku" "text",
    "product_type" "text",
    "vendor" "text",
    "fulfillment_status" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone
);


ALTER TABLE "production"."order_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "production"."sync_metadata" (
    "key" "text" NOT NULL,
    "value" "text"
);


ALTER TABLE "production"."sync_metadata" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_metadata" (
    "id" integer DEFAULT 1 NOT NULL,
    "last_sync_timestamp" timestamp with time zone
);


ALTER TABLE "public"."sync_metadata" OWNER TO "postgres";


ALTER TABLE ONLY "production"."customers"
    ADD CONSTRAINT "customers_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "production"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "production"."customers"
    ADD CONSTRAINT "customers_shopify_customer_id_key" UNIQUE ("shopify_customer_id");



ALTER TABLE ONLY "production"."order_line_items"
    ADD CONSTRAINT "order_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "production"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "production"."orders"
    ADD CONSTRAINT "orders_shopify_order_id_key" UNIQUE ("shopify_order_id");



ALTER TABLE ONLY "production"."sync_metadata"
    ADD CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."sync_metadata"
    ADD CONSTRAINT "sync_metadata_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "production"."order_line_items"
    ADD CONSTRAINT "order_line_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "production"."orders"("id");



ALTER TABLE ONLY "production"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "production"."customers"("id");





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT ALL ON SCHEMA "production" TO "service_role";
GRANT USAGE ON SCHEMA "production" TO "authenticated";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "production"."check_schema_exists"("schema_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "production"."classify_new_customers"() TO "service_role";



GRANT ALL ON FUNCTION "production"."get_cohort_opportunity_customers"("p_cohort_month" "text", "p_product_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "production"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "service_role";
GRANT ALL ON FUNCTION "production"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "production"."get_distinct_product_cohorts"() TO "service_role";



GRANT ALL ON FUNCTION "production"."get_order_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "production"."upsert_shopify_data_batch"("orders_data" "jsonb", "line_items_data" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_analysis_data"("p_nth_order" integer, "p_product_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_analysis_data"("p_nth_order" integer, "p_product_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_analysis_data"("p_nth_order" integer, "p_product_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_heatmap"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_heatmap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_heatmap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_heatmap_by_product"("p_product_cohort" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_heatmap_by_product"("p_product_cohort" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_heatmap_by_product"("p_product_cohort" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_sizes"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_sizes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_sizes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cohort_verification_stats"("start_date_param" "text", "end_date_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cohort_verification_stats"("start_date_param" "text", "end_date_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cohort_verification_stats"("start_date_param" "text", "end_date_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_customer_uuids_by_shopify_ids"("p_shopify_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_customers"("cohort_month" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_customers"("cohort_month" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_customers"("cohort_month" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("order_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("order_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("order_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("product_type" "text", "order_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("product_type" "text", "order_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_multi_order_cohort_heatmap"("product_type" "text", "order_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_order_uuids_by_shopify_gids"("p_shopify_ids" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."get_order_uuids_by_shopify_gids"("p_shopify_ids" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_order_uuids_by_shopify_gids"("p_shopify_ids" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_cohort_customers"("cohort_start_date" "text", "cohort_end_date" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_cohort_customers"("cohort_start_date" "text", "cohort_end_date" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_cohort_customers"("cohort_start_date" "text", "cohort_end_date" "text", "month_index" integer, "product_type" "text", "order_number" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap_by_product"("p_product_cohort" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap_by_product"("p_product_cohort" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_cohort_heatmap_by_product"("p_product_cohort" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_customers"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_customers"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_customers"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_line_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_line_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_line_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_test_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_test_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_test_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_test_customer"("p_shopify_customer_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_total_spent" numeric, "p_orders_count" integer, "p_created_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_test_customer"("p_shopify_customer_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_total_spent" numeric, "p_orders_count" integer, "p_created_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_test_customer"("p_shopify_customer_id" "text", "p_email" "text", "p_first_name" "text", "p_last_name" "text", "p_total_spent" numeric, "p_orders_count" integer, "p_created_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_test_line_item"("p_order_id" integer, "p_shopify_order_id" "text", "p_product_id" "text", "p_variant_id" "text", "p_title" "text", "p_quantity" integer, "p_price" numeric, "p_sku" "text", "p_product_type" "text", "p_vendor" "text", "p_updated_at" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_test_line_item"("p_order_id" integer, "p_shopify_order_id" "text", "p_product_id" "text", "p_variant_id" "text", "p_title" "text", "p_quantity" integer, "p_price" numeric, "p_sku" "text", "p_product_type" "text", "p_vendor" "text", "p_updated_at" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_test_line_item"("p_order_id" integer, "p_shopify_order_id" "text", "p_product_id" "text", "p_variant_id" "text", "p_title" "text", "p_quantity" integer, "p_price" numeric, "p_sku" "text", "p_product_type" "text", "p_vendor" "text", "p_updated_at" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_test_order"("p_shopify_order_id" "text", "p_customer_id" integer, "p_shopify_customer_id" "text", "p_order_number" "text", "p_total_price" numeric, "p_processed_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."insert_test_order"("p_shopify_order_id" "text", "p_customer_id" integer, "p_shopify_customer_id" "text", "p_order_number" "text", "p_total_price" numeric, "p_processed_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_test_order"("p_shopify_order_id" "text", "p_customer_id" integer, "p_shopify_customer_id" "text", "p_order_number" "text", "p_total_price" numeric, "p_processed_at" timestamp without time zone, "p_updated_at" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_connection"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_connection"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_connection"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_line_items"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_line_items"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_line_items"() TO "service_role";



GRANT ALL ON FUNCTION "public"."test_orders"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_orders"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_orders"() TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_shopify_data_batch"("orders_data" "public"."order_type"[], "line_items_data" "public"."order_line_item_type"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_shopify_data_batch"("orders_data" "public"."order_type"[], "line_items_data" "public"."order_line_item_type"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_shopify_data_batch"("orders_data" "public"."order_type"[], "line_items_data" "public"."order_line_item_type"[]) TO "service_role";
























GRANT ALL ON TABLE "production"."customers" TO "service_role";



GRANT ALL ON TABLE "production"."orders" TO "service_role";



GRANT ALL ON TABLE "production"."cohort_second_orders" TO "service_role";



GRANT ALL ON TABLE "production"."cohort_sizes" TO "service_role";



GRANT ALL ON TABLE "production"."cohort_heatmap" TO "service_role";



GRANT ALL ON TABLE "production"."order_line_items" TO "service_role";



GRANT ALL ON TABLE "production"."sync_metadata" TO "service_role";



GRANT ALL ON TABLE "public"."sync_metadata" TO "anon";
GRANT ALL ON TABLE "public"."sync_metadata" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_metadata" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "production" GRANT ALL ON SEQUENCES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "production" GRANT ALL ON FUNCTIONS TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "production" GRANT ALL ON TABLES TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
