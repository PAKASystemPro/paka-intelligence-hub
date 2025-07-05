'use client';

import { useState, useEffect } from 'react';
import { CohortResponse, ProductFilter } from '@/lib/types';

export default function CohortTable() {
  const [productFilter, setProductFilter] = useState<ProductFilter>('ALL');
  const [cohortData, setCohortData] = useState<CohortResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Define the months for our columns (m0-m11)
  const months = Array.from({ length: 12 }, (_, i) => `m${i}`);

  // Fetch cohort data based on selected product filter
  useEffect(() => {
    async function fetchCohortData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/query/cohort-data?product=${productFilter}`);
        if (!response.ok) {
          throw new Error('Failed to fetch cohort data');
        }
        const data = await response.json();
        setCohortData(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An error occurred while fetching data');
        }
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCohortData();
  }, [productFilter]);

  // Helper function to get cell color based on relative contribution percentage
  const getCellColor = (contribution: number, maxContribution: number) => {
    if (contribution <= 0 || maxContribution <= 0) return 'bg-gray-100 text-black';

    const ratio = contribution / maxContribution;

    if (ratio < 0.1) return 'bg-violet-100';
    if (ratio < 0.25) return 'bg-violet-200';
    if (ratio < 0.4) return 'bg-violet-300';
    if (ratio < 0.6) return 'bg-violet-400';
    if (ratio < 0.8) return 'bg-violet-500 text-white';
    return 'bg-violet-600 text-white';
  };

  if (loading) {
    return <div className="text-center py-12">Loading cohort data...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (!cohortData || !cohortData.cohorts || cohortData.cohorts.length === 0) {
    return <div className="text-center py-10">No data available for the selected filter.</div>;
  }

  const grandTotalMonthly: { [key: string]: { count: number } } = {};
  months.forEach(month => {
    grandTotalMonthly[month] = { count: 0 };
  });

  cohortData.cohorts.forEach(cohort => {
    months.forEach(month => {
      grandTotalMonthly[month].count += cohort.monthly_data[month]?.count || 0;
    });
  });

  const grandTotalContributions = months.map(month => {
    const totalCount = grandTotalMonthly[month].count;
    return cohortData.grandTotal.total_second_orders > 0
      ? (totalCount / cohortData.grandTotal.total_second_orders) * 100
      : 0;
  });
  const maxGrandTotalContribution = Math.max(...grandTotalContributions);

  return (
    <div>
      <div className="flex flex-col items-start space-y-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-red-500">Weight % of RPR</span>
          <span className="text-blue-500 font-medium">• 2nd Order RPR %</span>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-full">
          <button
            onClick={() => setProductFilter('ALL')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${productFilter === 'ALL' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            全部
          </button>
          <button
            onClick={() => setProductFilter('深睡寶寶')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${productFilter === '深睡寶寶' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            深睡寶寶
          </button>
          <button
            onClick={() => setProductFilter('天皇丸')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${productFilter === '天皇丸' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            天皇丸
          </button>
          <button
            onClick={() => setProductFilter('皇后丸')}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${productFilter === '皇后丸' ? 'bg-white text-gray-900 shadow' : 'text-gray-600 hover:bg-gray-200'}`}>
            皇后丸
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Cohort</th>
              <th className="border border-gray-300 px-4 py-2">New Customer</th>
              <th className="border border-gray-300 px-4 py-2">Total 2nd Order Customer</th>
              <th className="border border-gray-300 px-4 py-2">Total 2nd Order RPR %</th>
              {months.map((month) => (
                <th key={month} className="border border-gray-300 px-4 py-2">
                  {month}
                </th>
              ))}
              <th className="border border-gray-300 px-4 py-2">Opportunity</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-50 font-bold">
              <td className="border border-gray-300 px-4 py-2">Grand Total</td>
              <td className="border border-gray-300 px-4 py-2 text-center">
                {cohortData.grandTotal.new_customers}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center">
                {cohortData.grandTotal.total_second_orders}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center text-blue-500">
                {cohortData.grandTotal.retention_percentage}%
              </td>
              {months.map((month) => {
                const totalCount = grandTotalMonthly[month].count;
                const totalPercentage = cohortData.grandTotal.new_customers > 0
                  ? ((totalCount / cohortData.grandTotal.new_customers) * 100).toFixed(2)
                  : 0;
                const totalContributionPercentageNumber = cohortData.grandTotal.total_second_orders > 0
                  ? (totalCount / cohortData.grandTotal.total_second_orders) * 100
                  : 0;
                const totalContributionPercentage = totalContributionPercentageNumber.toFixed(2);

                return (
                  <td key={`grand-total-${month}`} className={`border border-gray-300 px-4 py-2 text-center ${getCellColor(
                    totalContributionPercentageNumber,
                    maxGrandTotalContribution
                  )}`}>
                    {totalCount > 0 ? (
                      <>
                        <div>{totalCount}</div>
                        <div className="text-xs">({totalPercentage}%)</div>
                        <div className="text-xs text-red-500">[{totalContributionPercentage}%]</div>
                      </>
                    ) : (
                      <div>0</div>
                    )}
                  </td>
                );
              })}
              <td className="border border-gray-300 px-4 py-2"></td>
            </tr>
            {cohortData.cohorts
              .sort((a, b) => b.cohort_month.localeCompare(a.cohort_month))
              .map((cohort) => {
                const maxContributionInRow = Math.max(
                  ...months.map((month) => cohort.monthly_data[month]?.contribution_percentage || 0)
                );

                return (
                  <tr key={cohort.cohort_month}>
                    <td className="border border-gray-300 px-4 py-2 font-medium text-sm whitespace-nowrap">
                      {cohort.cohort_month}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {cohort.new_customers}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {cohort.total_second_orders}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center text-blue-500 font-medium">
                      {cohort.retention_percentage}%
                    </td>
                    {months.map((month) => {
                      const monthData = cohort.monthly_data[month];
                      const count = monthData?.count || 0;
                      const percentage = monthData?.percentage || 0;
                      const contributionPercentage = monthData?.contribution_percentage || 0;

                      return (
                        <td
                          key={`${cohort.cohort_month}-${month}`}
                          className={`border border-gray-300 px-4 py-2 text-center ${getCellColor(
                            contributionPercentage,
                            maxContributionInRow
                          )}`}
                        >
                          {count > 0 ? (
                            <>
                              <div>{count}</div>
                              <div className="text-xs">({percentage}%)</div>
                              <div className="text-xs text-red-500">[{contributionPercentage}%]</div>
                            </>
                          ) : (
                            <div>0</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <button
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded"
                        onClick={() => alert(`Opportunity for ${cohort.cohort_month} cohort`)}
                      >
                        Opportunity
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
