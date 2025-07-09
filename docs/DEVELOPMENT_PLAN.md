# Project Plan: PAKA Intelligence Hub

**Objective:** To provide a complete, unambiguous, and step-by-step guide for the Windsurf IDE and Gemini assistant to develop the PAKA Wellness internal application.

---

### **Directive for the Windsurf IDE & Gemini 2.5 Pro Assistant**

**This is the most important section. You must adhere to these rules throughout the entire project.**

1.  **Sequential Execution Only:** You must execute the plan one checkpoint at a time, in the exact order presented. Do not jump ahead to future steps or checkpoints, even if you anticipate them.
2.  **No Combining Steps:** Do not combine actions or instructions from multiple checkpoints into a single operation. Complete each numbered action within a checkpoint fully before proceeding to the next.
3.  **Contextual Debugging:** If you encounter a bug or error, your primary goal is to fix it within the context of the *current checkpoint*. Do not fix a bug by implementing code or logic from a future checkpoint. The plan is designed to build upon itself, and jumping ahead will break the process.
4.  **Confirm and Await Instruction:** After completing a checkpoint, explicitly state that it is complete and await the prompt to proceed to the next one. This ensures a controlled, verifiable development flow.
5.  **Adhere Strictly to Specified Technologies:** Use only the languages, libraries, and frameworks specified in the "Technology Stack" section. Do not introduce new dependencies without explicit instruction.

---

### **Technology Stack Specification**

-   **Language:** `TypeScript` for all application logic and backend functions. `SQL`, specifically `PL/pgSQL` for database functions and procedures.
-   **Primary Framework:** `Next.js` (using the modern **App Router**).
-   **Styling:** `Tailwind CSS` for utility-first styling.
-   **UI Components:** `Shadcn/UI`. This is not a component library but a collection of reusable components you will install. This provides maximum flexibility and ownership over the code.
-   **State Management:** Start with built-in React Hooks (`useState`, `useContext`, `useReducer`). If application-wide state becomes complex, we will introduce `Zustand` at that time. Do not add it prematurely.
-   **Database:** Supabase (`PostgreSQL`).
-   **Automation/Backend Logic:** `Supabase Edge Functions` (Deno `TypeScript` runtime).
-   **Deployment:** `Vercel`.

---

### **Milestone 1: The Automated Data Backbone & Project Setup**

**Goal:** Establish the complete project structure, database schema, and fully automated data sync and classification workflow using the Shopify GraphQL API.

#### **Checkpoint 1.1: Project Initialization & Directory Structure**

1.  **Action:** Initialize a new Next.js project with Tailwind CSS. Use the App Router.
    `npx create-next-app@latest paka-wellness-hub --ts --tailwind --eslint --app`
2.  **Action:** Initialize the Supabase project and link it.
    `npm install supabase --save-dev`
    `npx supabase login`
    `npx supabase init`
    `npx supabase link --project-ref YOUR_PROJECT_ID`
3.  **Action:** Install Shadcn/UI.
    `npx shadcn-ui@latest init`
4.  **Instruction:** Create the following directory structure. This is the definitive structure for the project.
    ```
    paka-wellness-hub/
    ├── /app/                               # Next.js App Router
    │   ├── /api/                           # API Routes
    │   │   ├── /actions/                   # Outgoing actions (Sleekflow, etc.)
    │   │   └── /query/                     # Data fetching for the frontend
    │   ├── /dashboard/                     # Protected dashboard routes
    │   │   ├── /cohorts/                   # Cohort analysis pages
    │   │   ├── /advertising/               # Advertising dashboard pages
    │   │   └── layout.tsx
    │   ├── /login/                         # Authentication page
    │   └── layout.tsx                      # Root layout
    ├── /components/                        # Shared React components
    │   ├── /ui/                            # Components installed by Shadcn/UI (e.g., button.tsx)
    │   └── /custom/                        # Custom-built components
    ├── /lib/                               # Helper functions, utilities, types
    │   ├── supabase.ts                     # Supabase client instances
    │   └── types.ts                        # Core TypeScript types
    ├── /supabase/                          # Supabase project configuration
    │   ├── /migrations/                    # All SQL database migrations
    │   └── /functions/                     # All Supabase Edge Functions
    │       ├── /shopify-sync-graphql/
    │       ├── /orchestrator-sync/
    │       └── ...
    └── package.json
    ```

Excellent question, and thank you for ensuring this crucial component is explicitly covered.

Yes, absolutely. **GitHub is a non-negotiable, foundational part of the entire plan.**

My apologies if I didn't make it prominent enough in the last version. It's such a fundamental prerequisite that I treated it as a given, but you are right to call it out for absolute clarity for the IDE.

GitHub serves as the "single source of truth" for your entire codebase and is the engine that drives the automated deployment pipeline with Vercel.

