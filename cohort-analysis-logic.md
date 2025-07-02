# PAKA Intelligence Hub: Cohort Analysis Logic

## Overview

This document explains the cohort analysis logic implemented in the PAKA Intelligence Hub for tracking customer retention patterns from January 2025 to June 2025.

## Data Flow Process

1. **Shopify Sync Edge Function**:
   - Fetches customer, order, and line item data from Shopify
   - Upserts this data into the `production` schema tables
   - Preserves all timestamps and relationships between entities

2. **Customer Classification Function**:
   - Assigns a primary product cohort to each customer based on their first order
   - For example, if a customer's first order contained "深睡寶寶", they're assigned to that cohort

3. **Materialized Views**:
   - `cohort_sizes`: Counts new customers by month and product
   - `cohort_second_orders`: Tracks second orders by cohort month, product, and months since first order

4. **Cohort Heatmap View**:
   - Combines and formats the data for visualization
   - Calculates retention percentages
   - Supports product filtering (深睡寶寶, 天皇丸, 皇后丸, and ALL)

## Example Scenario

Let's follow a specific customer through the system:

1. **New Customer in March 2025**:
   - A customer makes their first purchase on March 15, 2025
   - They purchase "深睡寶寶"
   - The Shopify sync function adds this customer and order to our database

2. **Customer Classification**:
   - The `classify_new_customers()` function runs
   - This customer is assigned `primary_product_cohort = '深睡寶寶'`
   - They are counted in the March 2025 cohort for "深睡寶寶"

3. **Second Purchase on June 30, 2025**:
   - The same customer makes a second purchase
   - The Shopify sync function adds this new order to our database
   - This is their second order, occurring 3 months after their first order

4. **Cohort Analysis Update**:
   - In the `cohort_second_orders` view, this customer is counted as:
     - A second order customer in the "2025-03" cohort
     - With a `months_since_first = 3` (March to June = 3 months)
     - Under the "深睡寶寶" product cohort

5. **Heatmap Visualization**:
   - When viewing the "深睡寶寶" product filter:
     - This customer appears in the March 2025 cohort
     - Their second purchase appears in the "m3" column (3 months after first purchase)
     - They contribute to the retention percentage for that cohort and month
   
   - When viewing the "ALL" product filter:
     - This customer is also included in the aggregated data
     - They still appear in the March 2025 cohort with their second purchase in "m3"

## Key Points About the Logic

1. **Cohort Assignment**:
   - A customer belongs to the cohort of their first purchase month
   - Their cohort never changes, even if they make future purchases
   - Their product cohort is based on their first purchase

2. **Second Order Tracking**:
   - We track when the second order occurs relative to the first order
   - The "months since first" (m0-m11) shows the distribution of when second purchases happen

3. **Product Filtering**:
   - When a specific product filter is selected (e.g., "深睡寶寶"), we only show customers whose first purchase included that product
   - The "ALL" filter includes all customers regardless of their first product

4. **Data Refresh Process**:
   - The orchestrator Edge Function runs the entire pipeline:
     1. Sync new data from Shopify
     2. Classify any new customers
     3. Refresh the materialized views
   - The cohort heatmap view automatically reflects the latest data after the refresh

## Database Schema

### Tables
- `production.customers`: Stores customer information with primary product cohort
- `production.orders`: Stores order information linked to customers
- `production.order_line_items`: Stores line items for each order

### Views
- `production.cohort_sizes`: Counts new customers by cohort month and product
- `production.cohort_second_orders`: Tracks second orders by cohort and months since first
- `production.cohort_heatmap`: Combines data for visualization with retention percentages

### Functions
- `public.classify_new_customers()`: Assigns primary product cohorts to customers
- `public.refresh_all_materialized_views()`: Refreshes all materialized views

## Reference Data

The implementation is designed to match the reference cohort heatmaps with the following metrics:

### Product Cohort: ALL (Image 4)
- Grand Total: 1958 new customers, 699 second order customers (35.7% retention)
- 2025-01: 147 new customers, 65 second orders (44.2% retention)
- 2025-02: 181 new customers, 76 second orders (42% retention)
- 2025-03: 282 new customers, 139 second orders (49.3% retention)
- 2025-04: 369 new customers, 141 second orders (38.2% retention)
- 2025-05: 453 new customers, 157 second orders (34.7% retention)
- 2025-06: 526 new customers, 121 second orders (23% retention)

### Product Cohort: 深睡寶寶 (Image 1)
- Grand Total: 578 new customers, 225 second order customers (38.9% retention)
- 2025-01: 32 new customers, 17 second orders (53.1% retention)
- 2025-02: 50 new customers, 20 second orders (40% retention)
- 2025-03: 106 new customers, 57 second orders (53.8% retention)
- 2025-04: 125 new customers, 45 second orders (36% retention)
- 2025-05: 116 new customers, 45 second orders (38.8% retention)
- 2025-06: 149 new customers, 41 second orders (27.5% retention)

### Product Cohort: 天皇丸 (Image 2)
- Grand Total: 788 new customers, 272 second order customers (34.5% retention)
- 2025-01: 42 new customers, 15 second orders (35.7% retention)
- 2025-02: 49 new customers, 18 second orders (36.7% retention)
- 2025-03: 83 new customers, 44 second orders (53% retention)
- 2025-04: 172 new customers, 69 second orders (40.1% retention)
- 2025-05: 217 new customers, 78 second orders (35.9% retention)
- 2025-06: 225 new customers, 48 second orders (21.3% retention)

### Product Cohort: 皇后丸 (Image 3)
- Grand Total: 513 new customers, 191 second order customers (37.2% retention)
- 2025-01: 68 new customers, 33 second orders (48.5% retention)
- 2025-02: 58 new customers, 32 second orders (55.2% retention)
- 2025-03: 82 new customers, 36 second orders (43.9% retention)
- 2025-04: 60 new customers, 25 second orders (41.7% retention)
- 2025-05: 105 new customers, 34 second orders (32.4% retention)
- 2025-06: 140 new customers, 31 second orders (22.1% retention)
