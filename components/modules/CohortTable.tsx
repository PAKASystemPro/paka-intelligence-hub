"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define the structure of a single cohort data object
interface CohortData {
  cohort_month: string;
  total_customers: number;
  // Add other retention data fields as needed
}

interface CohortTableProps {
  data: CohortData[];
}

export default function CohortTable({ data }: CohortTableProps) {
  if (!data || data.length === 0) {
    return <p>No cohort data available.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cohort Month</TableHead>
          <TableHead>New Customers</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((cohort) => (
          <TableRow key={cohort.cohort_month}>
            <TableCell>{cohort.cohort_month}</TableCell>
            <TableCell>{cohort.total_customers}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
