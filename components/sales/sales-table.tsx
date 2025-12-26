'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, MoreHorizontal, Edit, Trash2, Eye, CreditCard, Calendar, DollarSign, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Package, Plus, User } from 'lucide-react';
import { usePersistedState } from '@/hooks/use-persisted-state';

import type { Sale } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesBulkOperations } from './sales-bulk-operations';
import { SalesColumnToggle, type ColumnVisibility } from './sales-column-toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import dynamic from 'next/dynamic';
import { DataTablePagination } from '../ui/data-table-pagination';

const SaleDetailModal = dynamic(() => import('./sale-detail-modal').then(m => m.SaleDetailModal), {
  ssr: false,
});
import { ButtonGroup } from '../ui/button-group';
import { SalesFilters, SalesFiltersComponent, applySalesFilters } from './sales-filters';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { formatCurrency } from '@/config/locale';

interface SalesTableProps {
  sales: Sale[];
  highlightId?: string | null;
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: number) => void;
  onBulkDelete?: (saleIds: number[]) => Promise<void>;
  onBulkStatusUpdate?: (saleIds: number[], status: Sale['payment_status']) => Promise<void>;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationInfo?: { total: number; totalPages: number; currentPage: number; pageSize: number };
  serverSidePagination?: boolean;
  onViewInstallments?: (saleId: number) => void;
}

