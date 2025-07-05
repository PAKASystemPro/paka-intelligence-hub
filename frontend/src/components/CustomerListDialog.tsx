import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export interface Customer {
  customer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  first_order_at: string;
  second_order_at: string;
}

interface CustomerListDialogProps {
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerListDialog({ customers, isOpen, onClose }: CustomerListDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Cohort Customers</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>First Order</TableHead>
                <TableHead>Second Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell>{`${customer.first_name || ''} ${customer.last_name || ''}`.trim()}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{new Date(customer.first_order_at).toLocaleString()}</TableCell>
                    <TableCell>{new Date(customer.second_order_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No customers to display.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
