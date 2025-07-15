'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CohortTable, { CohortData } from '@/components/modules/CohortTable';
import FilterControls from '@/components/modules/FilterControls';
import SummaryCards, { SummaryData } from '@/components/modules/SummaryCards';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RetentionPage() {
  const [data, setData] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [n, setN] = useState(2);
  const [productFilter, setProductFilter] = useState('ALL');

  // Fetch data when N, Product Filter, or Year changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          n: n.toString(),
          productFilter,
          year, // Include year parameter in API request
        });
        const response = await fetch(`/api/analytics/retention?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const result = await response.json();
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [n, productFilter, year]); // Add year to dependency array

  // Calculate grand total and weight percentages from the API data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Calculate total retention for each cohort
    const dataWithTotalRetention = data.map(cohort => {
      const totalRetained = Object.values(cohort.retention).reduce((sum, count) => sum + count, 0);
      return { ...cohort, totalRetained };
    });
    
    // Calculate grand total values
    const grandTotalCustomers = dataWithTotalRetention.reduce((sum, cohort) => sum + cohort.total_customers, 0);
    const grandTotalRetained = dataWithTotalRetention.reduce((sum, cohort) => sum + cohort.totalRetained, 0);
    
    // Calculate weight percentages for each cell
    return dataWithTotalRetention.map(cohort => {
      const weightPercentage: Record<string, number> = {};
      
      Object.keys(cohort.retention).forEach(key => {
        const monthKey = key as keyof typeof cohort.retention;
        const count = cohort.retention[monthKey];
        weightPercentage[key] = grandTotalRetained > 0 
          ? (count / grandTotalRetained) * 100 
          : 0;
      });
      
      return {
        ...cohort,
        weight_percentage: weightPercentage as typeof cohort.retention
      };
    });
  }, [data]);

  // Calculate summary data for the cards
  const summaryData: SummaryData | null = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const total_customers = data.reduce((sum, cohort) => sum + cohort.total_customers, 0);
    const totalRetained = data.reduce((sum, cohort) => {
      return sum + Object.values(cohort.retention).reduce((monthSum, count) => monthSum + count, 0);
    }, 0);
    
    const totalRetentionPercentage = total_customers > 0 
      ? (totalRetained / total_customers) * 100 
      : 0;
    
    return {
      total_customers,
      totalRetained,
      totalRetentionPercentage,
      n
    };
  }, [data, n]);

  /**
   * Handle cell click in the cohort table
   * @param cohortMonth The cohort month (YYYY-MM format)
   * @param monthDiff The month difference (0-12)
   */
  const handleCellClick = (cohortMonth: string, monthDiff: number) => {
    console.log(`Cell clicked: Cohort ${cohortMonth}, Month Difference: ${monthDiff}`);
    // We'll add the dialog logic in the next step
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Cohort Retention Analysis</h1>
      
      {/* Summary Cards - Commented out for now
      {summaryData && !loading && !error && (
        <SummaryCards data={summaryData} />
      )}
      */}
      
      <FilterControls 
        year={year}
        n={n}
        productFilter={productFilter}
        onFilterChange={(filterName, value) => {
          if (filterName === 'year') setYear(value as string);
          if (filterName === 'n') setN(value as number);
          if (filterName === 'productFilter') setProductFilter(value as string);
        }}
      />

      <div className="mt-6">
        {loading ? (
          <Card>
            <CardContent className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading cohort data...</span>
            </CardContent>
          </Card>
        ) : error ? (
          <p className="text-red-500 text-center py-4">Error: {error}</p>
        ) : data.length === 0 ? (
          <p className="text-center py-4">No cohort data available for the selected filters.</p>
        ) : (
          <div className="border rounded-lg shadow-sm overflow-hidden">
            <CohortTable 
              data={processedData} 
              onCellClick={handleCellClick}
              n={n}
            />
          </div>
        )}
      </div>
      
      {/* Cohort Analysis Definition */}
      <blockquote className="mt-8 border-l-4 border-gray-300 pl-4 text-gray-600 italic">
        <p>
          Cohort analysis tracks groups of customers who made their first purchase in the same period, 
          showing how many make subsequent purchases over time. This helps identify which customer 
          segments have the highest retention rates and which products drive repeat business.
        </p>
      </blockquote>
    </div>
  );
}