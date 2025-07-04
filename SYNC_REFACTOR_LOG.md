# Shopify Sync Refactor - 2025-07-05

This document outlines the major refactoring changes applied to the Shopify to Supabase synchronization process to improve reliability, performance, and fix critical timeout issues.

## Summary of Changes

The core of the sync logic was moved from the Edge Function into a dedicated PostgreSQL function. This allows for a single, atomic, and long-running transaction that is not constrained by the Edge Function's execution time limit.

### 1. Database Changes

-   **New SQL Function:** A new PostgreSQL function `public.upsert_shopify_data_batch(orders_data JSONB, line_items_data JSONB)` was created.
    -   **File:** `supabase/migrations/20250705013000_create_upsert_shopify_data_batch_function.sql`
    -   **Purpose:**
        -   Sets a local statement timeout of 10 minutes (`600s`) for the transaction.
        -   Accepts two JSONB arrays: one for orders and one for line items.
        -   Performs a transactional `INSERT ... ON CONFLICT DO UPDATE` for both orders and line items, ensuring the entire batch either succeeds or fails together.
        -   This moves the heavy lifting of the upsert logic into the database for maximum efficiency.

### 2. Edge Function Changes (`delta-sync`)

-   **File:** `supabase/functions/delta-sync/index.ts`
-   **Major Refactoring:** The function was almost completely rewritten.
    -   **GraphQL Query:** The Shopify GraphQL query was expanded to fetch more fields required by the database schema, including `subtotalPriceSet`, `totalTaxSet`, `cancelledAt`, `tags`, etc.
    -   **Batch RPC Call:** The multiple `supabaseClient.from(...).upsert(...)` calls were replaced with a single RPC call to the new `upsert_shopify_data_batch` function.
    -   **Data Preparation:** The function now focuses on fetching data from Shopify and transforming it into the two JSONB arrays expected by the new SQL function.
    -   **Type Safety:** All `any` types were eliminated by introducing specific TypeScript interfaces for the GraphQL response and variables, resolving all linting errors.
    -   **Dependency Caching:** Ran `deno cache` to ensure all remote modules are properly cached.

## Rationale

-   **Fixing Timeouts:** The previous approach was prone to timeouts because the entire fetch and upsert process had to complete within the Edge Function's time limit. The new approach correctly handles timeouts by setting a 10-minute limit *within the database session*, which is the proper way to manage long-running queries in Supabase.
-   **Improving Performance:** Reducing the number of network round-trips from many individual upserts to a single RPC call significantly improves performance.
-   **Enhancing Data Integrity:** Wrapping the batch upsert in a single transaction ensures that an order and its associated line items are never in an inconsistent state.

This refactor makes the entire sync pipeline more robust, scalable, and reliable.
