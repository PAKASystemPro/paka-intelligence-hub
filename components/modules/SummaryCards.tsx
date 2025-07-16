import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface SummaryData {
  total_customers: number;
  totalRetained: number;
  totalRetentionPercentage: number;
  n: number;
}

interface SummaryCardsProps {
  data: SummaryData;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (num: number): string => {
  if (num >= 11 && num <= 13) return 'th';
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export default function SummaryCards({ data }: SummaryCardsProps) {
  const prevOrderLabel = `${data.n-1}${getOrdinalSuffix(data.n-1)} Order`;
  const currOrderLabel = `${data.n}${getOrdinalSuffix(data.n)} Order`;

  return (
    <div className="grid grid-cols-3 gap-0 mb-0">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total {prevOrderLabel} Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.total_customers.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total {currOrderLabel} Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.totalRetained.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Retention %
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.totalRetentionPercentage.toFixed(1)}%</div>
        </CardContent>
      </Card>
    </div>
  );
}
