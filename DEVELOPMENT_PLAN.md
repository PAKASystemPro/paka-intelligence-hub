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

## 3. Milestone 1 Development Roadmap

* **Phase 1: Historical Data Sync & Enrichment**
    * **Status**: ✅ **COMPLETE**
    * **Goal**: The database is fully populated with clean, correct, and enriched historical data from the entire store history.

* **Phase 2: Nth Order Cohort Analysis - Backend**
    * **Status**: ✅ **COMPLETE**
    * **Goal**: The backend logic is complete. All necessary SQL functions for the Nth order cohort analysis, customer drill-downs, and opportunity lists have been created and verified.

* **Phase 3: Frontend & API Development**
    * **Status**: ⏳ **IN PROGRESS**
    * **Goal**: Build the complete, interactive user interface for the cohort analysis dashboard.
    * **Tasks**:
        1.  **Backend for "Opportunity List"**: Create the final required database function (`get_cohort_opportunity_customers`). **(This is our immediate next step)**
        2.  **API Development**: Create all necessary API endpoints for the frontend to fetch data.
        3.  **UI Scaffolding**: Build the main retention page UI and `CohortTable` component.
        4.  **Implement Dialogs**: Build and connect the "Drill-Down" and "Opportunity List" dialogs.
        5.  **Implement Filters & Polish**: Build the interactive filter controls and add all final cosmetic touches (heatmaps, tooltips, etc.).

* **Phase 4: Testing & Finalization**
    * **Status**: 📋 **PENDING**
    * **Goal**: Write End-to-End tests and refactor the MVP code.

## 4. Future Milestones & Enhancements

* **Milestone 2: Real-time Data Updates**
    * **Goal**: Automate the data enrichment process for new, incoming orders.
    * **Tasks**:
        1.  Create Database Triggers that fire whenever a new order is inserted.
        2.  The trigger will automatically update the relevant customer's aggregate data.