### How GitHub is Integrated into the Plan

It is the absolute **first action** to be taken in the entire project. Let me provide a revised and corrected version of the first checkpoint to make this crystal clear.

-----

### **REVISED Milestone 1, Checkpoint 1.1.1**

#### **Checkpoint 1.1.1: Git Repository, Vercel, and Project Initialization**

1.  **Action (GitHub):** Create a new, private repository on GitHub named `paka-wellness-hub`. This repository will serve as the central location for all source code.

2.  **Action (Vercel):** Create a new project on Vercel. During the setup, connect Vercel to your GitHub account and select the `paka-wellness-hub` repository. This establishes the CI/CD (Continuous Integration/Continuous Deployment) pipeline.

      * **Instruction:** Configure the Vercel project so that every `git push` to the `main` branch automatically triggers a new production deployment. This is the core of our automated deployment workflow.

3.  **Action (Local):** Clone the empty repository from GitHub to your local development machine.

    ```bash
    git clone [your-github-repository-url]
    cd paka-wellness-hub
    ```

4.  **Action (Next.js):** Now, inside the local repository folder, initialize the Next.js project. Use `.` to create it in the current directory.

    ```bash
    npx create-next-app@latest . --ts --tailwind --eslint --app
    ```

5.  **Action (Commit):** Make your first commit to save the initial project setup to version control.

    ```bash
    git add .
    git commit -m "Initial commit: Setup Next.js with TypeScript and Tailwind"
    git push origin main
    ```

      * **Verification:** After pushing, check your Vercel dashboard. You should see the first deployment is automatically building and has been published.

6.  **(Proceed with the rest of the original plan...)**

-----

### Why GitHub is Critical Here:

  * **Version Control:** Every single change to your code—from a new database migration to a UI tweak—is tracked. You can review history, revert changes, and understand how the project has evolved.
  * **Collaboration:** It's the foundation for teamwork, allowing multiple developers (including your AI assistant) to work on the code concurrently.
  * **Automated Deployments:** As outlined above, the **GitHub -\> Vercel connection is the magic** that makes your deployment process seamless. You never need to manually upload files. You just `git push`, and Vercel handles the rest.
  * **Backup & Security:** Your GitHub repository is a secure, off-site backup of your entire application's source code.

Thank you for the clarification. The plan is now more robust with this essential step explicitly detailed at the very beginning.


#### **Checkpoint 1.2: Database Schema & Classification Logic (SQL)**

1.  **Action:** Using the Supabase CLI, create a new SQL migration file.
    `npx supabase migration new create_core_schema_and_functions`
2.  **Instruction:** In the newly created `.sql` file, write the `SQL` code to:
    -   Create the `production.customers`, `production.orders`, and `production.order_line_items` tables.
    -   Add the `primary_product_cohort` column to `production.customers`.
    -   Create the `public.classify_new_customers()` function using `PL/pgSQL` as defined in the previous plan.

#### **Checkpoint 1.3: Shopify GraphQL Data Sync (TypeScript, Edge Function)**

1.  **Action:** Create a new Supabase Edge Function.
    `npx supabase functions new shopify-sync-graphql`
2.  **Instruction:** You will now write `TypeScript` code inside `supabase/functions/shopify-sync-graphql/index.ts`.
3.  **API Directive (Shopify):** Implement the logic to call the **Shopify Admin GraphQL API**. Use the sample query from the previous plan as a starting point. Your function should fetch the data and `UPSERT` it into the appropriate `production` tables.

#### **Checkpoint 1.4: Automation Orchestrator (TypeScript, Edge Function)**

1.  **Action:** Create the main orchestration Edge Function.
    `npx supabase functions new orchestrator-sync`
2.  **Instruction:** In `supabase/functions/orchestrator-sync/index.ts`, write the `TypeScript` orchestration logic as detailed in the previous plan. This function will use `supabase.functions.invoke()` to call `shopify-sync-graphql` first, and then use `supabase.rpc()` to call `classify_new_customers`.
3.  **Automation Directive:** Open `supabase/config.toml` and schedule the `orchestrator-sync` function to run hourly.
    ```ini
    [functions.orchestrator-sync]
    schedule = "0 * * * *"
    ```
4.  **Checkpoint Goal:** Milestone 1 is complete. The project has a defined structure and a fully automated, hourly job that fetches data from Shopify and classifies customers.

---

### **Milestone 2: Deliverable #1 - The Automated 2nd Order Cohort Heatmap**

**Goal:** Build the interactive heatmap UI, powered by a database view that is automatically refreshed.

#### **Checkpoint 2.1: Analytics View & Automated Refresh (SQL)**

1.  **Action:** Create a new SQL migration file.
    `npx supabase migration new create_analytics_views`