export function SalesTable({
  sales,
  highlightId,
  onEdit,
  onDelete,
  onBulkDelete,
  onBulkStatusUpdate,
  isLoading = false,
  searchTerm: _externalSearchTerm,
  onSearchChange: _onSearchChange,
  currentPage,
  onPageChange,
  paginationInfo,
  serverSidePagination = false,
  onViewInstallments
}: SalesTableProps) {


  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // 1. Initial Highlight States from localStorage
  const [stickyHighlight, setStickyHighlight] = usePersistedState<string | null>('stickyHighlight-sales', null);

  // 2. Auto-scroll preference state
  const [autoScrollEnabled, setAutoScrollEnabled] = usePersistedState<boolean>('gestio-auto-scroll', true);

  // 3. Initial State from URL
  const highlightIdFromUrl = searchParams.get('highlight');

  // 4. Source of Truth
  const activeHighlight = highlightIdFromUrl || stickyHighlight;

  // 5. Automatic Persistence & URL Cleaning
  useEffect(() => {
    if (highlightIdFromUrl) {
      setStickyHighlight(highlightIdFromUrl);
      // Clean the URL without reloading
      const params = new URLSearchParams(searchParams);
      params.delete('highlight');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [highlightIdFromUrl, pathname, router, searchParams]);

  const handleClearHighlight = () => {
    setStickyHighlight(null);
    if (highlightIdFromUrl) {
      const params = new URLSearchParams(searchParams);
      params.delete('highlight');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  // 6. Scroll to highlighted item
  useEffect(() => {
    // Only scroll if autoScrollEnabled is true AND we have an activeHighlight
    // We use a small delay to ensure the element is rendered (especially after tab changes)
    if (activeHighlight && autoScrollEnabled) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`venta-${activeHighlight}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeHighlight, autoScrollEnabled]);

  const SALES_PERSIST_KEY = 'salesTablePrefs';

  const [prefs, setPrefs] = usePersistedState<{
    salesFilters: SalesFilters;
    columnVisibility: ColumnVisibility;
  }>(
    SALES_PERSIST_KEY,
    {
      salesFilters: {
        search: '',
        sortBy: 'date',
        sortOrder: 'desc',
        paymentStatus: [],
        paymentType: [],
        minAmount: null,
        maxAmount: null,
        dateAfter: null,
        dateBefore: null
      },
      columnVisibility: {
        sale_number: true,
        customer_name: true,
        date: true,
        payment_type: true,
        total_amount: true,
        payment_status: true,
        reference_code: true
      }
    },
    {
      deserialize: (raw) => {
        const parsed = JSON.parse(raw);
        if (parsed.salesFilters) {
          if (parsed.salesFilters.dateAfter) parsed.salesFilters.dateAfter = new Date(parsed.salesFilters.dateAfter);
          if (parsed.salesFilters.dateBefore) parsed.salesFilters.dateBefore = new Date(parsed.salesFilters.dateBefore);
        }
        return parsed;
      }
    }
  );

  const salesFilters = prefs.salesFilters;
  const setSalesFilters = (value: SalesFilters | ((curr: SalesFilters) => SalesFilters)) => {
    setPrefs(prev => ({
      ...prev,
      salesFilters: typeof value === 'function' ? value(prev.salesFilters) : value
    }));
  };

  const columnVisibility = prefs.columnVisibility;
  const setColumnVisibility = (value: ColumnVisibility | ((curr: ColumnVisibility) => ColumnVisibility)) => {
    setPrefs(prev => ({
      ...prev,
      columnVisibility: typeof value === 'function' ? value(prev.columnVisibility) : value
    }));
  };

  const [deleteSale, setDeleteSale] = useState<Sale | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [detailSale, setDetailSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);



  const visibleSales = useMemo(() => {
    if (!serverSidePagination) {
      return applySalesFilters(sales, salesFilters);
    }
    const sorted = [...sales];
    const getSaleTotal = (s: Sale) => {
      const direct = Number(s.total_amount ?? 0);
      if (direct > 0) return direct;
      const items = Array.isArray(s.items) ? s.items : [];
      const sum = items.reduce((acc, it: any) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0);
      return sum;
    };

    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (salesFilters.sortBy) {
        case 'sale_number':
          aValue = a.sale_number;
          bValue = b.sale_number;
          break;
        case 'customer_name':
          aValue = a.customer_name || '';
          bValue = b.customer_name || '';
          break;
        case 'date':
          aValue = new Date(a.date || 0);
          bValue = new Date(b.date || 0);
          break;
        case 'total_amount':
          aValue = getSaleTotal(a);
          bValue = getSaleTotal(b);
          break;
        case 'payment_status':
          aValue = a.payment_status;
          bValue = b.payment_status;
          break;
        case 'payment_type':
          aValue = a.payment_type;
          bValue = b.payment_type;
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (aValue < bValue) return salesFilters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return salesFilters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sales, salesFilters, serverSidePagination]);



  const deleteSaleAction = async () => {
    if (deleteSale?.id) {
      await onDelete(deleteSale.id);
      setDeleteSale(null);

      setSelectedSales(prev => {
        const newSet = new Set(prev);
        newSet.delete(deleteSale.id!);
        return newSet;
      });
    }
  };

  const handleDelete = async () => {
    await deleteSaleAction();
  };

  const handleSelectSale = (saleId: number | undefined, checked: boolean) => {
    if (saleId === undefined) return;

    const newSelected = new Set(selectedSales);
    if (checked) {
      newSelected.add(saleId);
    } else {
      newSelected.delete(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {




    const list = visibleSales;
    if (checked) {
      setSelectedSales(new Set(list.map(s => s.id).filter(id => id !== undefined) as number[]));
    } else {
      setSelectedSales(new Set());
    }
  };

  const isAllSelected = (() => {


    const list = visibleSales;
    return list.length > 0 && selectedSales.size === list.filter(s => s.id !== undefined).length;
  })();



  const handleSort = (key: keyof Sale) => {
    const mapKeyToFilterSortBy = (k: keyof Sale): SalesFilters['sortBy'] => {
      switch (k) {
        case 'sale_number':
          return 'sale_number';
        case 'reference_code':
          return 'reference_code';
        case 'customer_name':
          return 'customer_name';
        case 'date':
          return 'date';
        case 'payment_type':
          return 'payment_type';
        case 'total_amount':
          return 'total_amount';
        case 'payment_status':
          return 'payment_status';
        default:
          return 'date';
      }
    };
    const targetSortBy = mapKeyToFilterSortBy(key);
    setSalesFilters(prev => ({
      ...prev,
      sortBy: targetSortBy,
      sortOrder: prev.sortBy === targetSortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  };



  const getSortIcon = (key: keyof Sale) => {
    const mapKeyToFilterSortBy = (k: keyof Sale): SalesFilters['sortBy'] => {
      switch (k) {
        case 'sale_number':
          return 'sale_number';
        case 'reference_code':
          return 'reference_code';
        case 'customer_name':
          return 'customer_name';
        case 'date':
          return 'date';
        case 'payment_type':
          return 'payment_type';
        case 'total_amount':
          return 'total_amount';
        case 'payment_status':
          return 'payment_status';
        default:
          return 'date';
      }
    };
    const targetSortBy = mapKeyToFilterSortBy(key);
    if (salesFilters.sortBy !== targetSortBy) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return salesFilters.sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleBulkDelete = async (saleIds: number[]) => {
    if (onBulkDelete) {
      await onBulkDelete(saleIds);
    }
  };

  const handleBulkStatusUpdate = async (saleIds: number[], status: Sale['payment_status']) => {
    if (onBulkStatusUpdate) {
      await onBulkStatusUpdate(saleIds, status);
    }
  };

  const clearSelection = () => {
    setSelectedSales(new Set());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusLabels = {
      paid: 'Pagado',
      partial: 'Parcial',
      unpaid: 'Sin pagar',
      overdue: 'Vencido'
    } as const;

    const getStyles = (s: string) => {
      switch (s) {
        case 'paid':
          return "bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20";
        case 'partial':
          return "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20";
        case 'overdue':
          return "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20";
        case 'unpaid':
          return "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";
        default:
          return "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";
      }
    };

    return (
      <Badge className={cn("border", getStyles(status))}>
        {statusLabels[status as keyof typeof statusLabels] || status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentTypeBadge = (type: string) => {
    const typeLabels = {
      cash: 'Efectivo',
      installments: 'Cuotas',
    } as const;

    const getStyles = (t: string) => {
      switch (t) {
        case 'cash':
          return "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20";
        case 'installments':
          return "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20";
        default:
          return "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";
      }
    };

    return (
      <Badge className={cn("border", getStyles(type))}>
        {typeLabels[type as keyof typeof typeLabels] || type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };



  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {/* Highlight Banner */}
            {activeHighlight && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Search className="h-4 w-4" />
                  <span>Elemento resaltado (ID: {activeHighlight})</span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2 px-3 border-r border-primary/20">
                    <Switch
                      id="auto-scroll-sales-table"
                      checked={autoScrollEnabled}
                      onCheckedChange={setAutoScrollEnabled}
                    />
                    <Label htmlFor="auto-scroll-sales-table" className="text-[10px] uppercase font-bold tracking-wider opacity-70 cursor-pointer whitespace-nowrap">
                      Auto-scroll
                    </Label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleClearHighlight} className="h-8">
                    Quitar resalte
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SalesFiltersComponent
                  filters={salesFilters}
                  onFiltersChange={setSalesFilters}
                  sales={sales}
                />
                <SalesColumnToggle
                  columnVisibility={columnVisibility}
                  onColumnVisibilityChange={setColumnVisibility}
                />
                {selectedSales.size > 0 && onBulkDelete && onBulkStatusUpdate && (
                  <SalesBulkOperations
                    selectedSales={selectedSales}
                    sales={sales}
                    onBulkDelete={handleBulkDelete}
                    onBulkStatusUpdate={handleBulkStatusUpdate}
                    onClearSelection={clearSelection}
                    isLoading={isLoading}
                  />
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-md border">
              <Table className="short:[&>thead>tr>th]:py-2 short:[&>tbody>tr>td]:py-1 short:[&_*]:text-sm">
                <TableHeader>
                  <TableRow>
                    {onBulkDelete && onBulkStatusUpdate && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Seleccionar todas"
                          disabled={isLoading}
                        />
                      </TableHead>
                    )}
                    {columnVisibility.sale_number && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Venta / Ref
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.customer_name && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('date')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Cliente / Fecha
                          {getSortIcon('date')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.total_amount && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Total / Método
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_status && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Estado
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {onBulkDelete && onBulkStatusUpdate && (
                        <TableCell>
                          <Skeleton className="h-4 w-4" />
                        </TableCell>
                      )}
                      {columnVisibility.sale_number && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.customer_name && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="w-8 h-8 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.total_amount && (
                        <TableCell>
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16 rounded-full" />
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.payment_status && (
                        <TableCell>
                          <Skeleton className="h-6 w-16 rounded-full" />
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : visibleSales.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron ventas</h3>
              <p className="text-muted-foreground mb-4">
                {salesFilters.search ? 'No se encontraron ventas con esos criterios.' : '¡Crea tu primera venta!'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {onBulkDelete && onBulkStatusUpdate && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={isAllSelected}
                          onCheckedChange={handleSelectAll}
                          aria-label="Seleccionar todas"
                          disabled={isLoading}
                        />
                      </TableHead>
                    )}
                    {columnVisibility.sale_number && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Venta / Ref
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.customer_name && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('date')}
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Cliente / Fecha
                          {getSortIcon('date')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.total_amount && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Total / Método
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.payment_status && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                        >
                          Estado
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      id={`venta-${sale.id}`}
                      className={cn(
                        "transition-colors relative",
                        activeHighlight === sale.id?.toString() && "bg-primary/5 hover:bg-primary/10 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary"
                      )}
                      aria-current={activeHighlight === sale.id?.toString() ? "true" : undefined}
                    >
                      {onBulkDelete && onBulkStatusUpdate && (
                        <TableCell>
                          <Checkbox
                            checked={sale.id ? selectedSales.has(sale.id) : false}
                            onCheckedChange={(checked) => handleSelectSale(sale.id, checked as boolean)}
                            aria-label={`Seleccionar venta ${sale.sale_number}`}
                            disabled={isLoading}
                          />
                        </TableCell>
                      )}
                      {columnVisibility.sale_number && (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <Package className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span>
                                  {sale.reference_code ? (
                                    <span className="font-semibold text-primary text-sm">
                                      {sale.items && sale.items.length > 0 ? sale.items[0].product_name : 'Venta'}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground opacity-0">-</span>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {sale.reference_code || (sale.items && sale.items.length > 0 ? sale.items[0].product_name : `Venta #${sale.sale_number}`)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.customer_name && (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-muted text-[10px] font-bold">
                                  {sale.customer_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-semibold">{sale.customer_name}</span>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(sale.date)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.total_amount && (
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="font-bold text-primary">
                                {formatCurrency((Number(sale.total_amount ?? 0) > 0 ? Number(sale.total_amount) : (Array.isArray(sale.items) ? sale.items.reduce((acc: number, it: any) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0) : 0)))} ARS
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPaymentTypeBadge(sale.payment_type)}
                              {sale.payment_type === 'installments' && (
                                <span className="text-[10px] text-muted-foreground">
                                  ({sale.number_of_installments})
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.payment_status && (
                        <TableCell>
                          {getPaymentStatusBadge(sale.payment_status)}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            {sale.payment_type === 'installments' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-primary"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (sale.id && onViewInstallments) {
                                        onViewInstallments(sale.id);
                                      }
                                    }}
                                  >
                                    <Calendar className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver historial de cuotas</TooltipContent>
                              </Tooltip>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => {
                                    setDetailSale(sale);
                                    setIsDetailModalOpen(true);
                                  }}
                                >
                                  <Eye className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver detalles</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => onEdit(sale)}
                                >
                                  <Edit className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar venta</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-500 hover:text-red-600"
                                  onClick={() => setDeleteSale(sale)}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar venta</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {paginationInfo && (
        <DataTablePagination
          total={paginationInfo.total}
          totalPages={paginationInfo.totalPages}
          currentPage={paginationInfo.currentPage}
          pageSize={paginationInfo.pageSize}
          onPageChange={(page) => onPageChange?.(page)}
          entityName="ventas"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSale} onOpenChange={() => setDeleteSale(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar venta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la venta <strong>{deleteSale?.sale_number}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-slate-50">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sale Detail Modal */}
      <SaleDetailModal
        sale={detailSale}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onEdit={(sale) => {
          setIsDetailModalOpen(false);
          onEdit(sale);
        }}
      />
    </>
  );
}
