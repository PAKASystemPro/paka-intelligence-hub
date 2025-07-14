
# PAKA Intelligence Hub: Master Development Plan

## 1. Project Vision & Strategic Overview

* **Vision**: To create a central intelligence hub that unifies customer data from Shopify, Klaviyo, and Sleekflow to provide deep analytics, a 360° customer view, and the ability to trigger automated marketing actions.
* **Milestone 1 Goal**: Build and deploy a functional PWA that delivers a flexible **Nth Order Retention Cohort Analysis**, proving the entire data pipeline from Shopify to a powerful, interactive dashboard.

## 2. Core Technology Stack

* **Framework**: Next.js 14+ (App Router)
* **Language**: TypeScript
* **UI**: React with shadcn/ui and Tailwind CSS
* **Database & Backend**: Supabase (PostgreSQL, Auth, Storage, Functions)
* **Deployment**: Vercel
* **Version Control**: GitHub
* **Testing**: Vitest (for Unit Tests), Playwright (for End-to-End Tests)
* **Validation**: Zod (for data and API input validation)

## 3. Technical Architecture & Setup

### 3.1. Project Folder Structure

    paka-intelligence-hub/
    ├── app/
    │   ├── (main)/
    │   │   └── retention/
    │   │       └── page.tsx
    │   └── api/
    │       └── analytics/
    ├── components/
    │   ├── modules/
    │   └── ui/
    ├── lib/
    │   └── analytics/
    │       └── cohorts.ts
    ├── supabase/
    │   └── migrations/
    ├── sql_output/
    └── scripts/
        └── sync-shopify-history.ts

### 3.2. Database Schema

```sql
-- The final, correct schema for our tables.
CREATE TABLE production.products (
    id UUID PRIMARY KEY,
    shopify_product_id BIGINT NOT NULL UNIQUE,
    title TEXT,
    product_group TEXT
);

CREATE TABLE production.customers (
    id UUID PRIMARY KEY,
    shopify_customer_id BIGINT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    first_name TEXT,
    last_name TEXT,
    orders_count INTEGER NOT NULL DEFAULT 0,
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    initial_product_group TEXT,
    cohort_month DATE,
    first_order_at TIMESTAMPTZ
);

CREATE TABLE production.orders (
    id UUID PRIMARY KEY,
    shopify_order_id BIGINT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES production.customers(id),
    order_number TEXT,
    ordered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    total_price NUMERIC(10, 2),
    financial_status TEXT
);

CREATE TABLE production.order_line_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES production.orders(id),
    product_id UUID NOT NULL REFERENCES production.products(id),
    quantity INTEGER,
    price NUMERIC(10, 2)
);



## 4. Milestone 1 Development Roadmap

* **Phase 1: Historical Data Sync & Enrichment**
    * **Status**: ✅ **COMPLETE**
    * **Goal**: Populate our database with the complete and correct Shopify store history.

* **Phase 2: Nth Order Cohort Analysis - Backend**
    * **Status**: ✅ **COMPLETE**
    * **Goal**: Build the powerful, flexible backend logic to calculate Nth order retention and provide drill-down capabilities.

* **Phase 3: Frontend & API Development**
    * **Status**: ⏳ **IN PROGRESS**
    * **Goal**: Build the user interface to display the analysis and trigger actions.
    * **Tasks**:
        1.  Test the API endpoint.
        2.  Build the main retention page UI.
        3.  Create the `CohortTable` component with `shadcn/ui`.
        4.  Add UI controls for Nth order and product filtering.
        5.  Implement the drill-down and opportunity list dialogs.

* **Phase 4: Testing & Finalization**
    * **Status**: 📋 **PENDING**
    * **Goal**: Write End-to-End tests and refactor the MVP code.


## 5. Future Milestones & Enhancements
### Milestone 2: Real-time Data Updates

Goal: Automate the data enrichment process for new, incoming orders.

Tasks:

Create Database Triggers that fire whenever a new order is inserted.

The trigger will automatically update the relevant customer's aggregate data.