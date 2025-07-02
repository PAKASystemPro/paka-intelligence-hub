// Define types for our cohort data
export interface MonthlyData {
  count: number;
  percentage: number;
}

export interface CohortRow {
  cohort_month: string;
  primary_product_cohort: string;
  new_customers: number;
  total_second_orders: number;
  retention_percentage: number;
  monthly_data: {
    [key: string]: MonthlyData;
  };
}

export interface CohortResponse {
  cohorts: CohortRow[];
  grandTotal: {
    new_customers: number;
    total_second_orders: number;
    retention_percentage: number;
    monthly_data: {
      [key: string]: MonthlyData;
    };
  };
}

export interface Customer {
  id: string;
  shopify_customer_id: string;
  email: string;
  first_name: string;
  last_name: string;
  total_spent: number;
  orders_count: number;
  primary_product_cohort: string;
  created_at: string;
  updated_at: string;
}

export type ProductFilter = '深睡寶寶' | '天皇丸' | '皇后丸' | 'ALL';
