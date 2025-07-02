"use client";

import { useState } from 'react';
import CohortHeatmap from '@/components/cohort-heatmap';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CohortAnalysisPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">PAKA Cohort Analysis</h1>
      
      <div className="grid gap-6">
        <CohortHeatmap />
        
        <Card>
          <CardHeader>
            <CardTitle>About Cohort Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">
              This cohort analysis shows the percentage of customers who made a second purchase in the months following their first purchase.
              Each row represents a cohort of customers who made their first purchase in a specific month.
              The columns (m0-m11) show the percentage of those customers who made their second purchase in subsequent months.
            </p>
            <ul className="list-disc list-inside mt-4 text-gray-700">
              <li>m0: Same month as first purchase</li>
              <li>m1: One month after first purchase</li>
              <li>m2: Two months after first purchase</li>
              <li>And so on...</li>
            </ul>
            <p className="mt-4 text-gray-700">
              Click on any cell to see the list of customers in that cohort.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
