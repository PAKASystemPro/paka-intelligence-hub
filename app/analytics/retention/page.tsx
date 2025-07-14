'use client';

import React, { useState, useEffect, useMemo } from 'react';
import CohortTable from '@/components/modules/CohortTable';
import FilterControls from '@/components/modules/FilterControls';

export default function RetentionPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for filters
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [n, setN] = useState(2);
  const [productFilter, setProductFilter] = useState('ALL');

  // Fetch data only when N or Product Filter changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          n: n.toString(),
          productFilter,
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
  }, [n, productFilter]);

  // Filter the data locally when the year changes. This is fast.
  const filteredData = useMemo(() => {
    if (!year) return data;
    return data.filter(cohort => cohort.cohort_month.startsWith(year));
  }, [data, year]);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Cohort Retention Analysis</h1>
      
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

      <div>
        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && <CohortTable data={filteredData} />}
      </div>
    </div>
  );
}