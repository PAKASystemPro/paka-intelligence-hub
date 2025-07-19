import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  loading: boolean;
  error: string | null;
  stats: {
    total_sales_today: number;
    todays_orders_count: number;
  } | null;
  formatCurrency: (n: number) => string;
}

export function SectionCards({ loading, error, stats, formatCurrency }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full">
      <Card className="min-w-[400px] max-w-[500px] w-full">
        <CardHeader className="pb-0 px-[18px] pt-[18px]">
          <CardTitle className="text-base font-semibold">Total Sales</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4 px-[18px]">
          {loading ? (
            <div className="flex items-center"><span className="ml-2 text-muted-foreground">Loading...</span></div>
          ) : error ? (
            <div className="text-destructive">Error: {error}</div>
          ) : (
            <span className="block text-[2.5rem] font-semibold leading-none">{formatCurrency(stats?.total_sales_today ?? 0)}</span>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-[400px] max-w-[500px] w-full">
        <CardHeader className="pb-0 px-[18px] pt-[18px]">
          <CardTitle className="text-base font-semibold">Average Order Value</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4 px-[18px]">
          {loading ? (
            <div className="flex items-center"><span className="ml-2 text-muted-foreground">Loading...</span></div>
          ) : error ? (
            <div className="text-destructive">Error: {error}</div>
          ) : (
            <span className="block text-[2.5rem] font-semibold leading-none">{stats?.todays_orders_count ? formatCurrency((stats?.total_sales_today ?? 0) / stats.todays_orders_count) : "$0.00"}</span>
          )}
        </CardContent>
      </Card>
      <Card className="min-w-[400px] max-w-[500px] w-full">
        <CardHeader className="pb-0 px-[18px] pt-[18px]">
          <CardTitle className="text-base font-semibold">Orders Count</CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-4 px-[18px]">
          {loading ? (
            <div className="flex items-center"><span className="ml-2 text-muted-foreground">Loading...</span></div>
          ) : error ? (
            <div className="text-destructive">Error: {error}</div>
          ) : (
            <span className="block text-[2.5rem] font-semibold leading-none">{stats?.todays_orders_count ?? 0}</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
