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
  second_order_at?: string; // Make optional
}

interface CustomerListDialogProps {
  title: string;
  customers: Customer[];
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerListDialog({ title, customers, isOpen, onClose }: CustomerListDialogProps) {
  const showSecondOrderColumn = customers.some(c => c.second_order_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto" style={{ maxHeight: '60vh' }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>First Order</TableHead>
                {showSecondOrderColumn && <TableHead>Second Order</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <TableRow key={customer.customer_id}>
                    <TableCell>{`${customer.first_name || ''} ${customer.last_name || ''}`.trim()}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{new Date(customer.first_order_at).toLocaleString()}</TableCell>
                    {showSecondOrderColumn && (
                      <TableCell>
                        {customer.second_order_at ? new Date(customer.second_order_at).toLocaleString() : 'N/A'}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={showSecondOrderColumn ? 4 : 3} className="text-center">No customers to display.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
