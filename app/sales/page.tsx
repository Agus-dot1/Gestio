'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaleForm } from '@/components/sales/sale-form';
import { SalesTable } from '@/components/sales/sales-table';
import { InstallmentDashboard, InstallmentDashboardRef } from '@/components/sales/installments-dashboard/installment-dashboard';
import { SalesSkeleton } from '@/components/skeletons/sales-skeleton';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, CreditCard, TrendingUp, DollarSign, Calendar, Database, AlertTriangle } from 'lucide-react';
import type { Sale, Product, SaleFormData } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';
import { toast } from 'sonner';
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';


export default function SalesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const highlightId = searchParams.get('highlight');
  const installmentDashboardRef = useRef<InstallmentDashboardRef>(null);
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');
  const [sales, setSales] = useState<Sale[]>([]);
  const [overdueSales, setOverdueSales] = useState<number>(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | undefined>();
  const [isElectron, setIsElectron] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
    try {
      setIsElectron(!!(window as any)?.electronAPI);
    } catch {
      setIsElectron(false);
    }
  }, []);
  const [activeTab, setActiveTab] = useState(() => tabParam || 'sales');
  const [isLoading, setIsLoading] = useState(false); // Start with false for optimistic navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<{ total: number; totalPages: number; currentPage: number; pageSize: number } | undefined>(undefined);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const pageSize = 25;
  const dataCache = useDataCache();
  const { prefetchCustomers, prefetchProducts } = usePrefetch();


  const loadOverdueSales = useCallback(async () => {
    try {
      if (!isElectron || !window.electronAPI?.database?.sales?.getOverdueSalesCount) {
        setOverdueSales(0);
        return;
      }
      const overdueCount = await window.electronAPI.database.sales.getOverdueSalesCount();
      setOverdueSales(overdueCount ?? 0);
    } catch (error) {
      console.error('Error cargando pagos atrasados:', error);
      setOverdueSales(0);
    }
  }, [isElectron]);


  const loadSales = useCallback(async (forceRefresh = false) => {
    try {


      const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
      const isCacheExpired = dataCache.isSalesCacheExpired(currentPage, pageSize, searchTerm);

      if (cachedData && !forceRefresh) {


        setSales(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
        setIsLoading(false);



        if (!isCacheExpired) {


          setTimeout(() => {
            prefetchCustomers();
            prefetchProducts();
          }, 100);
          return;
        }


      } else {


        if (sales.length === 0) {
          setIsLoading(true);
        }
      }
      console.time('loadSales_db');
      const result = await window.electronAPI.database.sales.getPaginated(currentPage, pageSize, searchTerm);
      console.timeEnd('loadSales_db');


      setSales(result.sales);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });



      dataCache.setCachedSales(currentPage, pageSize, searchTerm, {
        items: result.sales,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });



      setTimeout(() => {
        prefetchCustomers();
        prefetchProducts();
      }, 100);

    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataCache, currentPage, pageSize, searchTerm, prefetchCustomers, prefetchProducts, sales.length]);

  useEffect(() => {
    if (isElectron) {


      const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
      if (cachedData) {


        setSales(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {


        setIsLoading(true);
      }



      loadSales();
      loadOverdueSales();

    }
  }, [isElectron, dataCache, currentPage, pageSize, searchTerm, loadSales, loadOverdueSales]);

  useEffect(() => {
    if (actionParam === 'new') {
      setEditingSale(undefined);
      setIsFormOpen(true);
    }
  }, [actionParam]);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);



  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isElectron) {
        setCurrentPage(1);
        loadSales();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, isElectron, loadSales]);



  useEffect(() => {
    if (isElectron && sales.length > 0) {


      setTimeout(() => {
        loadSales();
      }, 0);
    }
  }, [currentPage, isElectron, sales.length, loadSales]);


  const highlightedSale = useMemo(() => {
    if (!highlightId) return null;
    return sales.find(sale => sale.id?.toString() === highlightId);
  }, [sales, highlightId]);

  useEffect(() => {
    if (highlightedSale) {


      setTimeout(() => {
        const element = document.getElementById(`venta-${highlightedSale.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });


          element.classList.add('bg-primary/10', 'animate-pulse');
          setTimeout(() => {
            element.classList.remove('bg-primary/10', 'animate-pulse');
          }, 1500);
        }
      }, 100);
    }
  }, [highlightedSale]);



  const handleSaveSale = async (saleData: SaleFormData) => {
    try {
      if (editingSale?.id) {


        const updateData = {
          customer_id: saleData.customer_id,
          notes: saleData.notes,
          date: saleData.date
        };
        await window.electronAPI.database.sales.update(editingSale.id, updateData);
        toast.success('Venta actualizada correctamente');
      } else {


        await window.electronAPI.database.sales.create(saleData);
        toast.success('Venta creada correctamente');



      }



      dataCache.invalidateCache('sales');


      dataCache.invalidateCache('products');
      await loadSales(true);
      await loadOverdueSales();



      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }



      setEditingSale(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando venta:', error);
      toast.error('Error guardando la venta');
      throw error; // Re-throw to let the form handle the error
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  };

  const handleDeleteSale = async (saleId: number) => {
    try {
      await window.electronAPI.database.sales.delete(saleId);


      setSales(prev => prev.filter(p => p.id !== saleId));
      dataCache.invalidateCache('sales');



      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Venta eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando la venta');
    }
  };

  const handleBulkDeleteSales = async (saleIds: number[]) => {
    try {


      for (const saleId of saleIds) {
        await window.electronAPI.database.sales.delete(saleId);
        setSales(prev => prev.filter(p => p.id !== saleId));
      }


      dataCache.invalidateCache('sales');
      toast.success(`Ventas eliminadas: ${saleIds.length}`);
    } catch (error) {
      console.error('Error eliminando ventas:', error);
      toast.error('Error eliminando las ventas seleccionadas');
      throw error;
    }
  };

  const handleBulkStatusUpdate = async (saleIds: number[], status: Sale['payment_status']) => {
    try {


      for (const saleId of saleIds) {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          await window.electronAPI.database.sales.update(saleId, {
            ...sale,
            payment_status: status
          });
        }
      }


      dataCache.invalidateCache('sales');
      await loadSales();
      await loadOverdueSales();
      const statusLabel = status === 'paid' ? 'Pagadas' : 'Pendientes';
      toast.success(`Estado actualizado a ${statusLabel}`);
    } catch (error) {
      console.error('Error actualizando estado de ventas:', error);
      toast.error('Error actualizando el estado de las ventas');
      throw error;
    }
  };

  const handleAddSale = () => {
    setEditingSale(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingSale(undefined);


      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.delete('action');
      const query = params.toString();
      router.replace(query ? `/sales?${query}` : '/sales');
    }
  };



  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleAddSale();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const addMockSales = async () => {
    try {


      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0) {
        console.error('No customers found. Please add customers first.');
        return;
      }

      if (products.length === 0) {
        console.error('No products found. Please add products first.');
        return;
      }

      const mockSales: SaleFormData[] = [
        {
          customer_id: customers[0]?.id || 1,
          items: [
            {
              product_id: products[0]?.id || 1,
              quantity: 2,
              unit_price: products[0]?.price || 159990,
            },
            {
              product_id: products[1]?.id || 2,
              quantity: 1,
              unit_price: products[1]?.price || 49990,
            }
          ],
          payment_type: 'cash',
          notes: 'Venta de prueba - Cliente frecuente'
        },
        {
          customer_id: customers[1]?.id || 2,
          items: [
            {
              product_id: products[2]?.id || 3,
              quantity: 3,
              unit_price: products[2]?.price || 25990,
            }
          ],
          payment_type: 'installments',
          number_of_installments: 6,
          notes: 'Venta en cuotas - 6 meses'
        },
        {
          customer_id: customers[2]?.id || 3,
          items: [
            {
              product_id: products[3]?.id || 4,
              quantity: 1,
              unit_price: products[3]?.price || 91990,
            },
            {
              product_id: products[4]?.id || 5,
              quantity: 2,
              unit_price: products[4]?.price || 59990,
            }
          ],
          payment_type: 'cash',
          notes: 'Venta a crédito - Descuento por volumen'
        },
        {
          customer_id: customers[3]?.id || 4,
          items: [
            {
              product_id: products[5]?.id || 6,
              quantity: 1,
              unit_price: products[5]?.price || 179990,
            }
          ],
          payment_type: 'installments',
          number_of_installments: 12,
          notes: 'Plan de cuotas extendido - 12 meses'
        },
        {
          customer_id: customers[4]?.id || 5,
          items: [
            {
              product_id: products[0]?.id || 1,
              quantity: 1,
              unit_price: products[0]?.price || 159990,
            },
            {
              product_id: products[6]?.id || 7,
              quantity: 3,
              unit_price: products[6]?.price || 19990,
            }
          ],
          payment_type: "cash",
        },
        {
          customer_id: customers[5]?.id || 6,
          items: [
            {
              product_id: products[1]?.id || 2,
              quantity: 5,
              unit_price: products[1]?.price || 49990,
            }
          ],
          payment_type: 'cash',
          notes: 'Compra al por mayor - Descuento por cantidad'
        },
        {
          customer_id: customers[6]?.id || 7,
          items: [
            {
              product_id: products[2]?.id || 3,
              quantity: 2,
              unit_price: products[2]?.price || 25990,

            },
            {
              product_id: products[3]?.id || 4,
              quantity: 1,
              unit_price: products[3]?.price || 91990,

            }
          ],
          payment_type: 'installments',
          number_of_installments: 3,

          notes: 'Plan de cuotas corto - 3 meses'
        },
        {
          customer_id: customers[7]?.id || 8,
          items: [
            {
              product_id: products[4]?.id || 5,
              quantity: 1,
              unit_price: products[4]?.price || 59990,

            }
          ],
          payment_type: 'cash',
          notes: 'Venta rápida - Descuento por pronto pago'
        }
      ];



      for (const saleData of mockSales) {
        await window.electronAPI.database.sales.create(saleData);
      }



      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      toast.success('Datos de prueba cargados correctamente');
    } catch (error) {
      console.error('Error adding mock sales:', error);
      toast.error('Error al cargar datos de prueba');
    }
  };

  const handleRefreshInstallments = useCallback(() => {
    dataCache.invalidateCache('sales');
    loadSales();
    loadOverdueSales();
  }, [dataCache, loadSales, loadOverdueSales]);

  const addTimeSpanSales = async () => {
    try {
      if (!(window as any)?.electronAPI?.database) {
        toast.error('Entorno no soportado: APIs de Electron no disponibles');
        return;
      }
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();
      if (customers.length === 0 || products.length === 0) {
        toast.error('Necesitas al menos un cliente y un producto');
        return;
      }
      const pickCustomer = () => customers[Math.floor(Math.random() * customers.length)];
      const pickProduct = () => products[Math.floor(Math.random() * products.length)];
      const makeISO = (d: Date) => d.toISOString();
      const now = new Date();
      const createSaleOn = async (date: Date) => {
        const c = pickCustomer();
        const p = pickProduct();
        const qty = Math.max(1, Math.floor(Math.random() * 3));
        const price = Number(p?.price) || 10000;
        const paymentType = Math.random() < 0.25 ? 'installments' : 'cash';
        const numberOfInstallments = paymentType === 'installments' ? (Math.random() < 0.5 ? 3 : 6) : undefined;
        const saleData: any = {
          customer_id: c.id!,
          items: [
            { product_id: p?.id ?? null, quantity: qty, unit_price: price }
          ],
          payment_type: paymentType,
          number_of_installments: numberOfInstallments,
          notes: 'Generada para pruebas de gráfico',
          date: makeISO(date)
        };
        await window.electronAPI.database.sales.create(saleData);
      };
      const generateBatch = async (count: number, maxDaysAgo: number) => {
        const tasks: Promise<any>[] = [];
        for (let i = 0; i < count; i++) {
          const daysAgo = Math.floor(Math.random() * maxDaysAgo);
          const d = new Date(now);
          d.setDate(now.getDate() - daysAgo);
          d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0, 0);
          tasks.push(createSaleOn(d));
        }
        await Promise.all(tasks);
      };
      await generateBatch(12, 7);
      await generateBatch(24, 30);
      await generateBatch(18, 90);
      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      toast.success('Ventas generadas en distintos períodos');
    } catch (error) {
      console.error('Error generando ventas por períodos:', error);
      toast.error('Error generando ventas por períodos');
    }
  };



  const addOverdueInstallmentSale = async () => {
    try {
      if (!(window as any)?.electronAPI?.database) {
        toast.error('Entorno no soportado: APIs de Electron no disponibles');
        return;
      }
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0 || products.length === 0) {
        toast.error('Necesitas al menos un cliente y un producto');
        return;
      }

      const saleData: SaleFormData = {
        customer_id: customers[0]?.id!,
        items: [
          {
            product_id: products[0]?.id ?? null,
            quantity: 1,
            unit_price: Number(products[0]?.price) || 10000, // Coerción robusta
          }
        ],
        payment_type: 'installments',
        number_of_installments: 6,
        notes: 'Venta de prueba con primera cuota vencida'
      };

      const saleId = await window.electronAPI.database.sales.create(saleData);

      const installments = await window.electronAPI.database.installments.getBySale(saleId);
      if (installments && installments.length > 0) {
        const first = [...installments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0))[0];
        const now = new Date();
        const past = new Date(now);
        past.setMonth(now.getMonth() - 1);
        const pastDate = past.toISOString().split('T')[0];
        await window.electronAPI.database.installments.update(first.id!, { due_date: pastDate, status: 'overdue' });
      }

      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Venta en cuotas con primera cuota atrasada creada');
    } catch (error) {
      console.error('Error creando venta atrasada:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error creando la venta atrasada: ${message}`);
    }
  };



  const addCurrentMonthPendingInstallment = async () => {
    try {
      if (!(window as any)?.electronAPI?.database) {
        toast.error('Entorno no soportado: APIs de Electron no disponibles');
        return;
      }
      const customers = await window.electronAPI.database.customers.getAll();
      const products = await window.electronAPI.database.products.getAll();

      if (customers.length === 0 || products.length === 0) {
        toast.error('Necesitas al menos un cliente y un producto');
        return;
      }

      const firstCustomer = customers[0]!;
      const unitPrice = Number(products[0]?.price) || 10000;

      const saleData: SaleFormData = {
        customer_id: firstCustomer.id!,
        items: [
          { product_id: products[0]?.id ?? null, quantity: 1, unit_price: unitPrice }
        ],
        payment_type: 'installments',
        number_of_installments: 6,
        notes: 'Venta de prueba con cuota pendiente en el mes actual'
      };

      const saleId = await window.electronAPI.database.sales.create(saleData);

      const installments = await window.electronAPI.database.installments.getBySale(saleId);
      if (installments && installments.length > 0) {
        // Base: current month at customer's window anchor day
        const now = new Date();
        const anchorDay = 30;

        // Reprogram all pending installments to current month + sequential months
        const sorted = [...installments].sort((a, b) => (a.installment_number || 0) - (b.installment_number || 0));
        for (let idx = 0; idx < sorted.length; idx++) {
          const inst = sorted[idx];
          if (inst.status === 'paid') continue;
          const targetMonthIndex = now.getMonth() + idx; // idx=0 -> current month
          const targetYear = now.getFullYear() + Math.floor(targetMonthIndex / 12);
          const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
          const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
          const day = Math.min(anchorDay, lastDay);
          const iso = new Date(targetYear, normalizedMonth, day).toISOString().split('T')[0];
          await window.electronAPI.database.installments.update(inst.id!, { due_date: iso, status: 'pending' });
        }
      }

      dataCache.invalidateCache('sales');
      await loadSales(true);
      await loadOverdueSales();
      if (installmentDashboardRef.current) {
        installmentDashboardRef.current.refreshData();
      }
      toast.success('Cuota pendiente de este mes creada');
    } catch (error) {
      console.error('Error creando cuota pendiente este mes:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error creando la cuota pendiente: ${message}`);
    }
  };



  const now = new Date();
  const calcSaleTotal = (sale: Sale) => {
    const direct = Number((sale as any).total_amount ?? 0);
    if (direct > 0) return direct;
    const items = Array.isArray((sale as any).items) ? (sale as any).items : [];
    return items.reduce((acc: number, it: any) => acc + (Number(it.line_total ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0), 0);
  };
  const monthlyRevenue = sales.reduce((sum, sale) => {
    const d = new Date((sale as any).date || (sale as any).created_at || '');
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      ? sum + calcSaleTotal(sale)
      : sum;
  }, 0);

  const stats = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, sale) => sum + calcSaleTotal(sale), 0),
    monthlyRevenue,
    installmentSales: sales.filter(sale => sale.payment_type === 'installments').length,
    overdueSales: overdueSales,
    paidSales: sales.filter(sale => sale.payment_status === 'paid').length,
    pendingSales: sales.filter(sale => sale.payment_status === 'unpaid').length
  };



  if (!hasHydrated) {
    return <SalesSkeleton />;
  }



  if (!isElectron) {
    return <SalesSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-8 short:p-4">
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);


          if (value === 'sales') {
            dataCache.invalidateCache('sales');
            loadSales();
            loadOverdueSales();
            setRefreshCounter(prev => prev + 1);
          }
        }} className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Todas las ventas</TabsTrigger>
            <TabsTrigger value="installments">Cuotas</TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4">
            {/* Actions Toolbar */}
            <div className="mb-6 flex items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-3xl border border-border/40 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-2xl">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Registro de Ventas</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                      Ventas Mes: ${stats.monthlyRevenue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    {stats.overdueSales > 0 && (
                      <>
                        <div className="w-1 h-1 rounded-full bg-red-500/40" />
                        <Badge variant="destructive" className="h-5 text-[9px] px-2 rounded-lg bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20 animate-pulse">
                          {stats.overdueSales} DEUDAS PENDIENTES
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                {SHOW_MOCK_BUTTONS && (
                  <div className="flex gap-2">
                    <Button
                      onClick={addMockSales}
                      variant="outline"
                      disabled={!isElectron}
                      className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
                    >
                      <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                      Cargar datos
                    </Button>
                    <Button
                      onClick={addTimeSpanSales}
                      variant="outline"
                      disabled={!isElectron}
                      className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
                    >
                      <TrendingUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      Histórico
                    </Button>
                    <Button
                      onClick={addOverdueInstallmentSale}
                      variant="outline"
                      disabled={!isElectron}
                      className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4 text-muted-foreground" />
                      Deuda
                    </Button>
                    <Button
                      onClick={addCurrentMonthPendingInstallment}
                      variant="outline"
                      disabled={!isElectron}
                      className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
                    >
                      <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                      Cuota Mes
                    </Button>
                  </div>
                )}
                <Button
                  onClick={handleAddSale}
                  disabled={!isElectron}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold text-xs flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Venta
                </Button>
              </div>
            </div>

            {/* Sales Table */}
            <div>
              <SalesTable
                key={refreshCounter}
                sales={sales}
                highlightId={highlightId}
                onEdit={handleEditSale}
                onDelete={handleDeleteSale}
                onBulkDelete={handleBulkDeleteSales}
                onBulkStatusUpdate={handleBulkStatusUpdate}
                isLoading={isLoading}
                currentPage={currentPage}
                onPageChange={(page) => setCurrentPage(page)}
                paginationInfo={paginationInfo}
                serverSidePagination={false}
              />
            </div>
          </TabsContent>

          <TabsContent value="installments" className="-m-8">
            <div className="px-8">
              <InstallmentDashboard
                ref={installmentDashboardRef}
                highlightId={highlightId}
                onRefresh={handleRefreshInstallments}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Sale Form Dialog */}
        <SaleForm
          sale={editingSale}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveSale}
        />
      </div>
    </DashboardLayout>
  );
}
