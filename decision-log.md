# PAKA Intelligence Hub - Decision Log

This is the project's long-term memory. We log every important decision here.

- **2025-07-10**: Decided to use a "Source of Truth Reset" strategy, fetching all historical data directly from Shopify to guarantee data integrity.

- **2025-07-10**: Simplified the Shopify query to filter ONLY by `created_at` for the initial historical sync to match business requirements for cohorting.

- **2025-07-10**: Added `last_name`, `orders_count`, and `total_spent` columns to the `production.customers` table to fully capture available Shopify data.

- **2025-07-10**: Corrected the `products` table schema to use `product_group` instead of `product_type` and `vendor` to support our internal business logic.

- **2025-07-10**: Finalized the database schema by adding `last_name`, `orders_count`, `total_spent`, and `order_number` columns to ensure all necessary data from Shopify is captured.

- **2025-07-10**: Confirmed the database design principle: redundant Shopify IDs (e.g., `shopify_customer_id` in the orders table) will not be stored to maintain a clean, normalized schema.

- **2025-07-10**: Established the business rule to filter out and ignore any Shopify orders that are not linked to a customer, as they are not relevant for customer cohort analysis.

- **2025-07-10**: Switched from using `.upsert()` to a direct `.insert()` for `order_line_items` because we are always syncing to a clean, empty table for the historical import.

- **2025-07-10**: **MILESTONE**: The historical data sync for the test month of January 2025 is 100% complete and verified. All products, customers, orders, and line items are correctly stored in the database.

- **2025-07-11**: **CRITICAL PIVOT**: Abandoned the "generate one large SQL file" workaround. Adopted a superior **"Monthly Batch Sync"** strategy for the historical data import.
    - **Reasoning**: The SQL file approach was inefficient, not fault-tolerant, and required excessive manual effort. The new strategy is resumable, provides clear progress tracking, and builds upon a previously successful single-month sync process, making it a more robust and fact-based plan.
    
- **2025-07-11**: **FINAL ARCHITECTURE PIVOT**: After multiple failures with monthly batching and SQL file generation, we are implementing the definitive **"Two-Pass Pre-Population"** architecture.
    - **Reasoning**: All previous `null value in column "customer_id"` errors were caused by race conditions where an order was processed before its parent customer was guaranteed to exist in the database. The new architecture fundamentally solves this.
    - **Process**:
        1.  **Pass 1 (Fetch & Pre-populate)**: The script will first fetch ALL orders from the entire history into memory. It will then extract ALL unique customers and ALL unique products and insert them into the database in large, safe batches.
        2.  **Pass 2 (Insert Children)**: Only after all "parent" records are guaranteed to be in the database will the script proceed to insert the "child" records (orders and line items), which can now be safely linked.
    - **Outcome**: This is a fully automated, single-command script that is robust, scalable, and eliminates the root cause of all previous data integrity errors. This is the final and correct approach.

- **2025-07-11**: **MILESTONE**: The historical data sync is 100% complete. All 27,000+ orders and their related data have been successfully loaded into the database using the "Fetch First, Generate SQL Files" architecture.

- **2025-07-11**: **MILESTONE**: The cohort analysis logic is complete and verified. The script now correctly calculates new customer counts and retention, matching the reference data. The entire backend data foundation for the MVP is finished.

- **2025-07-12**: **MILESTONE**: The Nth Order Cohort Analysis, including the "Drill-Down" and "Opportunity List" backend logic, is complete and verified against reference data. The entire backend for the MVP is finished.

- **2025-07-13**: **MILESTONE**: The complete backend analysis engine is finished and verified. All database functions and TypeScript logic for Nth order retention and drill-downs are working correctly and have been tested against reference data.