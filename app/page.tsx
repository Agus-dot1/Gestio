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
} from "@/components/ui/chart";
import {
  AreaChart as ReAreaChart,
  Area,
  XAxis,
  CartesianGrid
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
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        try {
          const allSales = await window.electronAPI.database.sales.getAll();
          const cutoff = chartRange === 'all' ? new Date(0) : new Date(Date.now() - chartRange * 24 * 60 * 60 * 1000);
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

          // Compute comparisons for cards
          const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const nowD = new Date();
          const currentKey = monthKey(nowD);
          const prevD = new Date(nowD.getFullYear(), nowD.getMonth() - 1, 1);
          const prevKey = monthKey(prevD);
          let currentRevenue = 0, previousRevenue = 0, currentSalesCount = 0, previousSalesCount = 0;
          for (const s of allSales) {
            const dt = new Date(s.date || s.created_at || Date.now());
            const key = monthKey(dt);
            let rev = Number(s.total_amount || 0);
            if (!(rev > 0) && s.id) {
              try {
                const saleItems = await window.electronAPI.database.saleItems.getBySale(s.id);
                rev = Array.isArray(saleItems) ? saleItems.reduce((acc: number, it: any) => acc + (Number(it.line_total ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0), 0) : 0;
              } catch { }
            }
            if (key === currentKey) { currentRevenue += rev; currentSalesCount += 1; }
            else if (key === prevKey) { previousRevenue += rev; previousSalesCount += 1; }
          }
          const pct = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
          const salesPct = pct(currentSalesCount, previousSalesCount);
          const revenuePct = pct(currentRevenue, previousRevenue);

          const custChange = customersComparison ? (customersComparison.previous === 0 ? (customersComparison.current > 0 ? 100 : 0) : customersComparison.change) : 0;
          const prodChange = productsComparison ? (productsComparison.previous === 0 ? (productsComparison.current > 0 ? 100 : 0) : productsComparison.change) : 0;
          setStatsComparison({
            sales: { current: currentSalesCount, previous: previousSalesCount, percentage: salesPct },
            revenue: { current: currentRevenue, previous: previousRevenue, percentage: revenuePct },
            customers: { current: customersComparison.current, previous: customersComparison.previous, percentage: custChange },
            products: { current: productsComparison.current, previous: productsComparison.previous, percentage: prodChange },
          });
        } catch {
          setChartData(salesChartData);
        }


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
  }, [prefetchAllRoutes]);

  const refreshChartOnly = useCallback(async () => {
    if (!window.electronAPI) return;
    try {
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
    } catch { }
  }, [chartRange]);

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
        {isElectron && (
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
                  <CardTitle className="text-base font-bold">Ventas e Ingresos</CardTitle>
                  <CardDescription>Resumen del rendimiento comercial</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={String(chartRange)}
                    onValueChange={(v) => {
                      const val = v === 'all' ? 'all' : Number(v) as 7 | 30 | 90;
                      setChartRange(val);
                      refreshChartOnly();
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

                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  revenue: { label: 'Ingresos', color: 'hsl(var(--primary))' },
                }}
                className={cn("w-full transition-all duration-300", isChartExpanded ? "h-[450px]" : "h-[300px]")}
              >
                <ReAreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={12}
                    fontSize={11}
                    tickFormatter={(val) => new Date(val).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  />
                  <ChartTooltip content={<ChartTooltipContent nameKey="revenue" />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </ReAreaChart>
              </ChartContainer>
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
    </DashboardLayout>
  );
}
