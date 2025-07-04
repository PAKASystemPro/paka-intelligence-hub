# Shopify Data Import Validation

## Overview

This document summarizes the approach and findings for validating Shopify customer and order data imported into the Supabase database. The focus is on ensuring accurate new customer cohort counts for January through June 2025.

## Key Findings

1. **Time Zone Adjustment is Critical**
   - UTC+8 timezone adjustment is essential for accurate date filtering
   - January 1st 00:00:00 local time = December 31st 16:00:00 UTC
   - This adjustment significantly improves the accuracy of cohort counts

2. **New Customer Counting Methods**
   - **Method 1: Customer Creation Date**
     - Filter customers by `created_at` within the target month (timezone adjusted)
     - Ensure `orders_count >= 1` to only include customers who made purchases
     - Simple and effective approach that closely matches reference data

   - **Method 2: Order History + Creation Date**
     - Get all customers who ordered in the target month
     - Exclude those who ordered before the target month
     - Further filter to only include those created in the target month
     - More comprehensive but yields similar results to Method 1

3. **Data Import Status**
   - January 2025: Successfully imported with good data quality
   - February 2025: Successfully imported with good data quality
   - March-June 2025: Import pending

4. **Comparison with Reference Data**

| Month    | Reference | Method 1 | Diff (%) | Method 2 | Diff (%) |
|----------|-----------|----------|----------|----------|----------|
| 2025-01  | 147       | 142      | -3.4%    | 142      | -3.4%    |
| 2025-02  | 181       | 171      | -5.5%    | 171      | -5.5%    |
| 2025-03+ | TBD       | TBD      | TBD      | TBD      | TBD      |

## Database Schema

The Supabase database has a specific configuration:

1. **Tables in `production` schema**
   - `production.customers`
   - `production.orders`
   - `production.order_line_items`
   - `production.sync_status` (created to track import status)

2. **Functions in `public` schema**
   - `public.classify_new_customers`
   - `public.refresh_materialized_views`
   - `public.get_test_cohort_heatmap`

3. **Supabase Client Configuration**
   - Must set schema to 'production' for table operations: `{ db: { schema: 'production' } }`
   - Must use `rpc()` without schema prefix for function calls

## Validation Scripts

### 1. Check New Customers Simple

The most effective script for validating new customer counts:

```javascript
// Format date range for the month with timezone adjustment (UTC+8)
const lastDayOfPrevMonth = new Date(year, month-1, 0).getDate();
const lastDayOfMonth = new Date(year, month, 0).getDate();

const prevMonth = month === 1 ? 12 : month - 1;
const prevYear = month === 1 ? year - 1 : year;

const startDate = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-${lastDayOfPrevMonth}T16:00:00Z`;
const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth}T16:00:00Z`;

// Query customers created in the target month with at least one order
const { data: newCustomers } = await supabase
  .from('customers')
  .select('id, shopify_customer_id, email, first_name, last_name, created_at, orders_count')
  .gte('created_at', startDate)
  .lt('created_at', endDate)
  .gte('orders_count', 1);
```

### 2. Verify Second Orders

For validating second order counts:

```javascript
// Get the first and second orders
const firstOrder = orders[0];
const secondOrder = orders[1];
const firstOrderDate = new Date(firstOrder.processed_at);
const secondOrderDate = new Date(secondOrder.processed_at);

// Check if both first and second orders were in the target month (m0 cohort)
if (firstOrderInTargetMonth && secondOrderInTargetMonth) {
  secondOrdersInMonth++;
}
```

## Best Practices

1. **Batch Processing**
   - Use batch processing (50 records per batch) to avoid timeouts
   - Essential when querying large datasets

2. **Timezone Handling**
   - Always adjust for UTC+8 timezone in date filters
   - Use consistent date formatting across all scripts

3. **Schema Awareness**
   - Always specify the `production` schema for table operations
   - Use `rpc()` for function calls (public schema)

4. **Data Validation**
   - Compare results against reference data
   - Use multiple methods to cross-validate results

## Next Steps

1. **Complete Data Import**
   - Import March-June 2025 data using the same approach
   - Use force sync flag to handle partial imports

2. **Validate Second Orders**
   - Apply the same validation approach to second order counts
   - Ensure cohort retention metrics match reference data

3. **Update Cohort Analysis**
   - Implement timezone adjustments in cohort analysis functions
   - Ensure consistent methodology across all reports

4. **Document Final Approach**
   - Update documentation with final validation results
   - Standardize the approach for future data imports
