# Cohort Analysis Feature: Definitive Guide

*Last Updated: 2025-07-05*

This document serves as the single source of truth for the Cohort Analysis feature. It details the business logic, database implementation, and frontend integration. This guide was created to prevent a recurrence of the significant debugging challenges faced during its development.

---

## 1. Core Business Logic

The primary goal is to track customer retention by grouping customers into monthly cohorts and observing their repurchase behavior over time.

### Cohort Definition (Strict)

A customer belongs to a specific cohort month (e.g., '2025-01') if and only if **both** of the following conditions are met:
1.  The customer entity was created in that month (`production.customers.created_at`).
2.  The customer's **first order** was processed in the **same month** (`production.orders.processed_at`).

This dual-condition ensures that cohorts consist of genuinely new, purchasing customers for that month.

### Product-Based Filtering

Cohorts can be filtered by the product that acquired the customer. This is determined by the `primary_product_cohort` field on the `production.customers` table. This value is assigned once based on the line items in the customer's first order and does not change.

### Key Metrics

-   **New Customers:** The total number of unique customers in a cohort.
-   **Second Orders:** The total number of unique customers from a cohort who placed a second order at any point in time.
-   **Retention %:** `(Total Second Orders / New Customers) * 100`
-   **Opportunity Count:** `New Customers - Total Second Orders`. Represents the number of customers who have not yet made a second purchase.
-   **Monthly Retention (m0, m1, ...):** The number of customers from a cohort who made their second purchase *n* months after their first purchase.

---

## 2. Database Implementation

The entire calculation is encapsulated in a single PostgreSQL function.

### Function: `production.get_cohort_analysis_data`

This function accepts one parameter and returns a single `JSONB` object containing the full data payload for the frontend.

-   **Parameter:** `p_product_filter TEXT` (Default: 'ALL').
-   **Returns:** `JSONB`

#### Final SQL Code:

```sql
-- This migration definitively fixes the cohort analysis function by first dropping the old version
-- to resolve signature conflicts, and then creating the correct, hardened version.

DROP FUNCTION IF EXISTS production.get_cohort_analysis_data(TEXT);

CREATE OR REPLACE FUNCTION production.get_cohort_analysis_data(p_product_filter TEXT DEFAULT 'ALL')
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    WITH
    ranked_orders AS (
        SELECT
            o.customer_id,
            o.processed_at,
            ROW_NUMBER() OVER(PARTITION BY o.customer_id ORDER BY o.processed_at ASC) as order_rank
        FROM
            production.orders o
        WHERE
            o.customer_id IS NOT NULL
    ),
    customer_cohorts AS (
        SELECT
            ro.customer_id,
            ro.processed_at AS first_order_at,
            c.primary_product_cohort,
            TO_CHAR(ro.processed_at, 'YYYY-MM-01')::DATE AS cohort_month
        FROM
            ranked_orders ro
        JOIN
            production.customers c ON ro.customer_id = c.id
        WHERE
            ro.order_rank = 1
            AND TO_CHAR(ro.processed_at, 'YYYY-MM') = TO_CHAR(c.created_at, 'YYYY-MM')
    ),
    second_orders AS (
        SELECT
            customer_id,
            processed_at AS second_order_at
        FROM
            ranked_orders
        WHERE
            order_rank = 2
    ),
    full_cohort_data AS (
        SELECT
            cc.cohort_month,
            cc.customer_id,
            so.second_order_at,
            (DATE_PART('year', so.second_order_at) - DATE_PART('year', cc.first_order_at)) * 12 +
            (DATE_PART('month', so.second_order_at) - DATE_PART('month', cc.first_order_at)) AS month_number
        FROM
            customer_cohorts cc
        LEFT JOIN
            second_orders so ON cc.customer_id = so.customer_id
        WHERE
            (p_product_filter = 'ALL' OR cc.primary_product_cohort = p_product_filter)
    ),
    cohort_summary AS (
        SELECT
            cohort_month,
            COUNT(DISTINCT customer_id) AS new_customers,
            COUNT(DISTINCT CASE WHEN second_order_at IS NOT NULL THEN customer_id END) AS total_second_orders
        FROM
            full_cohort_data
        GROUP BY
            cohort_month
    ),
    monthly_retention_counts AS (
        SELECT
            cohort_month,
            month_number,
            COUNT(DISTINCT customer_id) AS retained_customers
        FROM
            full_cohort_data
        WHERE
            month_number IS NOT NULL
        GROUP BY
            cohort_month, month_number
    ),
    final_cohorts AS (
        SELECT
            cs.cohort_month,
            cs.new_customers,
            cs.total_second_orders,
            (cs.new_customers - cs.total_second_orders) AS opportunity_count,
            ROUND(CASE WHEN cs.new_customers > 0 THEN (cs.total_second_orders::decimal / cs.new_customers * 100) ELSE 0 END, 2) AS retention_percentage,
            COALESCE(
                (
                    SELECT jsonb_object_agg(
                        'm' || mrc.month_number,
                        jsonb_build_object(
                            'count', mrc.retained_customers,
                            'percentage', ROUND(CASE WHEN cs.new_customers > 0 THEN (mrc.retained_customers::decimal / cs.new_customers * 100) ELSE 0 END, 2),
                            'contribution_percentage', ROUND(CASE WHEN cs.total_second_orders > 0 THEN (mrc.retained_customers::decimal / cs.total_second_orders * 100) ELSE 0 END, 2)
                        )
                    )
                    FROM monthly_retention_counts mrc
                    WHERE mrc.cohort_month = cs.cohort_month
                ),
                '{}'::jsonb
            ) AS monthly_data
        FROM
            cohort_summary cs
    ),
    grand_total AS (
        SELECT
            COALESCE(SUM(new_customers), 0) AS new_customers,
            COALESCE(SUM(total_second_orders), 0) AS total_second_orders,
            ROUND(CASE WHEN COALESCE(SUM(new_customers), 0) > 0 THEN (COALESCE(SUM(total_second_orders), 0)::decimal / SUM(new_customers) * 100) ELSE 0 END, 2) AS retention_percentage
        FROM
            cohort_summary
    )
    SELECT jsonb_build_object(
        'cohorts', (SELECT COALESCE(jsonb_agg(fc ORDER BY fc.cohort_month DESC), '[]'::jsonb) FROM final_cohorts fc),
        'grandTotal', (SELECT to_jsonb(gt.*) FROM grand_total gt)
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

### Output Structure

The function returns a JSON object with two top-level keys:

1.  `cohorts`: An array of cohort objects, sorted by month descending.
2.  `grandTotal`: An object containing the aggregated totals across all cohorts.

```json
{
  "cohorts": [
    {
      "cohort_month": "2025-07-01T00:00:00",
      "new_customers": 150,
      "total_second_orders": 25,
      "opportunity_count": 125,
      "retention_percentage": 16.67,
      "monthly_data": {
        "m1": { "count": 15, "percentage": 10.00, "contribution_percentage": 60.00 },
        "m2": { "count": 10, "percentage": 6.67, "contribution_percentage": 40.00 }
      }
    }
  ],
  "grandTotal": {
    "new_customers": 150,
    "total_second_orders": 25,
    "retention_percentage": 16.67
  }
}
```

---

## 3. API & Frontend

### API Route: `GET /api/query/cohort-analysis`

-   This Next.js route handler calls the database function.
-   It passes the `product_filter` from the URL query string to the database function.
-   **CRITICAL:** The parameter name passed in the RPC call **must** be `p_product_filter` to match the function definition.

```typescript
// frontend/app/api/query/cohort-analysis/route.ts

