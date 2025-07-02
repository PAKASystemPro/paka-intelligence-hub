# PAKA Intelligence Hub Frontend

This is the frontend for the PAKA Intelligence Hub, a customer cohort analysis and data visualization platform built with [Next.js](https://nextjs.org).

## Features

- **Cohort Analysis**: Interactive heatmap visualization of customer retention rates
- **Product Filtering**: Filter cohort data by product type
- **Customer Details**: View detailed customer information for each cohort
- **Data Export**: Export customer lists for marketing campaigns

## Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Configuration

This application connects to a Supabase database with the following configuration:

- Tables are in the `production` schema:
  - `production.customers`
  - `production.orders`
  - `production.order_line_items`

- Functions are in the `public` schema:
  - `public.get_test_cohort_heatmap`
  - `public.get_test_cohort_heatmap_by_product`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `/src/app` - Next.js app directory with pages and API routes
- `/src/components` - React components including the cohort heatmap
- `/src/lib` - Utility functions and Supabase client configuration

## Technology Stack

- **Next.js** - React framework for server-side rendering and API routes
- **React** - UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn UI** - Component library built on Radix UI
- **Supabase** - Database and authentication provider
