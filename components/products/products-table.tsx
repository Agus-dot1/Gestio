'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, MoreHorizontal, Edit, Trash2, Eye, EyeOff, Package, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Product } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProductsColumnToggle, ColumnVisibility as ProductColumnVisibility } from './products-column-toggle';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { DataTablePagination } from '../ui/data-table-pagination';
import { formatCurrency } from '@/config/locale';

interface ProductsTableProps {
  products: Product[];
  highlightId?: string | null;
  onEdit: (product: Product) => void;
  onDelete: (productId: number) => void;
  onBulkDelete: (productIds: number[]) => void;
  onToggleStatus: (productId: number, isActive: boolean) => void;
  isLoading?: boolean;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  paginationInfo?: { total: number; totalPages: number; currentPage: number; pageSize: number };
  serverSidePagination?: boolean;
}

export function ProductsTable({
  products,
  highlightId,
  onEdit,
  onDelete,
  onBulkDelete,
  onToggleStatus,
  isLoading = false,
  searchTerm: externalSearchTerm,
  onSearchChange,
  currentPage: externalCurrentPage,
  onPageChange,
  paginationInfo,
  serverSidePagination = false
}: ProductsTableProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // 1. Initial Highlight States from localStorage
  const [stickyHighlight, setStickyHighlight] = usePersistedState<string | null>('stickyHighlight-products', null);

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
    if (activeHighlight && autoScrollEnabled) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`product-${activeHighlight}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeHighlight, autoScrollEnabled]);

  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const PRODUCTS_PERSIST_KEY = 'productsTablePrefs';

  const [prefs, setPrefs] = usePersistedState<{
    columnVisibility: ProductColumnVisibility;
    sortConfig: { key: string | null; direction: 'asc' | 'desc' };
    searchTerm?: string;
  }>(PRODUCTS_PERSIST_KEY, {
    columnVisibility: {
      name: true,
      category: true,
      price: true,
      cost: true,
      stock: true,
      description: true,
      status: true,
    },
    sortConfig: { key: null, direction: 'asc' },
    searchTerm: '',
  });

  const columnVisibility = prefs.columnVisibility;
  const setColumnVisibility = (value: ProductColumnVisibility | ((curr: ProductColumnVisibility) => ProductColumnVisibility)) => {
    setPrefs(prev => ({
      ...prev,
      columnVisibility: typeof value === 'function' ? value(prev.columnVisibility) : value
    }));
  };

  const sortConfig = prefs.sortConfig;
  const setSortConfig = (value: { key: string | null; direction: 'asc' | 'desc' } | ((curr: { key: string | null; direction: 'asc' | 'desc' }) => { key: string | null; direction: 'asc' | 'desc' })) => {
    setPrefs(prev => ({
      ...prev,
      sortConfig: typeof value === 'function' ? value(prev.sortConfig) : value
    }));
  };

  const internalSearchTerm = prefs.searchTerm || '';
  const setInternalSearchTerm = (value: string | ((curr: string) => string)) => {
    setPrefs(prev => ({
      ...prev,
      searchTerm: typeof value === 'function' ? value(prev.searchTerm || '') : value
    }));
  };

  const [inputValue, setInputValue] = useState(externalSearchTerm || '');
  const debounceRef = useRef<number | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [editing, setEditing] = useState<Record<number, { price?: string; cost_price?: string; stock?: string; saving?: boolean }>>({});

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="ml-1 h-4 w-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  useEffect(() => {
    if (serverSidePagination) {
      setInputValue(externalSearchTerm || '');
    }
  }, [externalSearchTerm, serverSidePagination]);

  const searchTerm = serverSidePagination ? (externalSearchTerm || '') : internalSearchTerm;

  const handleSearchChange = (term: string) => {
    if (serverSidePagination && onSearchChange) {
      setInputValue(term);
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        onSearchChange(term);
        onPageChange && onPageChange(1);
      }, 300);
    } else {
      setInternalSearchTerm(term);
    }
  };

  const filteredProducts = localProducts;

  const sortedProducts = (() => {
    const base = filteredProducts;
    if (!sortConfig.key) return base;
    const sorted = [...base].sort((a, b) => {
      const key = sortConfig.key!;
      let aVal: any = (a as any)[key];
      let bVal: any = (b as any)[key];
      if (key === 'name' || key === 'category') {
        aVal = (aVal ?? '').toString().toLowerCase();
        bVal = (bVal ?? '').toString().toLowerCase();
        const cmp = aVal.localeCompare(bVal);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      } else if (key === 'is_active') {
        const aBool = !!aVal;
        const bBool = !!bVal;
        const cmp = (aBool === bBool) ? 0 : (aBool ? 1 : -1);
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      } else {
        aVal = Number(aVal ?? 0);
        bVal = Number(bVal ?? 0);
        const cmp = aVal - bVal;
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      }
    });
    return sorted;
  })();

  const setEditingField = (id: number, field: 'price' | 'cost_price' | 'stock', value: string | undefined) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      }
    }));
  };

  const saveEditingField = async (id: number, field: 'price' | 'cost_price' | 'stock', value: string | undefined) => {
    if (value === undefined || value === '') {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], [field]: undefined } }));
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || (field !== 'stock' && num < 0) || (field === 'stock' && num < 0)) {
      return;
    }
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: true } }));
    try {
      await window.electronAPI?.database?.products?.update(id, { [field]: num } as any);
      setLocalProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: num } as Product : p));
    } catch (e) {
      console.error('Failed to update product', id, field, e);
    } finally {
      setEditing(prev => ({ ...prev, [id]: { ...prev[id], saving: false, [field]: undefined } }));
    }
  };

  const visibleProducts = sortedProducts;

  const changePage = (page: number) => {
    onPageChange && onPageChange(page);
  };

  const handleDelete = async () => {
    if (deleteProduct?.id) {
      await onDelete(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleBulkDelete = async () => {
    const productIds = Array.from(selectedProducts);
    if (productIds.length > 0) {
      await onBulkDelete(productIds);
      setSelectedProducts(new Set());
      setSelectAll(false);
      setShowBulkDeleteDialog(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'ARS'
    }).format(price);
  };

  const handleSelectAll = async (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      if (serverSidePagination) {
        try {
          const allProducts = await window.electronAPI?.database?.products?.getAll();
          const ids = (allProducts || []).map(p => p.id).filter(id => id !== undefined) as number[];
          setSelectedProducts(new Set(ids));
        } catch (e) {
          console.error('Error cargando todos los IDs de productos para seleccionar todo:', e);
          const allProductIds = new Set(filteredProducts.map(p => p.id!).filter(Boolean));
          setSelectedProducts(allProductIds);
        }
      } else {
        const allProductIds = new Set(sortedProducts.map(p => p.id!).filter(Boolean));
        setSelectedProducts(allProductIds);
      }
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);

    const total = paginationInfo?.total || 0;
    setSelectAll(total > 0 && newSelected.size === total);
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return date;
    }
  };

  const exportProductsPDF = async () => {
    let selectedProductsData: Product[] = [];
    if (serverSidePagination) {
      try {
        const allProducts = await window.electronAPI?.database?.products?.getAll();
        selectedProductsData = (allProducts || []).filter(p => p.id && selectedProducts.has(p.id));
      } catch (e) {
        console.error('Error exportando productos seleccionados (fallback a página actual):', e);
        selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
      }
    } else {
      selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
    }

    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text('Listado de Productos', 14, 18);
    doc.setFontSize(11);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 26);
    doc.text(`Seleccionados: ${selectedProductsData.length}`, 14, 32);

    const tableData = selectedProductsData.map(p => [
      p.id ?? '-',
      p.name,
      formatCurrency(p.price),
      formatCurrency(p.cost_price),
      p.stock ?? 0,
      p.description || '-'
    ]);

    autoTable(doc, {
      head: [[
        'ID', 'Nombre', 'Precio', 'Costo', 'Stock', 'Descripción'
      ]],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        5: { cellWidth: 60 } // Descripción
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal?.getNumberOfPages
          ? (doc as any).internal.getNumberOfPages()
          : 1;
        const pageNum = (data as any)?.pageNumber ?? pageCount;
        const str = `Página ${pageNum} de ${pageCount}`;
        const width = (doc as any).internal?.pageSize?.getWidth();
        const height = (doc as any).internal?.pageSize?.getHeight();
        doc.setFontSize(9);
        doc.text(str, (width || 210) - 60, (height || 297) - 10);
      }
    });

    doc.save(`productos_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportProductsExcel = async () => {
    let selectedProductsData: Product[] = [];
    if (serverSidePagination) {
      try {
        const allProducts = await window.electronAPI?.database?.products?.getAll();
        selectedProductsData = (allProducts || []).filter(p => p.id && selectedProducts.has(p.id));
      } catch (e) {
        console.error('Error exportando productos seleccionados a Excel (fallback a página actual):', e);
        selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
      }
    } else {
      selectedProductsData = products.filter(p => selectedProducts.has(p.id!));
    }

    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    // Define columns
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 6 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Precio', key: 'precio', width: 12 },
      { header: 'Costo', key: 'costo', width: 12 },
      { header: 'Stock', key: 'stock', width: 8 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
    ];

    // Add rows
    selectedProductsData.forEach(p => {
      worksheet.addRow({
        id: p.id ?? '',
        nombre: p.name,
        precio: typeof p.price === 'number' ? p.price : '',
        costo: p.cost_price != null ? p.cost_price : '',
        stock: p.stock ?? 0,
        descripcion: p.description || ''
      });
    });

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `productos_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isAllSelected = (paginationInfo?.total || 0) > 0 && selectedProducts.size === (paginationInfo?.total || 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            {activeHighlight && (
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-sm text-primary font-medium">
                  <Search className="h-4 w-4" />
                  <span>Producto resaltado (ID: {activeHighlight})</span>
                </div>
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2 px-3 border-r border-primary/20">
                    <Switch
                      id="auto-scroll-products"
                      checked={autoScrollEnabled}
                      onCheckedChange={setAutoScrollEnabled}
                    />
                    <Label htmlFor="auto-scroll-products" className="text-[10px] uppercase font-bold tracking-wider opacity-70 cursor-pointer whitespace-nowrap">
                      Auto-scroll
                    </Label>
                  </div>
                  <Button size="sm" variant="ghost" onClick={handleClearHighlight} className="h-8">
                    Quitar resalte
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar productos..."
                      value={serverSidePagination ? inputValue : searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-8 w-64 rounded-xl"
                      disabled={isLoading}
                    />
                  </div>
                  <ProductsColumnToggle
                    columnVisibility={columnVisibility}
                    onColumnVisibilityChange={setColumnVisibility}
                  />
                  {selectedProducts.size > 0 && (
                    <div className="flex items-center gap-2 mr-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportProductsPDF}
                        className="h-8"
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={exportProductsExcel}
                        className="h-8"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Excel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="h-8"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </Button>
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="rounded-xl border">
              <Table className="short:[&>thead>tr>th]:py-2 short:[&>tbody>tr>td]:py-1 short:[&_*]:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Skeleton className="h-4 w-4" />
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-40" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded font-medium" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se han encontrado productos</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? 'No se encontraron productos con ese nombre.' : 'No hay productos registrados, empezá añadiendo algunos.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border">
              <Table className="short:[&>thead>tr>th]:py-2 short:[&>tbody>tr>td]:py-1 short:[&_*]:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        aria-label="Seleccionar todos los productos"
                        disabled={isLoading}
                      />
                    </TableHead>
                    {columnVisibility.name && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort('name')}
                        >
                          Nombre {getSortIcon('name')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.category && (<TableHead>Categoría</TableHead>)}
                    {columnVisibility.price && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort('price')}
                        >
                          Precio {getSortIcon('price')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.cost && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort('cost_price')}
                        >
                          Costo {getSortIcon('cost_price')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.stock && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort('stock')}
                        >
                          Stock {getSortIcon('stock')}
                        </Button>
                      </TableHead>
                    )}
                    {columnVisibility.description && <TableHead>Descripción</TableHead>}
                    {columnVisibility.status && (
                      <TableHead>
                        <Button
                          variant="ghost"
                          className="h-auto p-0 font-semibold hover:bg-transparent"
                          onClick={() => handleSort('is_active')}
                        >
                          Estado {getSortIcon('is_active')}
                        </Button>
                      </TableHead>
                    )}
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProducts.map((product) => (
                    <TableRow
                      key={product.id}
                      id={`product-${product.id}`}
                      className={cn(
                        "transition-colors relative",
                        activeHighlight === product.id?.toString() && "bg-primary/5 hover:bg-primary/10 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.has(product.id!)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id!, checked as boolean)}
                          aria-label={`Seleccionar ${product.name}`}
                        />
                      </TableCell>
                      {columnVisibility.name && (
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground text-sm">{product.name}</span>
                            {highlightId === product.id?.toString() && (
                              <Badge className="bg-primary/10 text-primary border-primary/20 w-fit mt-1">
                                Coincidencia
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.category && (
                        <TableCell>
                          {product.category && product.category !== 'sin-categoria' ? (
                            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">
                              {product.category}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground italic text-sm">Sin categoría</span>
                          )}
                        </TableCell>
                      )}
                      {columnVisibility.price && (
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editing[product.id!]?.price ?? (product.price?.toString() ?? '')}
                            onChange={(e) => setEditingField(product.id!, 'price', e.target.value)}
                            onBlur={() => saveEditingField(product.id!, 'price', editing[product.id!]?.price)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            disabled={editing[product.id!]?.saving}
                            className="w-28 h-8"
                          />
                        </TableCell>
                      )}
                      {columnVisibility.cost && (
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editing[product.id!]?.cost_price ?? (product.cost_price?.toString() ?? '')}
                            onChange={(e) => setEditingField(product.id!, 'cost_price', e.target.value)}
                            onBlur={() => saveEditingField(product.id!, 'cost_price', editing[product.id!]?.cost_price)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                            disabled={editing[product.id!]?.saving}
                            className="w-28 h-8"
                          />
                        </TableCell>
                      )}
                      {columnVisibility.stock && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={editing[product.id!]?.stock ?? (product.stock?.toString() ?? '')}
                              onChange={(e) => setEditingField(product.id!, 'stock', e.target.value)}
                              onBlur={() => saveEditingField(product.id!, 'stock', editing[product.id!]?.stock)}
                              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                              disabled={editing[product.id!]?.saving}
                              className="w-20 h-8"
                            />
                            <span className="text-muted-foreground text-xs">un</span>
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.description && (
                        <TableCell className="max-w-[200px]">
                          <div className="truncate text-xs text-muted-foreground">
                            {product.description || 'Sin descripción'}
                          </div>
                        </TableCell>
                      )}
                      {columnVisibility.status && (
                        <TableCell>
                          {product.is_active ? (
                            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 text-[10px] h-5">Activo</Badge>
                          ) : (
                            <Badge className="bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20 border-muted-foreground/20 text-[10px] h-5">Inactivo</Badge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className={cn("h-9 w-9", product.is_active ? "text-muted-foreground hover:text-primary" : "text-primary")}
                                  onClick={() => onToggleStatus(product.id!, !product.is_active)}
                                >
                                  {product.is_active ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{product.is_active ? 'Desactivar producto' : 'Activar producto'}</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                                  onClick={() => onEdit(product)}
                                >
                                  <Edit className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar producto</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 text-red-500 hover:text-red-600"
                                  onClick={() => setDeleteProduct(product)}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar producto</TooltipContent>
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

          {/* Pagination */}
          {paginationInfo && (
            <DataTablePagination
              total={paginationInfo.total}
              totalPages={paginationInfo.totalPages}
              currentPage={paginationInfo.currentPage}
              pageSize={paginationInfo.pageSize}
              onPageChange={changePage}
              entityName="productos"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Single Product */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el producto "{deleteProduct?.name}" de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar {selectedProducts.size} productos. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar todos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
