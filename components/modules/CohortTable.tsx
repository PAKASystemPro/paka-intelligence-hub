"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Head from 'next/head';

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
  onOpportunityClick?: (cohortMonth: string, n: number) => void;
  n: number;
  title?: string;
  dataPeriod?: string | null;
}

// Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
const getOrdinalSuffix = (num: number): string => {
  if (num % 100 >= 11 && num % 100 <= 13) {
    return 'th';
  }
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export default function CohortTable({ data, onCellClick, onOpportunityClick, n, title = 'Cohort Retention Analysis', dataPeriod }: CohortTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  // Define month keys in the correct chronological order
  const orderedMonthKeys = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12_plus'];

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

  // Calculate weight percentages for each cell (as percentage of row total retention)
  const dataWithWeightPercentage = dataWithTotalRetention.map(cohort => {
    const weightPercentage: Record<string, number> = {};
    const totalRetained = cohort.totalRetained || 0;
    
    Object.entries(cohort.retention).forEach(([month, value]) => {
      // Calculate weight as percentage of row total retention (not column total)
      weightPercentage[month] = totalRetained > 0 ? (value / totalRetained) * 100 : 0;
    });
    
    return {
      ...cohort,
      weight_percentage: weightPercentage
    };
  });

  // Calculate weight percentages for grand total (same calculation as cohort rows)
  const grandTotalWithWeight: CohortData = {
    ...grandTotal,
    weight_percentage: {}
  };
  
  // Calculate weight percentages for grand total the same way as cohort rows
  const totalRetained = grandTotal.totalRetained || 0;
  Object.entries(grandTotal.retention).forEach(([month, value]) => {
    if (grandTotalWithWeight.weight_percentage) {
      grandTotalWithWeight.weight_percentage[month] = totalRetained > 0 ? (value / totalRetained) * 100 : 0;
    }
  });

  // Function to get background and text colors based on retention percentage
  const getColorsForPercentage = (percentage: number, weightPercentage: number): { bg: string; text: string } => {
    // Use purple color scale as requested in the reference image
    if (percentage === 0) {
      return { bg: 'white', text: 'black' };
    } else if (percentage < 5) {
      return { bg: '#f3f0ff', text: 'black' }; // Lightest purple
    } else if (percentage < 10) {
      return { bg: '#e9e3ff', text: 'black' }; // Very light purple
    } else if (percentage < 20) {
      return { bg: '#d4c8ff', text: 'black' }; // Light purple
    } else if (percentage < 30) {
      return { bg: '#b39ddb', text: 'black' }; // Light-medium purple
    } else if (percentage < 40) {
      return { bg: '#9575cd', text: 'white' }; // Medium purple
    } else if (percentage < 50) {
      return { bg: '#7e57c2', text: 'white' }; // Medium-dark purple
    } else if (percentage < 60) {
      return { bg: '#673ab7', text: 'white' }; // Dark purple
    } else if (percentage < 70) {
      return { bg: '#5e35b1', text: 'white' }; // Darker purple
    } else if (percentage < 80) {
      return { bg: '#512da8', text: 'white' }; // Very dark purple
    } else {
      return { bg: '#4527a0', text: 'white' }; // Deepest purple
    }
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
  const monthColumns = orderedMonthKeys.map(key => {
    const monthIndex = key === 'm12_plus' ? 12 : parseInt(key.substring(1));
    let label = `M${monthIndex}`;
    
    // Rename 'Same Month' to 'm0' and 'Next Month' to 'm1' as requested
    if (key === 'm12_plus') {
      label = 'M12+';
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
        <div className="flex justify-between items-start">
          <CardTitle>{title}</CardTitle>
          {dataPeriod && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Data as of:</span> {dataPeriod}
            </div>
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-6 mt-3">
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-blue-500 mr-1"></div>
              <span className="text-sm font-medium">Weight %</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded-full bg-red-500 mr-1"></div>
              <span className="text-sm font-medium text-blue-600">Retention RPR %</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-b"> {/* Header row */}
                <TableHead className="sticky left-0 bg-muted/50">Cohort Month</TableHead>
                <TableHead className="text-left">
                  {n === 2 ? 'New Customers' : `${n-1}${getOrdinalSuffix(n-1)} Order Customers`}
                </TableHead>
                <TableHead className="text-left">Total Retention</TableHead>
                <TableHead className="text-left">Retention %</TableHead>
                <TableHead className="text-center">Opportunity</TableHead>
                {monthColumns.map(month => (
                  <TableHead 
                    key={month.key} 
                    className="text-left [&>svg]:hidden"
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
              <TableRow className="bg-muted/30">  {/* Grand Total row with light gray background */}
                <TableCell className="font-medium sticky left-0 bg-muted/30">Grand Total</TableCell>
                <TableCell className="font-bold text-right">{grandTotalWithWeight.total_customers.toLocaleString()}</TableCell>
                <TableCell className="font-bold text-right">{grandTotalWithWeight.totalRetained?.toLocaleString() || 0}</TableCell>
                <TableCell className="font-bold text-right">
                  {grandTotalWithWeight.retentionPercentage?.toFixed(1)}%
                </TableCell>
                <TableCell className="text-center">
                  {/* No opportunity button for Grand Total */}
                </TableCell>
                {monthColumns.map(month => (
                  <TableCell 
                    key={month.key} 
                    className="text-right cursor-pointer p-0 overflow-hidden"
                    onMouseEnter={() => setHoveredColumn(month.key)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    onClick={() => onCellClick && onCellClick('Grand Total', parseInt(month.key.substring(1)))}
                  >
                    <div 
                      className="p-4 h-full w-full flex flex-col justify-center items-end transition-colors"
                      style={{
                        backgroundColor: getColorsForPercentage(
                          grandTotal.total_customers > 0 ? (grandTotal.retention[month.key] || 0) / grandTotal.total_customers * 100 : 0,
                          grandTotalWithWeight.weight_percentage?.[month.key] || 0
                        ).bg
                      }}
                    >
                      {/* Same format as cohort cells: count, then retention %, then weight % */}
                      <div style={{ 
                        color: getColorsForPercentage(
                          grandTotal.total_customers > 0 ? (grandTotal.retention[month.key] || 0) / grandTotal.total_customers * 100 : 0,
                          grandTotalWithWeight.weight_percentage?.[month.key] || 0
                        ).text 
                      }} className="text-xs">
                        ({grandTotal.retention[month.key] || 0})
                      </div>
                      <div style={{ 
                        color: getColorsForPercentage(
                          grandTotal.total_customers > 0 ? (grandTotal.retention[month.key] || 0) / grandTotal.total_customers * 100 : 0,
                          grandTotalWithWeight.weight_percentage?.[month.key] || 0
                        ).text 
                      }} className="font-medium">
                        {grandTotal.total_customers > 0 ? ((grandTotal.retention[month.key] || 0) / grandTotal.total_customers * 100).toFixed(1) : '0.0'}%
                      </div>
                      {(grandTotalWithWeight.weight_percentage?.[month.key] || 0) > 0 && (
                        <div style={{ color: "#ef4444" }} className="text-xs font-medium">
                          [{(grandTotalWithWeight.weight_percentage?.[month.key] || 0).toFixed(1)}%]
                        </div>
                      )}
                    </div>
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
                    <TableCell className="text-left">{cohort.total_customers.toLocaleString()}</TableCell>
                    <TableCell className="text-left">{cohort.totalRetained?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-left">
                      {retentionPercentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => onOpportunityClick && onOpportunityClick(cohort.cohort_month, n)}
                      >
                        View
                      </Button>
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
                            "text-left cursor-pointer p-0 overflow-hidden",
                            (isRowHovered || isColumnHovered) ? 'ring-1 ring-inset ring-violet-300' : ''
                          )}
                          onClick={() => onCellClick && onCellClick(cohort.cohort_month, parseInt(month.key.substring(1)))}
                          onMouseEnter={() => setHoveredColumn(month.key)}
                          onMouseLeave={() => setHoveredColumn(null)}
                        >
                          <div 
                        className="p-4 h-full w-full flex flex-col justify-center items-start transition-colors"
                        style={{
                          backgroundColor: getColorsForPercentage(percentage, weightPercentage).bg
                        }}
                      >
                        {/* Reorder cell content as requested: count, then retention %, then weight % */}
                        <div style={{ color: getColorsForPercentage(percentage, weightPercentage).text }} className="text-xs">
                          ({value})
                        </div>
                        <div style={{ color: getColorsForPercentage(percentage, weightPercentage).text }} className="font-medium">
                          {percentage.toFixed(1)}%
                        </div>
                        {weightPercentage > 0 && (
                          <div style={{ color: "#ef4444" }} className="text-xs font-medium">
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
