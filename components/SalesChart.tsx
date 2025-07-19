"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface SalesChartProps {
  chartData: { hour: string; sales: number }[];
  totalSales: number;
}

const chartConfig = {
  views: {
    label: "Sales Data",
  },
  sales: {
    label: "Sales",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function SalesChart({ chartData, totalSales }: SalesChartProps) {
  return (
    <Card className="py-4 sm:py-0">
      <CardContent className="px-2 sm:p-6">
        <div className="flex flex-row justify-end mb-2">
          <div className="flex flex-col items-end">
            <span className="text-muted-foreground text-xs">Total Sales Today</span>
            <span className="text-lg leading-none font-bold sm:text-3xl">
              HK${totalSales.toLocaleString()}
            </span>
          </div>
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: any) => value + ' HKT'}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value: any) => `Time: ${value} HKT`}
                />
              }
            />
            <Line
              dataKey="sales"
              type="monotone"
              stroke="#7F00FF"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