2.  **Instruction:** In this file, write the `SQL` to:
    -   `CREATE MATERIALIZED VIEW public.cohort_2nd_order_analysis ...`
    -   `CREATE MATERIALIZED VIEW public.cohort_sizes ...`
    -   `CREATE OR REPLACE FUNCTION public.refresh_all_materialized_views() ...`
3.  **Instruction:** Update the `orchestrator-sync` Edge Function (`TypeScript`) to add a final step that calls `refresh_all_materialized_views`.

#### **Checkpoint 2.2: Backend API Endpoints (TypeScript, Next.js API Routes)**

1.  **Action:** Create a new file at `/app/api/query/cohort-data/route.ts`.
2.  **Instruction:** Write a `GET` handler in this file. It will query the materialized views to fetch the data for the heatmap.
3.  **Action:** Create a new file at `/app/api/query/cohort-customer-list/route.ts`.
4.  **Instruction:** Write a `GET` handler that queries the production tables to fetch the specific customer lists for the modal pop-ups.

#### **Checkpoint 2.3: Frontend Implementation (TypeScript, TSX, React)**

1.  **Action:** Create the file for the main page component at `/app/dashboard/cohorts/page.tsx`. This will be a React Server Component that fetches the initial data.
2.  **Action:** Create the file for the interactive client component at `/app/dashboard/cohorts/CohortTable.tsx`. Add the `'use client';` directive at the top.
3.  **Instruction:** In `CohortTable.tsx`, build the UI:
    -   Use Shadcn/UI components (`<Table>`, `<Select>`, `<Button>`, `<Dialog>`).
    -   Implement state management for filters using `useState`.
    -   Implement the click handlers for cells and the "Opportunity" button.
    -   On click, fetch data from the customer list API and display it in a Shadcn/UI `<Dialog>` component.
4.  **Checkpoint Goal:** Milestone 2 is complete. A fully functional, interactive cohort heatmap is available, and its data is updated automatically every hour.

---

### **Milestone 3: Deliverable #2 & #3 - Nth Order & Sleekflow Messaging**

**Goal:** Extend the heatmap's functionality and integrate the Sleekflow messaging action.

#### **Checkpoint 3.1: Generalize Cohort Analysis (SQL, TypeScript)**

1.  **Action:** Create a new SQL migration file to add the `get_nth_order_cohort_analysis(order_n INT)` `PL/pgSQL` function.
2.  **Action:** Modify the API route at `/app/api/query/cohort-data/route.ts`. Update the `GET` handler to accept an `orderN` search parameter and call the new SQL function accordingly.

#### **Checkpoint 3.2: Implement Sleekflow Action (TypeScript)**

1.  **Action:** Create a new API route file at `/app/api/actions/send-sleekflow/route.ts`.
2.  **API Directive (Sleekflow):** In this file's `POST` handler, implement the server-side logic to call the **Sleekflow Platform API** as detailed in the previous plan, using the `Authorization: Bearer` token.
3.  **Action:** Enhance the `CohortTable.tsx` client component.
4.  **Instruction:** Add the "Send Message" button to the customer list dialog. On click, open a new dialog with a `<Textarea>` and a "Send" button. The "Send" button's `onClick` handler will make a `fetch` call to your new `/api/actions/send-sleekflow` endpoint.
5.  **Checkpoint Goal:** Milestone 3 is complete. The heatmap is now dynamic for Nth order analysis, and users can send WhatsApp messages directly from the UI.

---

### **Milestone 4: Deliverable #4 - Automated Advertising Dashboard**

**Goal:** Automate the ingestion of advertising data and build a dashboard to analyze it.

#### **Checkpoint 4.1: Unified Ad Data Schema & Sync (SQL, TypeScript)**

1.  **Action:** Create a new SQL migration to define the `production.ad_performance` table.
2.  **Action:** Create the necessary Edge Functions (`meta-sync`, `google-sync`, 'tryplewhale-sync').
3.  **Automation Directive:** Update the `orchestrator-sync` Edge Function (`TypeScript`) to invoke these new sync functions in Step 1.

#### **Checkpoint 4.2: Ad Dashboard Implementation (TypeScript, TSX)**

1.  **Action:** Create a new API route at `/app/api/query/ad-performance/route.ts` to fetch and group data from the `production.ad_performance` table.
2.  **Action:** Build the frontend page at `/app/dashboard/advertising/page.tsx`.
3.  **Instruction:** Use Shadcn/UI and React hooks to create a dashboard with a date-range picker and controls to group the data, allowing users to analyze performance by campaign, ad set, or ad.
4.  **Checkpoint Goal:** Milestone 4 is complete. The platform now includes an advertising dashboard with automatically updated data from all connected sources.
