"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export default function CohortStatusCard({ cohortData, orderNumber = 2 }) {
  const [statusData, setStatusData] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    retentionRate: 0,
    monthsAvailable: '',
    lastUpdated: new Date().toLocaleDateString()
  });

  useEffect(() => {
    if (!cohortData || Object.keys(cohortData).length === 0) return;

    // Calculate total metrics
    const cohortMonths = Object.keys(cohortData).sort();
    let totalCustomers = 0;
    let totalOrders = 0;

    if (orderNumber === 2) {
      // For 2nd order analysis
      cohortMonths.forEach(month => {
        if (cohortData[month]) {
          totalCustomers += cohortData[month].newCustomers || 0;
          totalOrders += cohortData[month].secondOrders || 0;
        }
      });
    } else {
      // For 3rd+ order analysis
      cohortMonths.forEach(month => {
        if (cohortData[month]) {
          totalCustomers += cohortData[month].previousOrderCustomers || 0;
          totalOrders += cohortData[month].nthOrders || 0;
        }
      });
    }

    // Calculate retention rate
    const retentionRate = totalCustomers > 0 
      ? Math.round((totalOrders / totalCustomers) * 100) 
      : 0;

    // Format months range
    const monthsRange = cohortMonths.length > 0 
      ? `${formatMonthYear(cohortMonths[0])} - ${formatMonthYear(cohortMonths[cohortMonths.length - 1])}` 
      : 'No data available';

    setStatusData({
      totalCustomers,
      totalOrders,
      retentionRate,
      monthsAvailable: monthsRange,
      lastUpdated: new Date().toLocaleDateString()
    });
  }, [cohortData, orderNumber]);

  // Format YYYY-MM to Month Year
  const formatMonthYear = (dateStr) => {
    if (!dateStr) return '';
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  // Chart data
  const chartData = {
    labels: ['Retained', 'Not Retained'],
    datasets: [
      {
        data: [statusData.retentionRate, 100 - statusData.retentionRate],
        backgroundColor: ['#10b981', '#f3f4f6'],
        borderColor: ['#059669', '#e5e7eb'],
        borderWidth: 1,
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.raw}%`;
          }
        }
      }
    },
  };

  const orderLabel = orderNumber === 2 ? '2nd' : 
                     orderNumber === 3 ? '3rd' : 
                     `${orderNumber}th`;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">Data Status</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-4">
        {/* Total Customers (large font) */}
        <div className="text-center">
          <div className="text-3xl font-bold">
            {statusData.totalCustomers.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500">
            {orderNumber === 2 ? 'Total New Customers' : `Total ${orderNumber-1}th Order Customers`}
          </div>
        </div>

        {/* Retention Donut Chart */}
        <div className="relative h-32 w-32">
          <Doughnut data={chartData} options={chartOptions} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold">{statusData.retentionRate}%</div>
              <div className="text-xs text-gray-500">{orderLabel} Orders</div>
            </div>
          </div>
        </div>

        {/* Months Available */}
        <div className="text-sm text-center">
          <div className="font-medium">Months Available</div>
          <div className="text-gray-500">{statusData.monthsAvailable}</div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-400 text-center">
          Last updated: {statusData.lastUpdated}
        </div>
      </CardContent>
    </Card>
  );
}
