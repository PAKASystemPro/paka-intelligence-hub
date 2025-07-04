# Scripts Index

This document serves as an index for all scripts in the project, explaining their purpose and usage.

## Data Sync Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/sync/sync-shopify-july2025-partial.js` | Sync Shopify data for July 1-3, 2025 | `node scripts/sync/sync-shopify-july2025-partial.js` <br> Fetches and upserts orders, customers, and line items for a specific date range into Supabase. |

## Verification Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/utils/calculate-retention-rate.js` | Calculate and verify cohort retention metrics. | `node scripts/utils/calculate-retention-rate.js [product_cohort]` <br> Calculates new customer counts and 2nd order RPR%. Can be filtered by an optional product cohort name (e.g., `深睡寶寶`). |
| `scripts/utils/investigate-customer-order.js` | Investigate a specific customer's order history. | `node scripts/utils/investigate-customer-order.js` <br> A diagnostic tool to inspect a specific customer's orders and cohort assignment. |

## Maintenance Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/maintenance/clear-product-cohorts.js` | Clear all product cohort assignments. | `node scripts/maintenance/clear-product-cohorts.js` <br> Sets the `primary_product_cohort` column to `NULL` for all customers. |
| `scripts/maintenance/reclassify-product-cohorts.js` | Re-classify all customers by first order. | `node scripts/maintenance/reclassify-product-cohorts.js` <br> Assigns a permanent product cohort based on the line items in each customer's first-ever order. |

## Database Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/sql/cleanup-database.sql` | Clean up all data in production schema. | Deletes all data from tables while preserving the schema structure. |
| `scripts/sql/check-database-schema.sql` | Check database schema and functions. | Verifies that the required schema, tables, and functions exist. |

## Utility Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `scripts/utils/test-supabase-connection-updated.cjs` | Test Supabase connection. | Verifies the connection to Supabase and checks for the existence of key tables. |
