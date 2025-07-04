# PAKA Intelligence Hub: Verified Cohort Analysis Logic

## Overview

This document outlines the strict, verified logic for performing cohort analysis on customer data. This methodology was established to ensure calculations are accurate and align closely with reference benchmarks. The logic defined here forms the basis for all cohort-related reporting and materialized views.

## Core Principles

### 1. Defining a New Customer Cohort

A customer is assigned to a specific cohort (e.g., "2025-01") if and only if they meet two strict conditions:
- The customer's account creation date (`customers.created_at`) falls within the cohort's calendar month.
- The customer's first-ever order date (`orders.processed_at`) also falls within that same calendar month.

This dual condition ensures that we only count customers who are genuinely new and made their first purchase in the same period, providing a precise cohort definition.

### 2. Tracking Subsequent Orders (Nth Order Logic)

Customer retention and repeat purchases are tracked using the `customers.orders_count` field, which maintains a cumulative count of a customer's total orders.

- **2nd Order Customer**: A customer is considered to have made a second order if their `orders_count >= 2`.
- **3rd Order Customer**: A customer is considered to have made a third order if their `orders_count >= 3`.
- **Nth Order Customer**: This logic extends to any Nth order, where a customer must have an `orders_count >= N`.

## Key Metrics and Calculation Formulas

Based on the core principles, we calculate the following key retention metrics.

### 1. New Customer Count

- **Definition**: The total number of unique customers who meet the strict cohort definition for a given month.
- **Purpose**: Forms the baseline population for each cohort.

### 2. Second Order Repurchase Rate (2nd Order RPR%)

- **Formula**: `(Number of customers in cohort with >= 2 orders) / (Total new customers in cohort) * 100%`
- **Purpose**: Measures the initial retention of new customers. It answers: "What percentage of new customers in a cohort came back for a second purchase?"

### 3. Third Order Repurchase Rate (3rd Order RPR%)

- **Formula**: `(Number of customers in cohort with >= 3 orders) / (Number of customers in cohort with >= 2 orders) * 100%`
- **Purpose**: Measures deeper engagement and loyalty among customers who have already made a second purchase. It answers: "Of the customers who came back for a second time, what percentage came back for a third?"

## Verification Scripts

The logic and formulas described in this document have been implemented and verified using the following utility scripts. These scripts calculate metrics from scratch using the raw `customers` and `orders` tables and serve as the source of truth.

- `scripts/utils/calculate-new-customers-strict.js`: Verifies the count of new customers per cohort.
- `scripts/utils/calculate-second-orders-strict.js`: Verifies the count of customers with at least two orders per cohort.
- `scripts/utils/calculate-retention-rate.js`: Calculates the 2nd Order RPR%.
- `scripts/utils/calculate-3rd-order-retention.js`: Calculates the 3rd Order RPR%.

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
