'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Loader2 } from 'lucide-react';

// Define the structure for opportunity customer data
export interface OpportunityCustomer {
  customer_id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  total_spent: number;
  initial_product_group: string;
  orders_count: number;
}

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: OpportunityCustomer[];
  loading: boolean;
  error: string | null;
  selectedCohort: string;
  n: number;
  productFilter: string;
  onAddToBroadcast: (selectedCustomers: OpportunityCustomer[]) => void;
}

export default function OpportunityDialog({
  open,
  onOpenChange,
  customers,
  loading,
  error,
  selectedCohort,
  n,
  productFilter,
  onAddToBroadcast
}: OpportunityDialogProps) {
  // State for customer selection
  const [selectedCustomers, setSelectedCustomers] = useState<OpportunityCustomer[]>([]);
  const [isIndeterminate, setIsIndeterminate] = useState(false);

  // Reset customer selection when dialog closes or customers change
  useEffect(() => {
    setSelectedCustomers([]);
  }, [open, customers]);
  
  // Toggle customer selection
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
    if (selectedCustomers.length === customers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers([...customers]);
    }
  };
  
  // Update the indeterminate state of the "Select All" checkbox when selections change
  useEffect(() => {
    if (customers.length > 0) {
      const someSelected = selectedCustomers.length > 0 && selectedCustomers.length < customers.length;
      setIsIndeterminate(someSelected);
    } else {
      setIsIndeterminate(false);
    }
  }, [selectedCustomers, customers]);

  // Handle broadcast button click
  const handleBroadcastClick = () => {
    if (selectedCustomers.length === 0) {
      alert('Please select at least one customer');
      return;
    }
    onAddToBroadcast(selectedCustomers);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-full p-3 md:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            Customers with {n-1} order{(n-1) !== 1 ? 's' : ''} from {selectedCohort}
            {productFilter !== 'ALL' && ` (${productFilter})`}
          </DialogTitle>
        </DialogHeader>
        
        {loading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading customers...</span>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            <p>Error loading customers: {error}</p>
          </div>
        )}

        {!loading && !error && customers.length === 0 && (
          <div className="p-4 text-center text-gray-500">
            <p>No customers found in this cohort.</p>
          </div>
        )}

        {!loading && !error && customers.length > 0 && (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">
                    <div className="flex justify-center items-center">
                      <Checkbox 
                        className={`h-6 w-6 rounded-none border-2 border-gray-400 bg-white data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground cursor-pointer ${isIndeterminate ? 'bg-primary opacity-50' : ''}`}
                        checked={selectedCustomers.length === customers.length && customers.length > 0} 
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
                {customers.map((customer) => (
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
        {customers.length > 0 && !loading && !error && (
          <div className="mt-6 flex justify-end">
            <Button 
              variant="default" 
              onClick={handleBroadcastClick}
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
  );
}
