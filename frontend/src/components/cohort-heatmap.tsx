'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CustomerListDialog, { Customer } from './CustomerListDialog';
import { Cohort, CohortResponse, ProductFilter } from '@/lib/types';

const months = Array.from({ length: 12 }, (_, i) => `m${i}`);

const getOrdinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function CohortHeatmap() {
  const [cohortData, setCohortData] = useState<CohortResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<ProductFilter>('ALL');
  const [nthOrder, setNthOrder] = useState(2);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogData, setDialogData] = useState<Customer[]>([]);
  const [dialogTitle, setDialogTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/query/cohort-analysis?product_filter=${productFilter}&nth_order=${nthOrder}`);
        const data = await response.json();

        if (nthOrder > 2) {
          const prevResponse = await fetch(`/api/query/cohort-analysis?product_filter=${productFilter}&nth_order=${nthOrder-1}`);
          const prevData = await prevResponse.json();

          data.cohorts = data.cohorts.map((cohort: { cohort_month: string; total_nth_orders: number; new_customers: number; retention_percentage: number; monthly_data: Record<string, { count: number; percentage: number; contribution_percentage: number } | undefined>; opportunity_count: number }) => {
            const prevCohort = prevData.cohorts.find((c: { cohort_month: string; total_nth_orders: number }) => c.cohort_month === cohort.cohort_month);
            if (prevCohort) {
              return {
                ...cohort,
                new_customers: prevCohort.total_nth_orders
              };
            }
            return cohort;
          });

          if (data.grandTotal && prevData.grandTotal) {
            data.grandTotal.new_customers = prevData.grandTotal.total_nth_orders;
          }
        }

        setCohortData(data);
      } catch (error) {
        console.error('Error fetching cohort data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productFilter, nthOrder]);

  const handleCellClick = async (cohortMonth: string, dataMonth: string) => {
    try {
      const response = await fetch(`/api/query/cohort-customers?cohort_month=${cohortMonth}&data_month=${dataMonth}&product_filter=${productFilter}&nth_order=${nthOrder}`);
      const data = await response.json();
      const customers: Customer[] = Array.isArray(data) ? data : [];
      setDialogData(customers);
      setDialogTitle(`Customers for Cohort ${cohortMonth.substring(0, 7)} - ${dataMonth}`);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch customer data', error);
    }
  };

  const handleOpportunityClick = async (cohortMonth: string) => {
    try {
      const response = await fetch(`/api/query/cohort-opportunity-customers?cohort_month=${cohortMonth}&product_filter=${productFilter}&nth_order=${nthOrder}`);
      const data = await response.json();
      const customers: Customer[] = Array.isArray(data) ? data : [];
      setDialogData(customers);
      setDialogTitle(`Opportunity Customers for Cohort ${cohortMonth.substring(0, 7)} (No ${getOrdinal(nthOrder)} Purchase)`);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Failed to fetch opportunity customer data', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!cohortData) return <div>No data available.</div>;

  // Initialize grandTotalMonthly with all months
  const grandTotalMonthly = months.reduce((acc, month) => {
    acc[month] = { count: 0 };
    return acc;
  }, {} as { [key: string]: { count: number } });

  // Safely populate grandTotalMonthly from cohort data
  cohortData.cohorts.forEach((cohort: Cohort) => {
    if (!cohort.monthly_data) return; // Skip if monthly_data is undefined
    
    months.forEach(month => {
      if (cohort.monthly_data && cohort.monthly_data[month]) {
        grandTotalMonthly[month].count += cohort.monthly_data[month]!.count;
      }
    });
  });

  const maxGrandTotalContribution = Math.max(...Object.values(grandTotalMonthly).map(m => {
    return cohortData.grandTotal.total_nth_orders > 0
      ? (m.count / cohortData.grandTotal.total_nth_orders) * 100
      : 0;
  }));

  const getCellColor = (contribution: number, maxContribution: number) => {
    if (contribution <= 0 || maxContribution <= 0) return 'bg-white';
    const intensity = Math.min(1, contribution / maxContribution);
    if (intensity > 0.66) return 'bg-blue-500 text-white';
    if (intensity > 0.33) return 'bg-blue-300';
    return 'bg-blue-100';
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-sm">
      <CustomerListDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        customers={dialogData}
        title={dialogTitle}
      />
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Cohort Analysis</h2>
          <p className="text-gray-500">Monthly retention analysis showing {getOrdinal(nthOrder)} order rates by cohort</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Order:</label>
            <Select value={nthOrder.toString()} onValueChange={(value) => setNthOrder(parseInt(value, 10))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Select Order" />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5].map(order => (
                  <SelectItem key={order} value={order.toString()}>{getOrdinal(order)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex space-x-2">
            {['ALL', '深睡寶寶', '天皇丸', '皇后丸'].map((filter) => (
              <Button
                key={filter}
                variant={productFilter === filter ? 'default' : 'outline'}
                onClick={() => setProductFilter(filter as ProductFilter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b-gray-300">
              <TableHead className="text-left font-semibold">Cohort</TableHead>
              <TableHead className="text-left font-semibold">
                {nthOrder === 2 ? 'New Customers' : `${getOrdinal(nthOrder-1)} Order Customers`}
              </TableHead>
              <TableHead className="text-left font-semibold">{getOrdinal(nthOrder)} Orders</TableHead>
              <TableHead className="text-left font-semibold">Retention %</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-center font-semibold">{month}</TableHead>
              ))}
              <TableHead className="text-center font-semibold">Opportunity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="bg-gray-100 font-bold">
              <TableCell className="text-left">Grand Total</TableCell>
              <TableCell className="text-left">{cohortData.grandTotal.new_customers}</TableCell>
              <TableCell className="text-left">{cohortData.grandTotal.total_nth_orders}</TableCell>
              <TableCell className="text-left">{cohortData.grandTotal.retention_percentage}%</TableCell>
              {months.map(month => {
                // Safely access grandTotalMonthly with fallback
                const totalCount = grandTotalMonthly[month]?.count || 0;
                
                // Ensure we have valid values for calculations
                const newCustomers = cohortData.grandTotal?.new_customers || 0;
                const totalNthOrders = cohortData.grandTotal?.total_nth_orders || 0;
                
                const totalPercentage = newCustomers > 0
                  ? ((totalCount / newCustomers) * 100).toFixed(2)
                  : '0.00';
                const totalContributionPercentage = totalNthOrders > 0
                  ? ((totalCount / totalNthOrders) * 100).toFixed(2)
                  : '0.00';
                const totalContributionPercentageNumber = parseFloat(totalContributionPercentage);

                return (
                  <TableCell key={`grand-total-${month}`} className={`text-center ${getCellColor(
                    totalContributionPercentageNumber,
                    maxGrandTotalContribution
                  )}`}>
                    {
                      totalCount > 0 ? (
                        <>
                          <div>{totalCount}</div>
                          <div className="text-xs">({totalPercentage}%)</div>
                          <div className="text-xs text-red-500">[{totalContributionPercentage}%]</div>
                        </>
                      ) : (
                        <div>-</div>
                      )
                    }
                  </TableCell>
                );
              })}
              <TableCell className="text-center"></TableCell>
            </TableRow>
            {cohortData.cohorts
              .sort((a, b) => b.cohort_month.localeCompare(a.cohort_month))
              .map((cohort) => {
                // Ensure monthly_data exists before accessing it
                const monthlyData = cohort.monthly_data || {};
                const maxContributionInRow = Math.max(...Object.values(monthlyData).map(m => m?.contribution_percentage || 0));

                return (
                  <TableRow key={cohort.cohort_month} className="hover:bg-gray-50">
                    <TableCell className="font-medium text-left">{cohort.cohort_month.substring(0, 7)}</TableCell>
                    <TableCell className="text-left">{cohort.new_customers}</TableCell>
                    <TableCell className="text-left">{cohort.total_nth_orders}</TableCell>
                    <TableCell className="text-left">{cohort.retention_percentage}%</TableCell>
                    {months.map((month) => {
                      // Safely access monthly data with proper null checks
                      const monthlyData = cohort.monthly_data || {};
                      const monthData = monthlyData[month];
                      const count = monthData?.count || 0;
                      const percentage = monthData?.percentage || 0;
                      const contributionPercentage = monthData?.contribution_percentage || 0;

                      return (
                        <TableCell
                          key={`${cohort.cohort_month}-${month}`}
                          className={`text-center ${getCellColor(
                            contributionPercentage,
                            maxContributionInRow
                          )}`}
                          onClick={() => handleCellClick(cohort.cohort_month, month)}
                        >
                          {count > 0 ? (
                            <>
                              <div>{count}</div>
                              <div className="text-xs">({percentage}%)</div>
                              <div className="text-xs text-red-500">[{contributionPercentage}%]</div>
                            </>
                          ) : (
                            <div>-</div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <Button
                        variant="link"
                        className="p-0 h-auto text-blue-500"
                        onClick={() => handleOpportunityClick(cohort.cohort_month)}
                      >
                        {cohort.opportunity_count}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 p-4 border-t border-gray-200">
        <h3 className="font-semibold mb-2">Legend:</h3>
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span><span className="font-bold">16%</span> - Retention percentage (% of new customers)</span>
          <span><span className="font-bold">(23)</span> - Actual customer count</span>
          <span><span className="font-bold text-red-500">[35%]</span> - Weight contribution to retention rate</span>
        </div>
      </div>
    </div>
  );
}
