'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';

// Stores & Hooks
import {
  useSalesUIStore,
  selectFilters,
  selectDialogs,
  selectHighlight,
  selectTabs
} from '@/context/stores/sales-ui-store';
import { useQuery } from '@/hooks/use-data-cache';
import { useSalesOperations } from '@/hooks/user-sales-operations';

// Components
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaleForm } from '@/components/sales/sale-form';
import { SalesTable } from '@/components/sales/sales-table';
import { InstallmentDashboard } from '@/components/sales/installments-dashboard/installment-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus } from 'lucide-react';

// Types
import type { Sale, SaleFormData } from '@/lib/database-operations';
import { Badge } from '@/components/ui/badge';
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';

const PAGE_SIZE = 25;

export default function SalesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Basic state
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);

  // ✅ Zustand state (organized by concern)
  const {
    currentPage,
    debouncedSearch,
    setDebouncedSearch,
    searchTerm,
    setSearchTerm,
    setCurrentPage,
  } = useSalesUIStore(useShallow(selectFilters));

  const {
    isFormOpen,
    editingSale,
    setIsFormOpen,
  } = useSalesUIStore(useShallow(selectDialogs));

  const {
    stickyHighlight,
    setStickyHighlight,
  } = useSalesUIStore(useShallow(selectHighlight));

  const {
    activeTab,
    setActiveTab,
  } = useSalesUIStore(useShallow(selectTabs));

  // ✅ Declarative data fetching
  const fetchSales = useCallback(async () => {
    const result = await window.electronAPI.database.sales.getPaginated(
      currentPage,
      PAGE_SIZE,
      debouncedSearch
    );
    return {
      items: result.sales,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      pageSize: result.pageSize || PAGE_SIZE,
    };
  }, [currentPage, debouncedSearch]);

  const { data, isLoading } = useQuery({
    key: ['sales', currentPage, PAGE_SIZE, debouncedSearch],
    fetchFn: fetchSales,
    enabled: isElectron,
  });

  // Fetch overdue sales count
  const fetchOverdueSales = useCallback(async () => {
    if (!window.electronAPI?.database?.sales?.getOverdueSalesCount) {
      return 0;
    }
    return await window.electronAPI.database.sales.getOverdueSalesCount();
  }, []);

  const { data: overdueSales } = useQuery({
    key: ['sales', 'overdue-count'],
    fetchFn: fetchOverdueSales,
    enabled: isElectron,
  });

  // ✅ Operations hook
  const operations = useSalesOperations();

  // ✅ Derived state
  const sales = data?.items ?? [];
  const paginationInfo = data ? {
    total: data.total,
    totalPages: data.totalPages,
    currentPage: data.currentPage,
    pageSize: data.pageSize,
  } : undefined;

  // ✅ Stats calculation
  const stats = useMemo(() => {
    const now = new Date();
    const calcSaleTotal = (sale: Sale) => {
      const direct = Number(sale.total_amount ?? 0);
      if (direct > 0) return direct;
      const items = sale.items ?? [];
      return items.reduce((acc: number, it: any) =>
        acc + (Number(it.line_total ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0), 0);
    };

    const monthlyRevenue = sales.reduce((sum: number, sale: Sale) => {
      const d = new Date(sale.date || sale.created_at || '');
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        ? sum + calcSaleTotal(sale)
        : sum;
    }, 0);

    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum: number, sale: Sale) => sum + calcSaleTotal(sale), 0),
      monthlyRevenue,
      installmentSales: sales.filter((sale: Sale) => sale.payment_type === 'installments').length,
      overdueSales: overdueSales ?? 0,
      paidSales: sales.filter((sale: Sale) => sale.payment_status === 'paid').length,
      pendingSales: sales.filter((sale: Sale) => sale.payment_status === 'unpaid').length
    };
  }, [sales, overdueSales]);

  // ✅ Effects (minimal)

  // Handler for viewing installments
  const handleViewSaleInstallments = useCallback((saleId: number) => {
    setActiveTab('installments');
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'installments');
    params.set('highlight', `s-${saleId}`);
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, searchParams, pathname, setActiveTab]);

  // Handle debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, setDebouncedSearch, setCurrentPage]);

  // Handle tab from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam as 'sales' | 'installments');
    }
  }, [searchParams, setActiveTab]);

  // Handle action param (new sale)
  useEffect(() => {
    const actionParam = searchParams.get('action');
    if (actionParam === 'new') {
      operations.handleAddSale();
    }
  }, [searchParams, operations]);

  // Handle highlight from URL
  useEffect(() => {
    const highlightIdFromUrl = searchParams.get('highlight');
    if (highlightIdFromUrl) {
      setStickyHighlight(highlightIdFromUrl);

      // Find page for highlighted sale
      if (!isNaN(Number(highlightIdFromUrl)) && isElectron) {
        window.electronAPI.database.sales.getPageNumber(
          Number(highlightIdFromUrl),
          PAGE_SIZE,
          debouncedSearch
        )
          .then((page: number) => {
            if (page !== currentPage) {
              setCurrentPage(page);
            }
          })
          .catch((err: any) => console.error('Error finding page for highlight:', err));
      }

      // Clean URL
      const params = new URLSearchParams(searchParams);
      params.delete('highlight');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [pathname, router, searchParams, isElectron, debouncedSearch, setStickyHighlight, currentPage, setCurrentPage]);

  // Keyboard shortcut for new sale
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        operations.handleAddSale();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [operations]);

  // ✅ Render (clean and simple)
  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
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
            <Button
              onClick={operations.handleAddSale}
              disabled={!isElectron}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold text-xs flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Venta
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'installments')}>
          <TabsList>
            <TabsTrigger value="sales">
              Ventas ({stats.totalSales})
            </TabsTrigger>
            <TabsTrigger value="installments">
              Cuotas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="mt-6">
            <SalesTable
              sales={sales}
              isLoading={isLoading}
              paginationInfo={paginationInfo}
              highlightId={stickyHighlight}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onEdit={operations.handleEditSale}
              onDelete={operations.handleDeleteSale}
              onBulkDelete={operations.handleBulkDeleteSales}
              onBulkStatusUpdate={operations.handleBulkStatusUpdate}
              onViewInstallments={handleViewSaleInstallments}
            />
          </TabsContent>

          <TabsContent value="installments" className="mt-6">
            <InstallmentDashboard
              highlightId={stickyHighlight}
            />
          </TabsContent>
        </Tabs>

        {/* Sale Form Dialog */}
        <SaleForm
          sale={editingSale}
          open={isFormOpen}
          onOpenChange={operations.handleFormClose}
          onSave={operations.handleSaveSale}
        />
      </div>
    </DashboardLayout>
  );
}