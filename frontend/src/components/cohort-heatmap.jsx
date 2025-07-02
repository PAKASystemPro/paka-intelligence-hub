"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fetchCohortData, fetchCohortCustomers } from "@/lib/supabase-client";
import { getRetentionColorClass, calculateRetentionRate } from "@/lib/cohort-utils";
import { exportCohortCustomers } from "@/lib/export-utils";

export default function CohortHeatmap() {
  // State for cohort data and UI controls
  const [cohortData, setCohortData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProduct, setActiveProduct] = useState('All');
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [cohortCustomers, setCohortCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Product options for filtering
  const productOptions = [
    { id: 'All', name: 'All Products' },
    { id: '深睡寶寶', name: '深睡寶寶' },
    { id: '天皇丸', name: '天皇丸' },
    { id: '皇后丸', name: '皇后丸' }
  ];
  

  
  // Months for column headers (m0-m11)
  const months = Array.from({ length: 12 }, (_, i) => `m${i}`);
  
  // Fetch cohort data when product filter changes
  useEffect(() => {
    async function loadCohortData() {
      setLoading(true);
      setError(null);
      
      try {
        const data = await fetchCohortData(activeProduct);
        setCohortData(data);
      } catch (err) {
        console.error('Failed to load cohort data:', err);
        setError('Failed to load cohort data. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    
    loadCohortData();
  }, [activeProduct]);
  
  // Handle cohort cell click to show customer details
  const handleCohortCellClick = async (cohortMonth, monthIndex) => {
    setSelectedCohort({
      cohortMonth,
      monthIndex,
      title: `${cohortMonth} Cohort - Month ${monthIndex}`
    });
    
    setLoadingCustomers(true);
    try {
      // Pass the monthIndex parameter to filter customers by the specific month
      const customers = await fetchCohortCustomers(cohortMonth, parseInt(monthIndex), activeProduct);
      setCohortCustomers(customers);
    } catch (err) {
      console.error('Failed to load cohort customers:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };
  
  // Sort cohort months in descending order (newest first)
  const sortedCohortMonths = Object.keys(cohortData).sort().reverse();
  
  return (
    <div className="container mx-auto py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Cohort Analysis</CardTitle>
          <CardDescription>
            Monthly retention analysis showing second order rates by cohort
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Product Filter Tabs */}
          <Tabs
            defaultValue="All"
            value={activeProduct}
            onValueChange={setActiveProduct}
            className="mb-6"
          >
            <TabsList className="grid grid-cols-4 mb-4">
              {productOptions.map(product => (
                <TabsTrigger key={product.id} value={product.id}>
                  {product.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          

          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-gray-500">Loading cohort data...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-lg text-red-500">{error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="border-collapse">
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold border">Cohort</TableHead>
                    <TableHead className="font-bold border">New Customers</TableHead>
                    <TableHead className="font-bold border">2nd Orders</TableHead>
                    <TableHead className="font-bold border">Retention %</TableHead>
                    {months.map(month => (
                      <TableHead key={month} className="font-bold border text-center w-16">
                        {month}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCohortMonths.map(month => {
                    const cohort = cohortData[month];
                    const retentionRate = calculateRetentionRate(cohort);
                    
                    return (
                      <TableRow key={month}>
                        <TableCell className="font-medium border">{month}</TableCell>
                        <TableCell className="border">{cohort.newCustomers}</TableCell>
                        <TableCell className="border">{cohort.secondOrders}</TableCell>
                        <TableCell className="border">{retentionRate}%</TableCell>
                        
                        {months.map(monthKey => {
                          const absoluteValue = cohort[monthKey] || 0;
                          // Calculate percentage of new customers
                          const percentage = cohort.newCustomers > 0 
                            ? Math.round((absoluteValue / cohort.newCustomers) * 100) 
                            : 0;
                          
                          // Calculate contribution to overall retention rate
                          const contributionPercentage = cohort.secondOrders > 0 
                            ? Math.round((absoluteValue / cohort.secondOrders) * 100) 
                            : 0;
                            
                          const colorClass = getRetentionColorClass(percentage);
                          
                          return (
                            <TableCell 
                              key={`${month}-${monthKey}`} 
                              className={`border text-center cursor-pointer ${colorClass} hover:opacity-80`}
                              onClick={() => handleCohortCellClick(month, monthKey.substring(1))}
                            >
                              {absoluteValue > 0 ? (
                                <div className="flex flex-col items-center justify-center">
                                  <div className="font-medium">{`${percentage}%`}</div>
                                  <div className="text-xs text-gray-600">{`(${absoluteValue})`}</div>
                                  <div className="text-xs text-gray-500">{`[${contributionPercentage}%]`}</div>
                                </div>
                              ) : '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Customer List Dialog */}
      <Dialog open={!!selectedCohort} onOpenChange={(open) => !open && setSelectedCohort(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCohort?.title}</DialogTitle>
          </DialogHeader>
          
          {loadingCustomers ? (
            <div className="flex justify-center items-center h-32">
              <p>Loading customer data...</p>
            </div>
          ) : (
            <div>
              <p className="mb-4">
                {cohortCustomers.length} customers found in this cohort
              </p>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Total Spent</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Product Cohort</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cohortCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>{`${customer.first_name || ''} ${customer.last_name || ''}`}</TableCell>
                      <TableCell>{customer.email || 'N/A'}</TableCell>
                      <TableCell>${customer.total_spent?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>{customer.orders_count || 0}</TableCell>
                      <TableCell>{customer.primary_product_cohort || 'Unknown'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-4 flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => exportCohortCustomers(cohortCustomers, selectedCohort?.cohortMonth, activeProduct)}
                  disabled={cohortCustomers.length === 0 || loadingCustomers}
                >
                  Export to CSV
                </Button>
                <Button onClick={() => setSelectedCohort(null)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
