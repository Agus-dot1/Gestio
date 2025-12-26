'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";
import { useRoutePrefetch } from "@/hooks/use-route-prefetch";
import { cn } from "@/lib/utils";
import { Installment } from "@/lib/database-operations";
import {
  Activity,
  CreditCard,
  DollarSign,
  Users,
  TrendingUp,
  Database,
  RefreshCw,
  Plus,
  ShoppingCart,
  Package,
  Calendar,
  Calculator,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Maximize2, Minimize2, FileText, Receipt, UserPlus, PackagePlus, Download } from "lucide-react";

import type { Sale as DatabaseSale } from "@/lib/database-operations";
import { formatCurrency } from '@/config/locale';
import Link from 'next/link';

type Sale = DatabaseSale & {
  customer_name?: string;
  sale_number?: string;
  payment_status?: string;
  date?: string;
};

type Customer = {
  id?: number;
  name: string;
  email?: string;
  created_at?: string;
};

export default function Home() {
  const router = useRouter();
  const { prefetchAllRoutes } = useRoutePrefetch();
  const [isElectron, setIsElectron] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0
  });
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<Customer[]>([]);
  const [upcomingInstallments, setUpcomingInstallments] = useState<Array<Installment & { customer_name: string; sale_number: string; status: string; customer_id: number }>>([]);
  const [chartData, setChartData] = useState<Array<{ date: string, sales: number, revenue: number }>>([]);
  const [chartRange, setChartRange] = useState<7 | 30 | 90 | 'all'>(30);
  const [statsComparison, setStatsComparison] = useState<{
    sales: { current: number, previous: number, percentage: number },
    revenue: { current: number, previous: number, percentage: number },
    customers: { current: number, previous: number, percentage: number },
    products: { current: number, previous: number, percentage: number }
  } | null>(null);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [chartMode, setChartMode] = useState<'sales' | 'installments'>('sales');
  const [isChartLoading, setIsChartLoading] = useState(false);



  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const [totalCustomers, totalProducts, totalSales, totalRevenue, recentSalesData, recentCustomersData, upcomingInstallmentsData, salesChartData, salesComparison, customersComparison, productsComparison] = await Promise.all([
          window.electronAPI.database.customers.getCount(),
          window.electronAPI.database.products.getCount(),
          window.electronAPI.database.sales.getCount(),
          window.electronAPI.database.sales.getTotalRevenue(),
          window.electronAPI.database.sales.getRecent(5),
          window.electronAPI.database.customers.getRecent(5),
          window.electronAPI.database.installments.getUpcoming(50),
          window.electronAPI.database.sales.getSalesChartData(30),
          window.electronAPI.database.sales.getStatsComparison(),
          window.electronAPI.database.customers.getMonthlyComparison(),
          window.electronAPI.database.products.getMonthlyComparison()
        ]);

        setStats({
          totalCustomers,
          totalProducts,
          totalSales,
          totalRevenue
        });
        setRecentSales(recentSalesData);
        setRecentCustomers(recentCustomersData);


        const seenCustomerIds = new Set<number>();
        const dedupedByCustomer = upcomingInstallmentsData.filter((inst) => {
          const cid = (inst as any).customer_id as number | undefined;
          if (!cid) return true; // keep if unknown
          if (seenCustomerIds.has(cid)) return false;
          seenCustomerIds.add(cid);
          return true;
        }).slice(0, 5);
        setUpcomingInstallments(dedupedByCustomer);
        setTimeout(() => {
          prefetchAllRoutes();
        }, 500);

      } else {
        const response = await fetch(`/api/dashboard?range=${chartRange}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const data = await response.json();

        setStats(data.stats);
        setRecentSales(data.recentSales);
        setRecentCustomers(data.recentCustomers);
        setChartData(Array.isArray(data.chartData) ? data.chartData.slice(-chartRange) : []);
        setStatsComparison(data.statsComparison);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [prefetchAllRoutes]); // Removed chartRange to prevent full page reload on period change

  const refreshChartOnly = useCallback(async () => {
    if (!window.electronAPI) return;
    setIsChartLoading(true);
    try {
      if (chartMode === 'sales') {
        const allSales = await window.electronAPI.database.sales.getAll();
        const cutoff = chartRange === 'all' ? new Date(0) : new Date(Date.now() - (chartRange as number) * 24 * 60 * 60 * 1000);
        const buckets = new Map<string, { sales: number; revenue: number }>();
        for (const s of allSales) {
          const dt = new Date(s.date || s.created_at || Date.now());
          if (dt < cutoff) continue;
          const key = dt.toISOString().slice(0, 10);
          let revenue = Number(s.total_amount || 0);
          if (!(revenue > 0) && s.id) {
            try {
              const saleItems = await window.electronAPI.database.saleItems.getBySale(s.id);
              revenue = Array.isArray(saleItems)
                ? saleItems.reduce((acc: number, it: any) => acc + (Number(it.line_total ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0), 0)
                : 0;
            } catch { }
          }
          const prev = buckets.get(key) || { sales: 0, revenue: 0 };
          buckets.set(key, { sales: prev.sales + 1, revenue: prev.revenue + revenue });
        }
        const chart = Array.from(buckets.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([date, v]) => ({ date, sales: v.sales, revenue: v.revenue }));
        setChartData(chart);
      } else {
        // Installments mode
        const allInstallments = await window.electronAPI.database.installments.getAll();
        const cutoff = chartRange === 'all' ? new Date(0) : new Date(Date.now() - (chartRange as number) * 24 * 60 * 60 * 1000);
        const buckets = new Map<string, { count: number; balance: number }>();

        for (const inst of allInstallments) {
          const dt = new Date(inst.due_date || Date.now());
          if (dt < cutoff) continue;
          const key = dt.toISOString().slice(0, 10);

          const prev = buckets.get(key) || { count: 0, balance: 0 };
          buckets.set(key, {
            count: prev.count + 1,
            balance: prev.balance + Number(inst.balance || 0)
          });
        }

        const chart = Array.from(buckets.entries())
          .sort((a, b) => a[0] < b[0] ? -1 : 1)
          .map(([date, v]) => ({
            date,
            sales: v.count, // Using the same keys for simplicity in the generic chart UI
            revenue: v.balance
          }));
        setChartData(chart);
      }
    } catch (e) {
      console.error("Error refreshing chart:", e);
    } finally {
      setIsChartLoading(false);
    }
  }, [chartRange, chartMode]);

  useEffect(() => {
    refreshChartOnly();
  }, [refreshChartOnly]);

  useEffect(() => {
    if (isElectron) {
      loadStats();
      setTimeout(() => {
        prefetchAllRoutes();
      }, 200);
      try {
        const unsubscribe = window.electronAPI.database.onChanged((payload: any) => {
          if (payload?.entity === 'sales') {
            loadStats();
          }
        });
        return () => { try { unsubscribe?.(); } catch { } };
      } catch { }
    }
  }, [isElectron, loadStats, prefetchAllRoutes]);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  }, [loadStats]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;


      if (e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        router.push('/sales?action=new');
        return;
      }


      if (e.key.toLowerCase() === 'r' && e.shiftKey) {
        e.preventDefault();
        refreshData();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, refreshData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-8 pb-12">
        {mounted && isElectron && (
          <div className="flex items-center justify-end gap-2 mb-6 text-xs text-green-500/80 font-medium">
            <Database className="h-3 w-3" />
            <span>Base de datos conectada</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4 mb-8">
          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">Ingresos totales</CardTitle>
                {statsComparison && (
                  <Badge variant='outline' className={`text-xs gap-1 rounded-full border border-white/10 bg-white/10 dark:bg-black/10`}>
                    {statsComparison.revenue.percentage >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(statsComparison.revenue.percentage).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl 2xl:text-3xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <div className="mt-2 flex items-center text-sm font-semibold">
                <span>{statsComparison && statsComparison.revenue.percentage >= 0 ? 'Tendencia al alza este mes' : 'Tendencia a la baja este mes'}</span>
                <TrendingUp className="ml-2 h-3 w-3" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Resumen de los últimos 6 meses</p>
            </CardContent>
          </Card>

          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">Clientes</CardTitle>
                {statsComparison && (
                  <Badge variant='outline' className={`text-xs gap-1 rounded-full border border-white/10 bg-white/10 dark:bg-black/10`}>
                    {statsComparison.customers.percentage >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(statsComparison.customers.percentage).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl xl:text-4xl font-bold">{stats.totalCustomers}</div>
              <div className="mt-2 flex items-center text-sm font-semibold">
                <span>{statsComparison && statsComparison.customers.percentage >= 0 ? 'Crecimiento de clientes' : 'Descenso de clientes'}</span>
                <TrendingUp className="ml-2 h-3 w-3" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Adquisición en el período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">Ventas</CardTitle>
                {statsComparison && (
                  <Badge variant='outline' className={`text-xs gap-1 rounded-full border border-white/10 bg-white/10 dark:bg-black/10`}>
                    {statsComparison.sales.percentage >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(statsComparison.sales.percentage).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl xl:text-4xl font-bold">{stats.totalSales}</div>
              <div className="mt-2 flex items-center text-sm font-semibold">
                <span>{statsComparison && statsComparison.sales.percentage >= 0 ? 'Tendencia de ventas en alza' : 'Tendencia de ventas a la baja'}</span>
                <TrendingUp className="ml-2 h-3 w-3" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Actividad del último período</p>
            </CardContent>
          </Card>

          <Card >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs text-muted-foreground">Productos</CardTitle>
                {statsComparison && (
                  <Badge variant='outline' className={`text-xs gap-1 rounded-full border border-white/10 bg-white/10 dark:bg-black/10`}>
                    {statsComparison.products.percentage >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(statsComparison.products.percentage).toFixed(1)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl xl:text-4xl font-bold">{stats.totalProducts}</div>
              <div className="mt-2 flex items-center text-sm font-semibold">
                <span>{statsComparison && statsComparison.products.percentage >= 0 ? 'Stock y catálogo en crecimiento' : 'Catálogo en descenso'}</span>
                <TrendingUp className="ml-2 h-3 w-3" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Inventario y altas recientes</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 mb-8">
          <Card className={cn("transition-all duration-500 overflow-hidden", isChartExpanded ? "lg:col-span-3" : "lg:col-span-2")}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">
                    {chartMode === 'sales' ? 'Rendimiento de Ventas' : 'Rendimiento de Cuotas'}
                  </CardTitle>
                  <CardDescription>
                    {chartMode === 'sales'
                      ? 'Seguimiento de ingresos y volumen de ventas'
                      : 'Análisis de cuotas vencidas y saldos pendientes'}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={chartMode}
                    onValueChange={(v: 'sales' | 'installments') => setChartMode(v)}
                  >
                    <SelectTrigger className="w-[140px] h-9 rounded-xl bg-muted/50 border-none shadow-none font-medium">
                      <SelectValue placeholder="Modo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Ventas</SelectItem>
                      <SelectItem value="installments">Cuotas</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="w-[1px] h-4 bg-border mx-1" />
                  <Select
                    value={String(chartRange)}
                    onValueChange={(v) => {
                      const val = v === 'all' ? 'all' : Number(v) as 7 | 30 | 90;
                      setChartRange(val);
                    }}
                  >
                    <SelectTrigger className="w-[160px] h-9 rounded-xl">
                      <SelectValue placeholder="Periodo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 días</SelectItem>
                      <SelectItem value="30">Últimos 30 días</SelectItem>
                      <SelectItem value="90">Últimos 90 días</SelectItem>
                      <SelectItem value="all">Todo el tiempo</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => setIsChartExpanded(!isChartExpanded)}
                  >
                    {isChartExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => {
                      if (chartData.length === 0) return;
                      const headers = ["Fecha", "Ventas", "Ingresos"];
                      const csvContent = [
                        headers.join(","),
                        ...chartData.map(d => `${d.date},${d.sales},${d.revenue}`)
                      ].join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", `reporte_ventas_${chartRange}.csv`);
                      link.style.visibility = 'hidden';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <ChartContainer
                config={{
                  revenue: {
                    label: chartMode === 'sales' ? 'Ingresos' : 'Saldo total',
                    color: 'hsl(var(--primary))'
                  },
                  sales: {
                    label: chartMode === 'sales' ? 'Ventas' : 'Cant. Cuotas',
                    color: 'hsl(var(--chart-2, 160 60% 45%))'
                  },
                }}
                className={cn("w-full transition-all duration-300", isChartExpanded ? "h-[450px]" : "h-[300px]")}
              >
                <ReAreaChart
                  data={chartData.length > 0 ? chartData : [{ date: "2024-01-01", sales: 0, revenue: 0 }]}
                  margin={{ left: 10, right: 10, top: 20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2, 160 60% 45%))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-2, 160 60% 45%))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.05} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    fontSize={11}
                    tickFormatter={(val) => {
                      const date = new Date(val);
                      return date.toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: chartRange === 7 ? 'short' : 'numeric'
                      });
                    }}
                  />
                  <YAxis
                    yAxisId="left"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(val) => val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`}
                    width={45}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(val) => Math.floor(val).toString()}
                    width={25}
                    hide={!isChartExpanded}
                  />
                  <ChartTooltip
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => new Date(value).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        formatter={(value, name) => (
                          <div className="flex items-center gap-2">
                            <span className="font-bold">
                              {name === 'revenue' ? formatCurrency(Number(value)) : `${value} ventas`}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="sales"
                    name="sales"
                    stroke="hsl(var(--chart-2, 160 60% 45%))"
                    strokeWidth={2}
                    fillOpacity={0.5}
                    fill="url(#colorSales)"
                    activeDot={{ r: 4, strokeWidth: 0 }}
                    hide={!isChartExpanded && chartData.length > 30}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </ReAreaChart>
              </ChartContainer>
              {isChartLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] z-10 animate-in fade-in duration-300">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-xs font-medium text-muted-foreground">Actualizando datos...</span>
                  </div>
                </div>
              )}

              {chartData.length === 0 && !isChartLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-[1px] pointer-events-none">
                  <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm font-medium text-muted-foreground/60">No hay datos suficientes para mostrar el gráfico</p>
                </div>
              )}
            </CardContent>
          </Card>

          {!isChartExpanded && (
            <div className="grid grid-cols-2 gap-4 h-fit">
              <Link href="/sales?action=new" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-sm font-bold">Nueva Venta</span>
                </Card>
              </Link>

              <Link href="/customers?action=new" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <UserPlus className="h-6 w-6 text-blue-500" />
                  </div>
                  <span className="text-sm font-bold">Nuevo Cliente</span>
                </Card>
              </Link>

              <Link href="/invoices" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Receipt className="h-6 w-6 text-orange-500" />
                  </div>
                  <span className="text-sm font-bold">Crear Factura</span>
                </Card>
              </Link>

              <Link href="/products?action=new" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <PackagePlus className="h-6 w-6 text-green-500" />
                  </div>
                  <span className="text-sm font-bold">Añadir Stock</span>
                </Card>
              </Link>

              <Link href="/calendar" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="h-6 w-6 text-purple-500" />
                  </div>
                  <span className="text-sm font-bold">Crear Evento</span>
                </Card>
              </Link>

              <Link href="/calculator" className="block h-full">
                <Card className="h-full cursor-pointer hover:bg-muted/50 transition-all border-dashed hover:border-primary/50 flex flex-col items-center justify-center p-6 text-center group">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calculator className="h-6 w-6 text-teal-500" />
                  </div>
                  <span className="text-sm font-bold">Cotizar Venta</span>
                </Card>
              </Link>
            </div>
          )}
        </div>


        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="col-span-full lg:col-span-2 border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Movimientos Recientes</CardTitle>
                  <CardDescription>Flujo de ventas y nuevos clientes</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">Ver todos</Button>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-3">
                {recentSales.length > 0 ? (
                  recentSales.slice(0, 5).map((sale, index) => (
                    <Link
                      href={`/sales?highlight=${sale.id}`}
                      key={sale.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-card border hover:border-primary/30 hover:shadow-md transition-all group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 transition-colors">
                        <ShoppingCart className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          Venta #{sale.sale_number}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sale.customer_name || 'Consumidor Final'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatCurrency(sale.total_amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-medium">
                          {new Date(sale.created_at || sale.date).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <div className={cn(
                        "w-2 h-10 rounded-full ml-2",
                        sale.payment_status === 'paid' ? "bg-green-500/20" : "bg-orange-500/20"
                      )} />
                    </Link>
                  ))
                ) : (
                  <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No se registran ventas recientes</p>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-full lg:col-span-1 border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div>
                <CardTitle className="text-lg font-bold">Vencimientos</CardTitle>
                <CardDescription>Próximas cuotas a cobrar</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <div className="space-y-3">
                {upcomingInstallments.length > 0 ? (
                  upcomingInstallments.slice(0, 5).map((installment, index) => (
                    <Link
                      href={`/sales?tab=installments&highlight=i-${installment.id}`}
                      key={installment.id}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-card border hover:border-primary/30 hover:shadow-md transition-all group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                          ? 'bg-red-500/10 text-red-600 group-hover:bg-red-500 group-hover:text-white'
                          : 'bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white'
                      )}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {installment.customer_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">
                          {new Date(installment.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(installment.balance)}
                        </p>
                        <Badge variant={
                          new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'destructive'
                            : 'secondary'
                        } className="text-[10px] h-5">
                          {new Date(installment.due_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                            ? 'Vence pronto'
                            : 'Pendiente'}
                        </Badge>
                      </div>
                    </Link>
                  ))
                ) : (
                  <Card className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                    <CreditCard className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium">No hay cuotas próximas</p>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout >
  );
}
