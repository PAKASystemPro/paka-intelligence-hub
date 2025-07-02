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
        setError(err.message || 'An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchCohortData();
  }, [productFilter]);

  // Helper function to get cell color based on percentage
  const getCellColor = (percentage: number) => {
    if (percentage === 0) return 'bg-gray-100';
    if (percentage < 10) return 'bg-blue-100';
    if (percentage < 20) return 'bg-blue-200';
    if (percentage < 30) return 'bg-blue-300';
    if (percentage < 40) return 'bg-blue-400';
    if (percentage < 50) return 'bg-blue-500 text-white';
    return 'bg-blue-600 text-white';
  };

  if (loading) {
    return <div className="text-center py-12">Loading cohort data...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error}</div>;
  }

  if (!cohortData) {
    return <div className="text-center py-12">No data available</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-2">
          <span className="font-medium">Weight % of 2nd Order RPR</span>
          <span className="text-blue-500 font-medium">• 2nd Order RPR %</span>
        </div>
        <div>
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value as ProductFilter)}
            className="border rounded px-3 py-1"
          >
            <option value="ALL">全部</option>
            <option value="深睡寶寶">深睡寶寶</option>
            <option value="天皇丸">天皇丸</option>
            <option value="皇后丸">皇后丸</option>
          </select>
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
            {cohortData.cohorts.map((cohort) => (
              <tr key={cohort.cohort_month}>
                <td className="border border-gray-300 px-4 py-2 font-medium">
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
                  
                  return (
                    <td 
                      key={`${cohort.cohort_month}-${month}`} 
                      className={`border border-gray-300 px-4 py-2 text-center ${getCellColor(percentage)}`}
                    >
                      {count > 0 ? (
                        <>
                          <div>{count}</div>
                          <div className="text-xs">({percentage}%)</div>
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
            ))}
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
              {months.map((month) => (
                <td key={`grand-total-${month}`} className="border border-gray-300 px-4 py-2 text-center">
                  -
                </td>
              ))}
              <td className="border border-gray-300 px-4 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
