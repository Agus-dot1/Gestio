'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { ProductForm } from '@/components/products/product-form';
import { ProductsTable } from '@/components/products/products-table';
import { ProductsSkeleton } from '@/components/skeletons/products-skeleton';
import { Plus, Package, TrendingUp, DollarSign, Eye } from 'lucide-react';
import { Database } from 'lucide-react';
import type { Product } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isElectron, setIsElectron] = useState(false);
  const dataCache = useDataCache();
  const { prefetchCustomers, prefetchSales } = usePrefetch();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  const pageSize = 10;

  const loadProducts = useCallback(async (forceRefresh = false) => {
    try {
      const cachedData = dataCache.getCachedProducts(currentPage, pageSize, searchTerm);
      const isCacheExpired = dataCache.isProductsCacheExpired(currentPage, pageSize, searchTerm);

      if (cachedData && !forceRefresh) {
        setProducts(cachedData.items);
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
            prefetchSales();
          }, 100);
          return;
        }
      } else {
        if (products.length === 0) {
          setIsLoading(true);
        }
      }

      const result = await window.electronAPI.database.products.getPaginated(
        currentPage,
        pageSize,
        searchTerm
      );

      setProducts(result.products);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });

      dataCache.setCachedProducts(currentPage, pageSize, searchTerm, {
        items: result.products,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize,
        searchTerm,
        timestamp: Date.now()
      });

      setTimeout(() => {
        prefetchCustomers();
        prefetchSales();
      }, 100);

    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataCache, currentPage, pageSize, searchTerm, prefetchCustomers, prefetchSales, products.length]);

  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);


  useEffect(() => {
    if (isElectron) {
      loadProducts();
    }
  }, [isElectron, loadProducts]);


  useEffect(() => {
    if (isElectron && dataCache) {
      const cachedData = dataCache.getCachedProducts(currentPage, pageSize, searchTerm);
      if (cachedData) {
        setProducts(cachedData.items);
        setPaginationInfo({
          total: cachedData.total,
          totalPages: cachedData.totalPages,
          currentPage: cachedData.currentPage,
          pageSize: cachedData.pageSize
        });
      } else {
        if (products.length === 0) {
          setIsLoading(true);
        }
      }
    }
  }, [isElectron, dataCache, currentPage, searchTerm, products.length]);

  useEffect(() => {
    if (isElectron) {
      loadProducts();
    }
  }, [searchTerm, currentPage, isElectron, loadProducts]);

  const highlightedProduct = useMemo(() => {
    if (!highlightId) return null;
    return products.find(product => product.id?.toString() === highlightId);
  }, [products, highlightId]);

  useEffect(() => {
    if (highlightedProduct) {
      setTimeout(() => {
        const element = document.getElementById(`producto-${highlightedProduct.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedProduct]);




  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      if (editingProduct?.id) {
        await window.electronAPI.database.products.update(editingProduct.id, productData);
      } else {
        await window.electronAPI.database.products.create(productData);
      }

      dataCache.invalidateCache('products');
      await loadProducts(true);

      setEditingProduct(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error añadiendo producto:', error);
      throw error;
    }
  };

  const addMockProducts = async () => {
    const mockProducts = [
      {
        name: 'Auriculares Bluetooth Pro',
        price: 159990,
        cost_price: 105000,
        description: 'Cancelación activa de ruido, 24h batería',
        category: 'Audio',
        stock: 25,
        is_active: true
      },
      {
        name: 'Parlante Portátil 20W',
        price: 179990,
        cost_price: 120000,
        description: 'Resistente al agua, sonido 360°',
        category: 'Audio',
        stock: 12,
        is_active: true
      },
      {
        name: 'Mouse Inalámbrico Ergonómico',
        price: 59990,
        cost_price: 35000,
        description: '7000 DPI, silencioso',
        category: 'Computación',
        stock: 40,
        is_active: true
      },
      {
        name: 'Teclado Mecánico RGB',
        price: 259990,
        cost_price: 180000,
        description: 'Switches rojos, anti-ghosting',
        category: 'Computación',
        stock: 8,
        is_active: false
      },
      {
        name: 'Webcam Full HD 1080p',
        price: 119990,
        cost_price: 80000,
        description: 'Micrófono integrado, auto foco',
        category: 'Computación',
        stock: 20,
        is_active: true
      },
      {
        name: 'Cable USB-C 2m Trenzado',
        price: 25990,
        cost_price: 12000,
        description: 'Carga rápida, 60W',
        category: 'Accesorios',
        stock: 100,
        is_active: true
      },
      {
        name: 'Power Bank 20,000mAh',
        price: 91990,
        cost_price: 60000,
        description: 'LCD, doble USB',
        category: 'Accesorios',
        stock: 30,
        is_active: true
      },
      {
        name: 'Funda Premium para Smartphone',
        price: 49990,
        cost_price: 25000,
        description: 'Antigolpes, compatible multi-modelos',
        category: 'Accesorios',
        stock: 50,
        is_active: true
      },
      {
        name: 'Protector de Pantalla Vidrio',
        price: 19990,
        cost_price: 8000,
        description: 'Anti-huellas, alta transparencia',
        category: 'Accesorios',
        stock: 200,
        is_active: true
      },
      {
        name: 'Soporte de Auto Magnético',
        price: 39990,
        cost_price: 18000,
        description: 'Rotación 360°, agarre firme',
        category: 'Accesorios',
        stock: 60,
        is_active: true
      },
      {
        name: 'Smartwatch Deportivo',
        price: 229990,
        cost_price: 160000,
        description: 'GPS, resistencia al agua, notificaciones',
        category: 'Wearables',
        stock: 15,
        is_active: true
      },
      {
        name: 'Cargador GaN 65W',
        price: 84990,
        cost_price: 50000,
        description: 'USB-C + USB-A, compacto',
        category: 'Accesorios',
        stock: 35,
        is_active: true
      }
    ];

    try {
      for (const product of mockProducts) {
        window.electronAPI.database.products.create(product);
      }
      await loadProducts();
      console.log('Productos de prueba añadidos correctamente');
    } catch (error) {
      console.error('Error añadiendo productos:', error);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await window.electronAPI.database.products.delete(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      dataCache.invalidateCache('products');
    } catch (error: any) {
      console.error('Error eliminando product:', error);
      alert(error.message || 'Error deleting product. Please try again.');
    }
  };

  const handleBulkDeleteProducts = async (productIds: number[]) => {
    try {


      for (const productId of productIds) {
        await window.electronAPI.database.products.delete(productId);
      }


      dataCache.invalidateCache('products');
      await loadProducts();
    } catch (error: any) {
      console.error('Error eliminando productos:', error);


      alert(error.message || 'Error deleting products. Please try again.');
    }
  };

  const handleToggleStatus = async (productId: number, isActive: boolean) => {


    setProducts(prev => prev.map(p => (
      p.id === productId ? { ...p, is_active: isActive } : p
    )));

    try {
      await window.electronAPI.database.products.update(productId, { is_active: isActive });


      dataCache.invalidateCache('products');
      await loadProducts(true);
    } catch (error) {
      console.error('Error actualizando producto:', error);


      setProducts(prev => prev.map(p => (
        p.id === productId ? { ...p, is_active: !isActive } : p
      )));
    }
  };

  const handleAddProduct = () => {
    setEditingProduct(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingProduct(undefined);
    }
  };



  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    inactive: products.filter(p => !p.is_active).length,
    averagePrice: products.length > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0
  };

  const totals = {
    totalCost: products.reduce((sum, p) => sum + (p.cost_price || 0), 0),
    totalGain: products.reduce((sum, p) => sum + ((p.price || 0) - (p.cost_price || 0)), 0),
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Actions Toolbar */}
        <div className="mb-6 flex items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-3xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Catálogo de Productos</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                  {stats.total} Items
                </p>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <p className="text-[11px] text-primary font-bold uppercase tracking-wider">
                  Valor Total: {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totals.totalCost)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            {SHOW_MOCK_BUTTONS && (
              <Button
                onClick={addMockProducts}
                variant="outline"
                disabled={!isElectron}
                className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
              >
                <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                Cargar datos
              </Button>
            )}
            <Button
              onClick={handleAddProduct}
              disabled={!isElectron}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold text-xs flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Añadir Producto
            </Button>
          </div>
        </div>

        {/* Products Table */}
        {isElectron ? (
          <div>
            <ProductsTable
              products={products}
              highlightId={highlightId}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onBulkDelete={handleBulkDeleteProducts}
              onToggleStatus={handleToggleStatus}
              searchTerm={searchTerm}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              currentPage={currentPage}
              onPageChange={(page) => setCurrentPage(page)}
              paginationInfo={paginationInfo}
              serverSidePagination={true}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                <p className="text-muted-foreground">
                  Products management is only available in the Electron desktop app.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Form Dialog */}
        <ProductForm
          product={editingProduct}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveProduct}
        />
      </div>
    </DashboardLayout>
  );
}
