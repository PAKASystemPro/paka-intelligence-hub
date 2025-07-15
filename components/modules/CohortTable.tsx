"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Define the structure of a single cohort data object
export interface CohortData {
  cohort_month: string;
  total_customers: number;
  retention: {
    [key: string]: number;
  };
  totalRetained?: number;
  retentionPercentage?: number;
  weight_percentage?: {
    [key: string]: number;
  };
}

interface CohortTableProps {
  data: CohortData[];
  onCellClick?: (cohortMonth: string, monthIndex: number) => void;
  n: number;
  title?: string;
}

export default function CohortTable({ data, onCellClick, n, title = 'Cohort Retention Analysis' }: CohortTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  // Get all unique month keys from all cohorts
  const allMonthKeys = Array.from(
    new Set(
      data.flatMap(cohort => 
        Object.keys(cohort.retention)
      )
    )
  ).sort();

  // Calculate total retention for each cohort if not already calculated
  const dataWithTotalRetention = data.map(cohort => {
    if (cohort.totalRetained !== undefined) {
      return cohort;
    }
    
    const totalRetained = Object.values(cohort.retention).reduce((sum, count) => sum + count, 0);
    const retentionPercentage = cohort.total_customers > 0 
      ? (totalRetained / cohort.total_customers) * 100 
      : 0;
    
    return {
      ...cohort,
      totalRetained,
      retentionPercentage
    };
  });

  // Calculate grand total retention percentage
  const grandTotal: CohortData = {
    cohort_month: 'Grand Total',
    total_customers: 0,
    retention: {},
    totalRetained: 0,
    retentionPercentage: 0,
    weight_percentage: {}
  };
  
  // Populate grand total data
  dataWithTotalRetention.forEach(cohort => {
    grandTotal.total_customers += cohort.total_customers;
    grandTotal.totalRetained = (grandTotal.totalRetained || 0) + (cohort.totalRetained || 0);
    
    // Sum up retention by month
    Object.entries(cohort.retention).forEach(([month, value]) => {
      grandTotal.retention[month] = (grandTotal.retention[month] || 0) + value;
    });
  });
  
  // Calculate retention percentage for grand total
  grandTotal.retentionPercentage = grandTotal.total_customers > 0
    ? ((grandTotal.totalRetained || 0) / grandTotal.total_customers) * 100
    : 0;

  // Calculate weight percentages for each cell
  const dataWithWeightPercentage = dataWithTotalRetention.map(cohort => {
    const weightPercentage: Record<string, number> = {};
    
    Object.entries(cohort.retention).forEach(([month, value]) => {
      const totalForMonth = dataWithTotalRetention.reduce((sum, c) => {
        return sum + (c.retention[month] || 0);
      }, 0);
      
      weightPercentage[month] = totalForMonth > 0 ? (value / totalForMonth) * 100 : 0;
    });
    
    return {
      ...cohort,
      weight_percentage: weightPercentage
    };
  });

  // Calculate weight percentages for grand total
  const grandTotalWithWeight: CohortData = {
    ...grandTotal,
    weight_percentage: {}
  };
  
  // Grand total weight is always 100% for each month
  Object.keys(grandTotal.retention).forEach(month => {
    if (grandTotalWithWeight.weight_percentage) {
      grandTotalWithWeight.weight_percentage[month] = 100;
    }
  });

  // Function to get background and text colors based on percentage value
  const getColorsForPercentage = (percentage: number): { bg: string; text: string } => {
    // Violet color scale from light to dark with corresponding text colors
    if (percentage <= 0) return { bg: '#ffffff', text: '#000000' };
    if (percentage < 5) return { bg: '#f5f3ff', text: '#000000' }; // violet-50
    if (percentage < 10) return { bg: '#ede9fe', text: '#000000' }; // violet-100
    if (percentage < 20) return { bg: '#ddd6fe', text: '#000000' }; // violet-200
    if (percentage < 30) return { bg: '#c4b5fd', text: '#000000' }; // violet-300
    if (percentage < 40) return { bg: '#a78bfa', text: '#000000' }; // violet-400
    if (percentage < 50) return { bg: '#8b5cf6', text: '#ffffff' }; // violet-500
    if (percentage < 60) return { bg: '#7c3aed', text: '#ffffff' }; // violet-600
    if (percentage < 70) return { bg: '#6d28d9', text: '#ffffff' }; // violet-700
    if (percentage < 80) return { bg: '#5b21b6', text: '#ffffff' }; // violet-800
    return { bg: '#4c1d95', text: '#ffffff' }; // violet-900
  };

  // Function to get background color based on weight percentage
  const getWeightBackgroundStyle = (percentage: number): string => {
    if (percentage <= 0) return 'none';
    
    // Calculate opacity based on percentage (max 0.3 opacity)
    let opacity = Math.min(percentage / 100, 0.3);
    
    // Ensure minimum visibility if there's any percentage
    if (percentage > 0 && opacity < 0.05) {
      opacity = 0.05;
    }
    
    return `rgba(139, 92, 246, ${opacity})`; // Tailwind violet-500
  };

  // Function to determine if a cell is hovered (for row/column highlighting)
  const isCellHighlighted = (cohortMonth: string, monthKey: string): boolean => {
    return hoveredRow === cohortMonth || hoveredColumn === monthKey;
  };

  // Month columns to display
  const monthColumns = allMonthKeys.map(key => {
    const monthIndex = parseInt(key.substring(1));
    let label = `M${monthIndex}`;
    
    if (monthIndex === 0) {
      label = 'Same Month';
    } else if (monthIndex === 1) {
      label = 'Next Month';
    }
    
    return { key, label };
  });

  // Helper function to get ordinal suffix
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  // Labels for the columns
  const prevOrderLabel = `Total ${n-1}${getOrdinalSuffix(n-1)} Order Customers`;
  const currOrderLabel = `Total ${n}${getOrdinalSuffix(n)} Order Customers`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px] sticky left-0 bg-background [&>svg]:hidden">Cohort Month</TableHead>
                <TableHead className="text-right [&>svg]:hidden">{prevOrderLabel}</TableHead>
                <TableHead className="text-right [&>svg]:hidden">{currOrderLabel}</TableHead>
                <TableHead className="text-right [&>svg]:hidden">Total Retention %</TableHead>
                {monthColumns.map(month => (
                  <TableHead 
                    key={month.key} 
                    className="text-right [&>svg]:hidden"
                    onMouseEnter={() => setHoveredColumn(month.key)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Grand Total Row */}
              <TableRow 
                className="bg-slate-100"
                onMouseEnter={() => setHoveredRow(grandTotalWithWeight.cohort_month)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <TableCell className="font-bold sticky left-0 bg-slate-100 z-10">{grandTotalWithWeight.cohort_month}</TableCell>
                <TableCell className="font-bold text-right">{grandTotalWithWeight.total_customers.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-right">{grandTotalWithWeight.totalRetained?.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-right">{grandTotalWithWeight.retentionPercentage?.toFixed(1)}%</TableCell>
                {monthColumns.map(month => (
                  <TableCell 
                    key={month.key} 
                    className="text-right font-bold"
                    onMouseEnter={() => setHoveredColumn(month.key)}
                    onMouseLeave={() => setHoveredColumn(null)}
                  >
                    {grandTotalWithWeight.retention[month.key] || 0}
                  </TableCell>
                ))}
              </TableRow>
              {dataWithWeightPercentage.map((cohort) => {
                const isRowHovered = hoveredRow === cohort.cohort_month;
                const retentionPercentage = cohort.totalRetained !== undefined && cohort.total_customers > 0 
                  ? (cohort.totalRetained / cohort.total_customers) * 100 
                  : 0;
                
                return (
                  <TableRow 
                    key={cohort.cohort_month} 
                    className={cn(
                      isRowHovered ? 'bg-muted/50' : '',
                      'transition-colors duration-200'
                    )}
                    onMouseEnter={() => setHoveredRow(cohort.cohort_month)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <TableCell className="font-medium sticky left-0 bg-background">{cohort.cohort_month}</TableCell>
                    <TableCell className="text-right">{cohort.total_customers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{cohort.totalRetained?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-right">
                      {retentionPercentage.toFixed(1)}%
                    </TableCell>
                    {monthColumns.map(month => {
                      const value = cohort.retention[month.key] || 0;
                      const percentage = cohort.total_customers > 0 
                        ? (value / cohort.total_customers) * 100 
                        : 0;
                      const weightPercentage = cohort.weight_percentage?.[month.key] || 0;
                      const isColumnHovered = hoveredColumn === month.key;
                      
                      return (
                        <TableCell 
                          key={month.key} 
                          className={cn(
                            "text-right cursor-pointer p-0 overflow-hidden",
                            (isRowHovered || isColumnHovered) ? 'ring-1 ring-inset ring-violet-300' : ''
                          )}
                          onClick={() => onCellClick && onCellClick(cohort.cohort_month, parseInt(month.key.substring(1)))}
                          onMouseEnter={() => setHoveredColumn(month.key)}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          <div 
                        className="p-4 h-full w-full flex flex-col justify-center items-end transition-colors"
                        style={{
                          backgroundColor: getColorsForPercentage(percentage).bg
                        }}
                      >
                        <div style={{ color: getColorsForPercentage(percentage).text }} className="font-medium">
                          {percentage.toFixed(1)}%
                        </div>
                        <div style={{ color: getColorsForPercentage(percentage).text }} className="text-xs opacity-80">
                          ({value})
                        </div>
                        {weightPercentage > 0 && (
                          <div style={{ color: getColorsForPercentage(percentage).text }} className="text-xs opacity-60">
                            [{weightPercentage.toFixed(1)}%]
                          </div>
                        )}
                      </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
