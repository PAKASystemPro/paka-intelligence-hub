# PAKA Intelligence Hub: Cohort Analysis Logic (Milestone 1)

## Overview

This document explains the cohort analysis logic for the PAKA Intelligence Hub's Milestone 1. The goal is to track customer retention by analyzing the time between a customer's first and second purchase, with the ability to segment by the product group of their first purchase.

## Architectural Principles

Our approach is guided by two core principles to ensure the system is maintainable and scalable:

1.  **Simple Database, Smart Application**: We keep the database as simple as possible—its main job is to store data cleanly. All complex business logic, like calculating cohorts, lives in our Next.js application code. This makes the logic much easier to test, debug, and evolve in the future.
2.  **On-Demand Calculation for Flexibility**: Instead of pre-calculating results in the database (with materialized views), we calculate the analysis *when you load the page*. For our current data scale, this is very fast and gives us maximum flexibility to change the analysis later without complex database migrations.

## Data & Calculation Flow

The process works in two main stages: data synchronization and on-demand analysis.

1.  **Scheduled Data Sync**:
    * Every 15 minutes, an automated job runs.
    * This job connects to the Shopify API and fetches any new or updated orders and customers.

2.  **Data Ingestion & Enrichment**:
    * The sync script inserts this new data into our clean Supabase tables (`production.customers`, `production.orders`, etc.).
    * If a brand new customer is synced, our application's backend logic immediately analyzes their first order to determine their `cohort_month` (e.g., '2025-07-01') and their `initial_product_group` ('深睡寶寶', '天皇丸', or '皇后丸').
    * This enriched information is then saved in that customer's row in the `production.customers` table.

3.  **On-Demand Analysis via API**:
    * When you open the "Retention" page in the PAKA Intelligence Hub, the frontend makes a request to our backend API (e.g., `/api/analytics/retention`).
    * You can include filters in this request, such as a specific product group.

4.  **Real-time Calculation & Response**:
    * Our Next.js backend receives the request.
    * It then runs a query to fetch the relevant raw data (customers and their order dates) from our Supabase database.
    * The core cohort calculation logic, written in TypeScript within our application, processes this raw data on-the-fly to build the complete heatmap, including cohort sizes, monthly second-order counts, and retention percentages.
    * The backend sends this fully-calculated data back to the frontend as a clean JSON object.

5.  **Frontend Display**:
    * The frontend dashboard receives the JSON data and simply renders it in the `CohortTable` component, with no complex calculations needed in the browser.

## Example Scenario

Let's follow a customer through our new, updated system:

1.  **New Customer in July 2025**:
    * A customer makes their first-ever purchase on **July 15, 2025**.
    * The order contains a "深睡寶寶" product.
    * Within 15 minutes, our **Scheduled Data Sync** job fetches this new customer and order from Shopify.

2.  **Enrichment in our Backend**:
    * Our **Data Ingestion** logic sees this is a new customer.
    * It analyzes their first order and updates their record in the `production.customers` table with:
        * `cohort_month = '2025-07-01'`
        * `initial_product_group = '深睡寶寶'`

3.  **Second Purchase in October 2025**:
    * The same customer makes a second purchase on **October 30, 2025**.
    * Our sync job adds this new order to the `production.orders` table, linked to the existing customer.

4.  **Viewing the Dashboard**:
    * Later, you open the Retention page and select the "深睡寶寶" filter.
    * Your browser calls our API.
    * Our backend **calculates the analysis on-demand**. It finds all customers in the "2025-07" cohort for "深睡寶寶". It then looks at all of their second orders and finds this customer's second order in October.
    * The logic calculates the month difference: October (month 10) - July (month 7) = **3 months**.

5.  **Heatmap Visualization**:
    * The final JSON data sent to your browser includes this customer's activity.
    * In the heatmap table, for the row **"2025-07"**, this customer's second purchase correctly increases the count in the **"m3"** column (representing 3 months after the first purchase).

## Key Points About the Logic

1.  **Cohort Assignment**: A customer's cohort is defined by the calendar month of their `ordered_at` timestamp on their very first order. This is permanent. Their product segmentation is defined by the `initial_product_group` from that same first order.
2.  **Second Order Tracking**: We track retention by calculating the time difference between the customer's first order and their second order.
3.  **Filtering**: When you filter by a product, our API query simply adds a `WHERE initial_product_group = '深睡寶寶'` clause before performing the calculation, ensuring the analysis is fast and accurate. The "ALL" filter simply omits this clause.


## Reference Data

The implementation is designed to match the reference cohort heatmaps with the following metrics:

### Product Cohort: ALL
- Grand Total: 1958 new customers, 699 second order customers (35.7% retention)
- 2025-01: 147 new customers, 65 second orders (44.2% retention)
- 2025-02: 181 new customers, 76 second orders (42% retention)
- 2025-03: 282 new customers, 139 second orders (49.3% retention)
- 2025-04: 369 new customers, 141 second orders (38.2% retention)
- 2025-05: 453 new customers, 157 second orders (34.7% retention)
- 2025-06: 526 new customers, 121 second orders (23% retention)

### Product Cohort: 深睡寶寶
- Grand Total: 578 new customers, 225 second order customers (38.9% retention)
- 2025-01: 32 new customers, 17 second orders (53.1% retention)
- 2025-02: 50 new customers, 20 second orders (40% retention)
- 2025-03: 106 new customers, 57 second orders (53.8% retention)
- 2025-04: 125 new customers, 45 second orders (36% retention)
- 2025-05: 116 new customers, 45 second orders (38.8% retention)
- 2025-06: 149 new customers, 41 second orders (27.5% retention)

### Product Cohort: 天皇丸
- Grand Total: 788 new customers, 272 second order customers (34.5% retention)
- 2025-01: 42 new customers, 15 second orders (35.7% retention)
- 2025-02: 49 new customers, 18 second orders (36.7% retention)
- 2025-03: 83 new customers, 44 second orders (53% retention)
- 2025-04: 172 new customers, 69 second orders (40.1% retention)
- 2025-05: 217 new customers, 78 second orders (35.9% retention)
- 2025-06: 225 new customers, 48 second orders (21.3% retention)

### Product Cohort: 皇后丸
- Grand Total: 513 new customers, 191 second order customers (37.2% retention)
- 2025-01: 68 new customers, 33 second orders (48.5% retention)
- 2025-02: 58 new customers, 32 second orders (55.2% retention)
- 2025-03: 82 new customers, 36 second orders (43.9% retention)
- 2025-04: 60 new customers, 25 second orders (41.7% retention)
- 2025-05: 105 new customers, 34 second orders (32.4% retention)
- 2025-06: 140 new customers, 31 second orders (22.1% retention)