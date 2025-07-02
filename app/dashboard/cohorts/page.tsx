import { Suspense } from 'react';
import CohortTable from './CohortTable';

export const metadata = {
  title: 'Customer Cohort Analysis',
  description: '2nd Order Retention Cohort Analysis for PAKA Wellness',
};

export default function CohortAnalysisPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">2025 Customer Cohort Heatmap</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">2nd Order Retention Cohort Table (m0-m11)</h2>
        
        <Suspense fallback={<div className="text-center py-12">Loading cohort data...</div>}>
          <CohortTable />
        </Suspense>
        
        <div className="mt-4 text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()} UTC
        </div>
      </div>
    </div>
  );
}
