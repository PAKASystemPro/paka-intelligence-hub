"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchCohortData, fetchCohortCustomers, fetchMultiOrderCohortData } from "@/lib/supabase-client";
import { getRetentionColorClass, calculateRetentionRate, calculateNthOrderRetentionRate } from "@/lib/cohort-utils";
import { exportCohortCustomers } from "@/lib/export-utils";
import CohortStatusCard from "@/components/cohort-status-card";

export default function CohortHeatmap() {
  // State for cohort data and UI controls
  const [cohortData, setCohortData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeProduct, setActiveProduct] = useState('All');
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [cohortCustomers, setCohortCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [orderNumber, setOrderNumber] = useState(2); // Default to 2nd order analysis
  
  // Product options for filtering
  const productOptions = [
    { id: 'All', name: 'All Products' },
    { id: '深睡寶寶', name: '深睡寶寶' },
    { id: '天皇丸', name: '天皇丸' },
    { id: '皇后丸', name: '皇后丸' }
  ];
  
  // Order number options for analysis
  const orderOptions = [
    { value: 2, label: '2nd Order' },
    { value: 3, label: '3rd Order' },
    { value: 4, label: '4th Order' },
    { value: 5, label: '5th Order' },
    { value: 6, label: '6th Order' }
  ];
  
  // Months for column headers (m0-m11)
  const months = Array.from({ length: 12 }, (_, i) => `m${i}`);
  
  // Fetch cohort data when product filter or order number changes
  useEffect(() => {
    async function loadCohortData() {
      setLoading(true);
      setError(null);
      
      try {
        let data;
        if (orderNumber === 2) {
          // Use existing function for 2nd order analysis
          data = await fetchCohortData(activeProduct);
        } else {
          // Use new function for 3rd+ order analysis
          data = await fetchMultiOrderCohortData(activeProduct, orderNumber);
        }
        setCohortData(data);
      } catch (err) {
        console.error(`Failed to load ${orderNumber}th order cohort data:`, err);
        setError(`Failed to load ${orderNumber}th order cohort data. Please try again.`);
      } finally {
        setLoading(false);
      }
    }
    
    loadCohortData();
  }, [activeProduct, orderNumber]);
  
  // Handle cohort cell click to show customer details
  const handleCohortCellClick = async (cohortMonth, monthIndex) => {
    const orderLabel = orderNumber === 2 ? '2nd' : 
                       orderNumber === 3 ? '3rd' : 
                       `${orderNumber}th`;
    
    setSelectedCohort({
      cohortMonth,
      monthIndex,
      title: `${cohortMonth} Cohort - ${orderLabel} Orders - Month ${monthIndex}`
    });
    
    setLoadingCustomers(true);
    try {
      // Pass the monthIndex parameter to filter customers by the specific month
      // Include orderNumber parameter for multi-order analysis
      const customers = await fetchCohortCustomers(cohortMonth, parseInt(monthIndex), activeProduct, orderNumber);
      setCohortCustomers(customers);
    } catch (err) {
      console.error(`Failed to load ${orderLabel} order cohort customers:`, err);
    } finally {
      setLoadingCustomers(false);
    }
  };
  
  // Sort cohort months in descending order (newest first)
  const sortedCohortMonths = Object.keys(cohortData).sort().reverse();
  
  // Calculate grand totals
  const calculateGrandTotals = () => {
    if (!sortedCohortMonths.length) return null;
    
    const totals = {};
    
    // Initialize totals based on order number
    if (orderNumber === 2) {
      totals.newCustomers = 0;
      totals.secondOrders = 0;
    } else {
      totals.previousOrderCustomers = 0;
      totals.nthOrders = 0;
    }
    
    // Initialize month totals (m0-m11)
    months.forEach(month => {
      totals[month] = 0;
    });
    
    // Sum up all values
    sortedCohortMonths.forEach(month => {
      const cohort = cohortData[month];
      
      if (orderNumber === 2) {
        totals.newCustomers += cohort.newCustomers;
        totals.secondOrders += cohort.secondOrders;
      } else {
        totals.previousOrderCustomers += cohort.previousOrderCustomers;
        totals.nthOrders += cohort.nthOrders;
      }
      
      // Sum up monthly values
      months.forEach(monthKey => {
        totals[monthKey] += (cohort[monthKey] || 0);
      });
    });
    
    return totals;
  };
  
  const grandTotals = calculateGrandTotals();
  
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-1">
          <CohortStatusCard cohortData={cohortData} orderNumber={orderNumber} />
        </div>
        <div className="md:col-span-3">
          <Card className="w-full h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Cohort Analysis</CardTitle>
              <CardDescription>
                Monthly retention analysis showing {orderNumber === 2 ? 'second' : `${orderNumber}th`} order rates by cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
          {/* Controls Row */}
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            {/* Product Filter Tabs */}
            <Tabs
              defaultValue="All"
              value={activeProduct}
              onValueChange={setActiveProduct}
              className="flex-grow"
            >
              <TabsList className="grid grid-cols-4">
                {productOptions.map(product => (
                  <TabsTrigger key={product.id} value={product.id}>
                    {product.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            {/* Order Number Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Order Analysis:</span>
              <Select
                value={orderNumber.toString()}
                onValueChange={(value) => setOrderNumber(parseInt(value))}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Select Order" />
                </SelectTrigger>
                <SelectContent>
                  {orderOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          

          
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
                    <TableHead className="w-[120px] bg-gray-100">Cohort Month</TableHead>
                    {orderNumber === 2 ? (
                      <>
                        <TableHead className="w-[100px] bg-gray-100">New Customers</TableHead>
                        <TableHead className="w-[100px] bg-gray-100">Second Orders</TableHead>
                        <TableHead className="w-[80px] bg-gray-100">Retention %</TableHead>
                      </>
                    ) : (
                      <>
                        <TableHead className="w-[100px] bg-gray-100">
                          {orderNumber-1 === 2 ? '2nd' : 
                           orderNumber-1 === 3 ? '3rd' : 
                           `${orderNumber-1}th`} Orders
                        </TableHead>
                        <TableHead className="w-[100px] bg-gray-100">
                          {orderNumber === 3 ? '3rd' : 
                           orderNumber === 2 ? '2nd' : 
                           `${orderNumber}th`} Orders
                        </TableHead>
                        <TableHead className="w-[80px] bg-gray-100">Retention %</TableHead>
                      </>
                    )}
                    {months.map(month => (
                      <TableHead key={month} className="w-[80px] bg-gray-100">
                        Month {month.substring(1)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Grand Total Row */}
                  {grandTotals && (
                    <TableRow className="bg-gray-50 font-medium">
                      <TableCell>Grand Total</TableCell>
                      {orderNumber === 2 ? (
                        <>
                          <TableCell>{(grandTotals?.newCustomers || 0).toLocaleString()}</TableCell>
                          <TableCell>{(grandTotals?.secondOrders || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {grandTotals ? calculateRetentionRate(grandTotals) : 0}%
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{(grandTotals?.previousOrderCustomers || 0).toLocaleString()}</TableCell>
                          <TableCell>{(grandTotals?.nthOrders || 0).toLocaleString()}</TableCell>
                          <TableCell>
                            {grandTotals ? calculateNthOrderRetentionRate(grandTotals) : 0}%
                          </TableCell>
                        </>
                      )}
                      {months.map(month => {
                        const absoluteValue = grandTotals?.[month] || 0;
                        const denominator = orderNumber === 2 ? (grandTotals?.newCustomers || 0) : (grandTotals?.previousOrderCustomers || 0);
                        const numerator = orderNumber === 2 ? (grandTotals?.secondOrders || 0) : (grandTotals?.nthOrders || 0);
                        const percentage = denominator > 0 ? Math.round((absoluteValue / denominator) * 100) : 0;
                        const contributionPercentage = numerator > 0 ? Math.round((absoluteValue / numerator) * 100) : 0;
                        
                        return (
                          <TableCell 
                            key={month}
                            className={`cursor-pointer ${getRetentionColorClass(percentage)}`}
                            onClick={() => handleCohortCellClick('all', month.substring(1))}
                          >
                            {absoluteValue > 0 ? (
                              <div className="text-center">
                                <div className="font-medium">{`${percentage}%`}</div>
                                <div className="text-xs text-gray-600">{`(${absoluteValue})`}</div>
                                <div className="text-xs text-red-500">{`[${contributionPercentage}%]`}</div>
                              </div>
                            ) : '-'}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  )}
                  
                  {/* Cohort Rows */}
                  {sortedCohortMonths.map(cohortMonth => {
                    const cohort = cohortData[cohortMonth];
                    return (
                      <TableRow key={cohortMonth}>
                        <TableCell>{cohortMonth}</TableCell>
                        {orderNumber === 2 ? (
                          <>
                            <TableCell>{(cohort?.newCustomers || 0).toLocaleString()}</TableCell>
                            <TableCell>{(cohort?.secondOrders || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {cohort ? calculateRetentionRate(cohort) : 0}%
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell>{(cohort?.previousOrderCustomers || 0).toLocaleString()}</TableCell>
                            <TableCell>{(cohort?.nthOrders || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {cohort ? calculateNthOrderRetentionRate(cohort) : 0}%
                            </TableCell>
                          </>
                        )}
                        {months.map(month => {
                          const absoluteValue = cohort?.[month] || 0;
                          const denominator = orderNumber === 2 ? (cohort?.newCustomers || 0) : (cohort?.previousOrderCustomers || 0);
                          const numerator = orderNumber === 2 ? (cohort?.secondOrders || 0) : (cohort?.nthOrders || 0);
                          const percentage = denominator > 0 ? Math.round((absoluteValue / denominator) * 100) : 0;
                          const contributionPercentage = numerator > 0 ? Math.round((absoluteValue / numerator) * 100) : 0;
                          
                          return (
                            <TableCell 
                              key={`${cohortMonth}-${month}`}
                              className={`cursor-pointer ${getRetentionColorClass(percentage)}`}
                              onClick={() => handleCohortCellClick(cohortMonth, month.substring(1))}
                            >
                              {absoluteValue > 0 ? (
                                <div className="text-center">
                                  <div className="font-medium">{`${percentage}%`}</div>
                                  <div className="text-xs text-gray-600">{`(${absoluteValue})`}</div>
                                  <div className="text-xs text-red-500">{`[${contributionPercentage}%]`}</div>
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
              
              {/* Legend */}
              <div className="mt-4 text-sm border p-3 rounded-md bg-gray-50">
                <h4 className="font-medium mb-2">Legend:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="flex items-center">
                    <span className="font-medium mr-2">16%</span>
                    <span className="text-gray-700">
                      - Retention percentage {orderNumber === 2 
                        ? "(% of new customers)" 
                        : `(% of ${orderNumber-1}th order customers)`}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">(23)</span>
                    <span className="text-gray-700">
                      - Actual customer count
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-red-500 mr-2">[35%]</span>
                    <span className="text-gray-700">
                      - Weight contribution to {orderNumber === 2 
                        ? "second order" 
                        : `${orderNumber}th order`} rate
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Customer List Dialog */}
      <Dialog open={!!selectedCohort} onOpenChange={(open) => !open && setSelectedCohort(null)}>
        <DialogContent className="max-w-[2000px] w-[95vw] max-h-[80vh] overflow-y-auto">
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
