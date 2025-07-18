'use client';

import './styles.css';

import React, { useState, useEffect, useMemo } from 'react';
import CohortTable, { CohortData } from '@/components/modules/CohortTable';
import FilterControls from '@/components/modules/FilterControls';
import SummaryCards, { SummaryData } from '@/components/modules/SummaryCards';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState as useStateImport } from 'react'; // Avoid conflict with existing useState
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function RetentionPage() {
  const router = useRouter();
  const [data, setData] = useState<CohortData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for opportunity customers dialog
  const [opportunityDialogOpen, setOpportunityDialogOpen] = useState(false);
  const [opportunityCustomers, setOpportunityCustomers] = useState<OpportunityCustomer[]>([]);
  const [opportunityLoading, setOpportunityLoading] = useState(false);
  const [opportunityError, setOpportunityError] = useState<string | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<string>('');
  
  // State for customer selection for WhatsApp broadcast
  const [selectedCustomers, setSelectedCustomers] = useState<OpportunityCustomer[]>([]);

  // State for filters
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [n, setN] = useState(2);
  const [productFilter, setProductFilter] = useState('ALL');
  
  // Use Asia/Hong_Kong timezone (UTC+8) by default
  const [tzOffset] = useState(8);
  
  // State for data period
  const [dataPeriod, setDataPeriod] = useState<string | null>(null);

  // Clear service workers and caches to ensure fresh data
  useEffect(() => {
    // Clear service workers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    
    // Only clear API-related caches
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('api') || name.includes('analytics')) {
            caches.delete(name);
          }
        });
      });
    }
  }, []);

  // Reset customer selection when dialog closes
  useEffect(() => {
    if (!opportunityDialogOpen) {
      setSelectedCustomers([]);
    }
  }, [opportunityDialogOpen]);
  
  // Toggle customer selection for WhatsApp broadcast
  const toggleCustomerSelection = (customer: OpportunityCustomer) => {
    setSelectedCustomers(prev => {
      const isSelected = prev.some(c => c.customer_id === customer.customer_id);
      if (isSelected) {
        return prev.filter(c => c.customer_id !== customer.customer_id);
      } else {
        return [...prev, customer];
      }
    });
  };

  // Toggle select all customers
  const toggleSelectAll = () => {
    if (selectedCustomers.length === opportunityCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers([...opportunityCustomers]);
    }
  };

  // Handle WhatsApp broadcast button click
  const handleWhatsAppBroadcast = () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }
    
    // Store selected customers in localStorage for the broadcast flow
    try {
      const selectedCustomersToSave = selectedCustomers
        .map(({ customer_id, first_name, last_name, email, phone }) => ({
          customer_id,
          first_name,
          last_name,
          email,
          phone
        }));
        
      // Fix: Use consistent localStorage key matching broadcast page
      localStorage.setItem('whatsappBroadcastCustomers', JSON.stringify(selectedCustomersToSave));
      
      // Use Next.js router for client-side navigation instead of full page reload
      router.push('/analytics/broadcast');
    } catch (error) {
      console.error('Error saving selected customers:', error);
      alert('Failed to prepare broadcast. Please try again.');
    }
  };
  
  // Fetch the latest order date when component loads
  useEffect(() => {
    async function fetchLatestOrderDate() {
      try {
        const response = await fetch('/api/analytics/latest-order-date');
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        const result = await response.json();
        
        // Check for formatted datetime first, then fall back to other formats
        if (result.formattedDateTime) {
          // Parse the ISO datetime string
          const dateObj = new Date(result.formattedDateTime);
          
          // Format as "Month Day, Year, HH:MM:SS (HKT)"
          const formattedDate = dateObj.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
          });
          
          const formattedTime = dateObj.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // 24-hour format
          });
          
          setDataPeriod(`${formattedDate}, ${formattedTime} (HKT)`);
        } 
        // Legacy format handling
        else if (result.formattedDate) {
          // Format the YYYY-MM-DD into a nicer display
          const [year, month, day] = result.formattedDate.split('-');
          const months = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          setDataPeriod(`${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`);
        } 
        else if (result.latestOrderDate) {
          const date = new Date(result.latestOrderDate);
          setDataPeriod(date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
        }
      } catch (err) {
        console.error('Error fetching latest order date:', err);
      }
    }
    
    fetchLatestOrderDate();
  }, []);

  // Fetch data when N, Product Filter, or Year changes
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          n: n.toString(),
          productFilter,
          year, // Include year parameter in API request
          tzOffset: tzOffset.toString(), // Always include timezone offset for consistent data
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
  }, [n, productFilter, year, tzOffset]); // Include tzOffset in dependency array to refetch on timezone change

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
  
  /**
   * Handle opportunity button click in the cohort table
   * @param cohortMonth The cohort month (YYYY-MM format)
   * @param n The order number threshold
   */
  const handleOpportunityClick = async (cohortMonth: string, n: number) => {
    try {
      setOpportunityLoading(true);
      setOpportunityError(null);
      setSelectedCohort(cohortMonth);
      
      // Build the query parameters
      const params = new URLSearchParams({
        cohortMonth,
        n: n.toString(),
      });
      
      // Add product filter if it's not 'ALL'
      if (productFilter !== 'ALL') {
        params.append('productFilter', productFilter);
      }
      
      // Add cache-busting timestamp parameter
      const timestamp = new Date().getTime();
      params.append('t', timestamp.toString());
      
      // Call the opportunity API
      const response = await fetch(`/api/analytics/opportunity?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      
      const result = await response.json();
      setOpportunityCustomers(result);
      setOpportunityDialogOpen(true);
    } catch (err) {
      setOpportunityError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setOpportunityLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-6">
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
          <>
            <div className="border rounded-lg shadow-sm overflow-hidden">
              <CohortTable 
                data={processedData} 
                onCellClick={handleCellClick}
                onOpportunityClick={handleOpportunityClick}
                n={n}
                dataPeriod={dataPeriod}
              />
            </div>
            
            {/* Opportunity Customers Dialog */}
            <Dialog open={opportunityDialogOpen} onOpenChange={setOpportunityDialogOpen}>
              <DialogContent className="max-w-[1300px] max-h-[80vh] overflow-y-auto mx-auto px-12">
                <DialogHeader>
                  <DialogTitle>
                    Opportunity Customers - {selectedCohort} Cohort
                  </DialogTitle>
                </DialogHeader>
                
                {opportunityLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading opportunity customers...</span>
                  </div>
                ) : opportunityError ? (
                  <p className="text-red-500 text-center py-4">Error: {opportunityError}</p>
                ) : opportunityCustomers.length === 0 ? (
                  <p className="text-center py-4">No opportunity customers found for this cohort.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">
                            <div className="flex justify-center items-center">
                              <Checkbox 
                                className="h-6 w-6 rounded-none border-2 border-gray-400 bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer"
                                checked={selectedCustomers.length === opportunityCustomers.length && opportunityCustomers.length > 0} 
                                onCheckedChange={toggleSelectAll}
                                aria-label="Select all customers"
                              />
                            </div>
                          </TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Initial Product</TableHead>
                          <TableHead className="text-right">Total Spent</TableHead>
                          <TableHead className="text-right">Orders</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {opportunityCustomers.map((customer) => (
                          <TableRow key={customer.customer_id}>
                            <TableCell className="text-center">
                              <div className="flex justify-center items-center">
                                <Checkbox 
                                  className="h-6 w-6 rounded-none border-2 border-gray-400 bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer"
                                  checked={selectedCustomers.some(c => c.customer_id === customer.customer_id)} 
                                  onCheckedChange={() => toggleCustomerSelection(customer)}
                                  aria-label={`Select ${customer.first_name} ${customer.last_name}`}
                                />
                              </div>
                            </TableCell>
                            <TableCell>{`${customer.first_name} ${customer.last_name}`}</TableCell>
                            <TableCell>{customer.email || 'N/A'}</TableCell>
                            <TableCell>{customer.phone || 'N/A'}</TableCell>
                            <TableCell>{customer.initial_product_group}</TableCell>
                            <TableCell className="text-right">
                              {customer.total_spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right">{customer.orders_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                {/* WhatsApp Broadcast Button - At bottom of dialog */}
                {opportunityCustomers.length > 0 && !opportunityLoading && !opportunityError && (
                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="default" 
                      onClick={handleWhatsAppBroadcast}
                      disabled={selectedCustomers.length === 0}
                      className="flex items-center gap-2 shadow-lg px-6 py-3 text-base bg-black hover:bg-gray-800 text-white rounded-lg"
                    >
                      <MessageSquare className="h-5 w-5" />
                      Add To Broadcast ({selectedCustomers.length})
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
          </>
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