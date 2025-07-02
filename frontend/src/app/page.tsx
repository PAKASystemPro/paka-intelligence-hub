import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">PAKA Intelligence Hub</h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Customer cohort analysis and data visualization for PAKA products
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>Cohort Analysis</CardTitle>
            <CardDescription>Analyze customer retention by cohort</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              View retention rates across different product cohorts with monthly breakdowns.
              Identify patterns in customer behavior and optimize marketing strategies.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/cohort-analysis" className="w-full">
              <Button className="w-full">View Cohort Analysis</Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
            <CardDescription>Detailed customer data and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Access detailed customer information, including order history,
              product preferences, and spending patterns.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>Coming Soon</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Sync</CardTitle>
            <CardDescription>Shopify data synchronization status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Monitor the status of Shopify data synchronization, including orders,
              customers, and line items for all months.
            </p>
          </CardContent>
          <CardFooter>
            <Button className="w-full" variant="outline" disabled>Coming Soon</Button>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-gray-100 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Data Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-medium text-gray-700">Months Available</h3>
            <p className="text-2xl font-bold">January - June 2025</p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-medium text-gray-700">Total Customers</h3>
            <p className="text-2xl font-bold">1,958</p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h3 className="font-medium text-gray-700">Overall Retention</h3>
            <p className="text-2xl font-bold">35.7%</p>
          </div>
        </div>
      </div>

      <div className="text-center text-gray-500 text-sm">
        <p>Last data update: July 2, 2025</p>
      </div>
    </div>
  );
}
