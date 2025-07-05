export type ProductFilter = 'ALL' | '深睡寶寶' | '天皇丸' | '皇后丸';

interface MonthlyData {
  count: number;
  percentage: number;
  contribution_percentage: number;
}

interface Cohort {
  cohort_month: string;
  new_customers: number;
  total_second_orders: number;
  retention_percentage: number;
  monthly_data: {
    [key: string]: MonthlyData | undefined;
  };
}

interface GrandTotal {
  new_customers: number;
  total_second_orders: number;
  retention_percentage: number;
}

export interface CohortResponse {
  cohorts: Cohort[];
  grandTotal: GrandTotal;
}