const { data, error } = await supabase.rpc('get_cohort_analysis_data', {
  p_product_filter: productFilter, // Must be p_product_filter
});
```

### Frontend Component: `cohort-heatmap.tsx`

-   Fetches data from the API endpoint on component mount and when the product filter changes.
-   The response data is expected to be the full JSON object (`{ cohorts: [], grandTotal: {} }`).
-   The component directly uses `data.grandTotal` to render the top summary row.
-   It then maps over `data.cohorts` to render each monthly cohort row in the heatmap.

---

## 4. Debugging History & Key Learnings

This feature was plagued by several critical, cascading errors. This section documents them to prevent them from happening again.

1.  **The Typo (Root Cause):** The most significant error was a typo in the API route. The code was calling the database function with the parameter `product_filter` instead of the correct `p_product_filter`. This resulted in a `PGRST202` error: `Could not find the function... in the schema cache`. This error was misleading, suggesting the function didn't exist, when in fact the signature was just incorrect.

2.  **Hidden Errors:** The initial API route used a generic `try/catch` block that hid the detailed error from the database, returning only a generic "500 Internal Server Error". This made debugging impossible. **Lesson:** Always log and return the full, detailed error object from Supabase during development.

3.  **Database State Corruption:** Repeated, incorrect attempts to fix the function using `CREATE OR REPLACE` while changing the return type (`JSON` vs `JSONB`) caused a database error: `cannot change return type of existing function`. **Lesson:** When a function's signature or return type changes, the correct procedure is to `DROP` the old function before `CREATE`-ing the new one.

4.  **Architectural Confusion:** There was significant back-and-forth on whether to calculate the `grandTotal` in the database or on the frontend. The final, working architecture calculates it in the database for simplicity and to align with the frontend's expectations. **Lesson:** Settle on a data contract between the frontend and backend early and stick to it.

By following the logic and implementation details in this document, this feature should remain stable and maintainable.
