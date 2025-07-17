'use client';

import './styles.css';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { CohortData } from '@/components/modules/CohortTable';
import { SummaryData } from '@/components/modules/SummaryCards';

// Custom interfaces for summary cards used in this page
interface CustomSummaryCard {
  title: string;
  value: string | number;
  subtext?: string;
};

// Import shadcn components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Define the structure for opportunity customer data
interface OpportunityCustomer {
  customer_id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  total_spent: number;
  initial_product_group: string;
  orders_count: number;
}

export default function RetentionPageV2() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'All';

  // State management (shared with original page)
  const [data, setData] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string>(initialFilter);
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);
  const [opportunityCustomers, setOpportunityCustomers] = useState<OpportunityCustomer[]>([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [customSummaryCards, setCustomSummaryCards] = useState<CustomSummaryCard[]>([]);

  // Fetch cohort data - reusing the same API call logic
  useEffect(() => {
    const fetchCohortData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          n: '2',
          productFilter: productFilter,
          year: new Date().getFullYear().toString()
        });
        console.log('Fetching cohort data with params:', params.toString());
        const response = await fetch(`/api/analytics/retention?${params.toString()}`);
        console.log('API response status:', response.status, response.statusText);
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const result = await response.json();
        console.log('Cohort data response:', result);
        console.log('Cohort data length:', result?.length || 0);
        
        // Debug: Inspect cohort data structure
        if (result && result.length > 0) {
          console.log('First cohort month:', result[0].cohort_month);
          console.log('First cohort retention structure:', result[0].retention);
          console.log('First cohort totalRetained:', result[0].totalRetained);
          console.log('First cohort retentionPercentage:', result[0].retentionPercentage);
        } else {
          console.log('No cohort data received');
        }
        
        console.log('Setting data state with:', result);
        setData(result);
        // Extract summary data from result if available
        if (result.length > 0 && result[0].summaryData) {
          setSummaryData(result[0].summaryData);
          
          // Create custom summary cards
          if (result[0].summaryData) {
            const data = result[0].summaryData;
            setCustomSummaryCards([
              {
                title: `Total Customers`,
                value: data.total_customers.toLocaleString()
              },
              {
                title: `Total Retained`,
                value: data.totalRetained.toLocaleString()
              },
              {
                title: 'Retention Rate',
                value: `${data.totalRetentionPercentage.toFixed(1)}%`
              }
            ]);
          }
        }
      } catch (err) {
        console.error('Error fetching cohort data:', err);
        setError('Failed to load cohort data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchCohortData();
  }, [productFilter]);

  // Handle opportunity customer fetch
  const handleCellClick = async (cohortMonth: string, monthIndex: number, n: number = 2) => {
    // Don't do anything for empty cells
    const cohort = data.find(c => c.cohort_month === cohortMonth);
    if (!cohort || !cohort.retention[monthIndex]) return;

    setSelectedCohort(cohortMonth);
    setSelectedMonth(monthIndex);
    setOpportunityLoading(true);
    setShowOpportunityDialog(true);
    
    try {
      const params = new URLSearchParams({
        cohortMonth: cohortMonth,
        monthDiff: monthIndex.toString(),
        productFilter: productFilter
      });
      
      console.log('Fetching opportunity customers with params:', params.toString());
      const response = await fetch(`/api/analytics/opportunity?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Opportunity customers response:', result);
      setOpportunityCustomers(result);
    } catch (err) {
      console.error('Error fetching opportunity customers:', err);
    } finally {
      setOpportunityLoading(false);
    }
  };

  // Handle Grand Total row cell clicks
  const handleGrandTotalCellClick = async (monthIndex: number, n: number = 2) => {
    setSelectedCohort('Grand Total');
    setSelectedMonth(monthIndex);
    setOpportunityLoading(true);
    setShowOpportunityDialog(true);
    
    try {
      const params = new URLSearchParams({
        monthDiff: monthIndex.toString(),
        productFilter: productFilter,
        allCohorts: 'true'
      });
      
      console.log('Fetching grand total opportunity customers with params:', params.toString());
      const response = await fetch(`/api/analytics/opportunity?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('Grand total opportunity customers response:', result);
      setOpportunityCustomers(result);
    } catch (err) {
      console.error('Error fetching opportunity customers:', err);
    } finally {
      setOpportunityLoading(false);
    }
  };

  // Get the current grand total row data
  const grandTotalData = data.find(item => item.cohort_month === 'Grand Total');

  // Calculate if this is a Grand Total row
  const isGrandTotalCohort = (cohort: CohortData) => cohort.cohort_month === 'Grand Total';

  // Calculate the total months to display (max 12)
  const totalMonths = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-4 p-4 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Customer Retention Analysis V2</h1>
        
        {/* Filter Control - shadcn Select */}
        <div className="w-64">
          <Select 
            value={productFilter} 
            onValueChange={setProductFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Products</SelectItem>
              <SelectItem value="深睡寶寶">深睡寶寶</SelectItem>
              <SelectItem value="天皇丸">天皇丸</SelectItem>
              <SelectItem value="皇后丸">皇后丸</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards using shadcn Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle><Skeleton className="h-4 w-24" /></CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {customSummaryCards.map((item, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{item.value}</div>
                  {item.subtext && <p className="text-xs text-muted-foreground mt-1">{item.subtext}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cohort Table using shadcn Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle>Cohort Retention Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">{error}</div>
          ) : (
            <ScrollArea className="h-[500px] w-full">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-36">Cohort</TableHead>
                    <TableHead className="text-right">New Customers</TableHead>
                    <TableHead className="text-right">Second Orders</TableHead>
                    <TableHead className="text-right">Retention</TableHead>
                    {totalMonths.map((month) => (
                      <TableHead key={month} className="text-right whitespace-nowrap">
                        Month {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Grand Total Row */}
                  {grandTotalData && (
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell>{grandTotalData.cohort_month}</TableCell>
                      <TableCell className="text-right">{grandTotalData.total_customers}</TableCell>
                      <TableCell className="text-right">{grandTotalData.totalRetained || 0}</TableCell>
                      <TableCell className="text-right">
                        {grandTotalData.retentionPercentage ? `${grandTotalData.retentionPercentage.toFixed(1)}%` : '0.0%'}
                      </TableCell>
                      {totalMonths.map((month) => {
                        const monthKey = `m${month}`;
                        const value = grandTotalData.retention[monthKey] || 0;
                        const percentage = value && grandTotalData.total_customers 
                          ? (value / grandTotalData.total_customers * 100).toFixed(1) 
                          : '0.0';
                        
                        return (
                          <TableCell 
                            key={month}
                            className="text-right cursor-pointer hover:bg-muted/50"
                            onClick={() => handleGrandTotalCellClick(month)}
                          >
                            {value > 0 ? (
                              <>
                                <div>{value}</div>
                                <div className="text-xs text-muted-foreground">{percentage}%</div>
                              </>
                            ) : '—'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}
                  
                  {/* Regular Cohort Rows */}
                  {data
                    .filter(item => item.cohort_month !== 'Grand Total')
                    .map((cohort) => (
                      <TableRow key={cohort.cohort_month}>
                        <TableCell>{cohort.cohort_month}</TableCell>
                        <TableCell className="text-right">{cohort.total_customers}</TableCell>
                        <TableCell className="text-right">{cohort.totalRetained || 0}</TableCell>
                        <TableCell className="text-right">
                          {cohort.retentionPercentage ? `${cohort.retentionPercentage.toFixed(1)}%` : '0.0%'}
                        </TableCell>
                        {totalMonths.map((month) => {
                          const monthKey = `m${month}`;
                          const value = cohort.retention[monthKey] || 0;
                          const percentage = cohort.total_customers > 0 
                            ? (value / cohort.total_customers * 100).toFixed(1) 
                            : '0.0';
                          
                          // Color coding based on retention rate percentage
                          let cellColor = 'bg-white';
                          if (percentage && parseFloat(percentage) > 0) {
                            if (parseFloat(percentage) >= 10) cellColor = 'bg-green-50 hover:bg-green-100';
                            else if (parseFloat(percentage) >= 5) cellColor = 'bg-emerald-50 hover:bg-emerald-100';
                            else cellColor = 'bg-blue-50 hover:bg-blue-100';
                          }
                          
                          return (
                            <TableCell 
                              key={month}
                              className={`text-right cursor-pointer ${cellColor}`}
                              onClick={() => handleCellClick(cohort.cohort_month, month)}
                            >
                              {value > 0 ? (
                                <>
                                  <div>{value}</div>
                                  <div className="text-xs text-muted-foreground">{percentage}%</div>
                                </>
                              ) : '—'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Opportunity Customers Dialog using shadcn Dialog */}
      <Dialog open={showOpportunityDialog} onOpenChange={setShowOpportunityDialog}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>
              {selectedCohort === 'Grand Total' 
                ? `Month ${selectedMonth} Second Order Customers (All Cohorts)`
                : `${selectedCohort} Cohort - Month ${selectedMonth} Second Order Customers`}
            </DialogTitle>
          </DialogHeader>
          
          {opportunityLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : opportunityCustomers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No customers found</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Initial Product</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunityCustomers.map((customer) => (
                    <TableRow key={customer.customer_id}>
                      <TableCell>
                        {customer.first_name} {customer.last_name}
                      </TableCell>
                      <TableCell>{customer.email || '—'}</TableCell>
                      <TableCell>${customer.total_spent?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{customer.orders_count}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{customer.initial_product_group || 'Unknown'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowOpportunityDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
