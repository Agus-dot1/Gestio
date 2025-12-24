'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CustomerForm } from '@/components/customers/customer-form';
import { CustomerProfile } from '@/components/customers/customer-profile';
import { EnhancedCustomersTable } from '@/components/customers/customers-table';
import { CustomersSkeleton } from '@/components/skeletons/customers-skeleton';
import { Plus, Users, Database, Archive, ArchiveRestore } from 'lucide-react';
import { toast } from 'sonner';
import type { Customer } from '@/lib/database-operations';
import { useDataCache, usePrefetch } from '@/hooks/use-data-cache';
import { SHOW_MOCK_BUTTONS } from '@/lib/feature-flags';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [viewingCustomer, setViewingCustomer] = useState<Customer | undefined>();
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showArchived, setShowArchived] = useState(false);
  const [allCustomerIds, setAllCustomerIds] = useState<number[]>([]);
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10
  });
  const pageSize = 10;
  const dataCache = useDataCache();
  const { prefetchProducts, prefetchSales } = usePrefetch();

  const loadAllCustomerIds = useCallback(async () => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      const ids = allCustomers.map(c => c.id).filter(id => id !== undefined) as number[];
      setAllCustomerIds(ids);
    } catch (error) {
      console.error('Error loading all customer IDs:', error);
    }
  }, []);

  const loadCustomers = useCallback(async (forceRefresh = false) => {
    try {
      const cacheKey = `${currentPage}-${pageSize}-${searchTerm}-${showArchived}`;
      // Note: useDataCache hook might need update to handle custom keys or we just bypass for archived
      // For simplicity, we bypass cache if showArchived is true or handle it manually if we wanted deep integration
      // Ideally we update the cache hook, but for now let's just fetch direct for archived to avoid complexity

      if (!showArchived && !forceRefresh) {
        const cachedData = dataCache.getCachedCustomers(currentPage, pageSize, searchTerm);
        const isCacheExpired = dataCache.isCustomersCacheExpired(currentPage, pageSize, searchTerm);

        if (cachedData) {
          setCustomers(cachedData.items);
          setPaginationInfo({
            total: cachedData.total,
            totalPages: cachedData.totalPages,
            currentPage: cachedData.currentPage,
            pageSize: cachedData.pageSize
          });
          setIsLoading(false);

          if (!isCacheExpired) {
            setTimeout(() => {
              prefetchProducts();
              prefetchSales();
            }, 100);
            return;
          }
        }
      }

      setIsLoading(true);

      const result = await window.electronAPI.database.customers.getPaginated(
        currentPage,
        pageSize,
        searchTerm,
        showArchived
      );

      if (result.totalPages > 0 && currentPage > result.totalPages) {
        setCurrentPage(result.totalPages);
      }

      setCustomers(result.customers);
      setPaginationInfo({
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || pageSize
      });

      if (!showArchived) {
        dataCache.setCachedCustomers(currentPage, pageSize, searchTerm, {
          items: result.customers,
          total: result.total,
          totalPages: result.totalPages,
          currentPage: result.currentPage,
          pageSize: result.pageSize || pageSize,
          searchTerm,
          timestamp: Date.now()
        });
      }

      setTimeout(() => {
        prefetchProducts();
        prefetchSales();
      }, 100);

    } catch (error) {
      console.error('Error cargando clientes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dataCache, currentPage, pageSize, searchTerm, prefetchProducts, prefetchSales, showArchived]);


  useEffect(() => {
    if (isElectron) {
      loadCustomers();
      loadAllCustomerIds();
    }
  }, [isElectron, loadCustomers, loadAllCustomerIds]);

  // Removed redundant useEffects that were calling loadCustomers multiple times

  const highlightedCustomer = useMemo(() => {
    if (!highlightId) return null;
    return customers.find(customer => customer.id?.toString() === highlightId);
  }, [customers, highlightId]);

  useEffect(() => {
    if (highlightedCustomer && highlightedCustomer.id) {
      setTimeout(() => {
        const element = document.getElementById(`customer-${highlightedCustomer.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedCustomer]);

  const handleSaveCustomer = async (customerData: Omit<Customer, 'id' | 'created_at'>) => {
    try {
      if (editingCustomer?.id) {
        await window.electronAPI.database.customers.update(editingCustomer.id, customerData);
      } else {
        await window.electronAPI.database.customers.create(customerData);
      }

      dataCache.invalidateCache('customers');
      await loadCustomers(true);
      await loadAllCustomerIds();

      setEditingCustomer(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando cliente:', error);
      throw error;
    }
  };

  const addMockCustomers = async () => {
    // ... mock data logic kept same ...
    const mockCustomers = [
      { name: 'Lucía Fernández', dni: '32123456', email: 'lucia.fernandez@example.com', phone: '+54 11 55551234', address: 'Av. Santa Fe 1234, CABA', notes: 'Prefiere contacto por email' },
      // ... (truncated for brevity in planning, but included in write)
    ];
    // Re-using existing mock logic if needed, or keeping it short if not modified.
    // For safety, I'll include the full file content or just the minimal diff if I used replace, but I'm using write_to_file so I need full content.
    // To save tokens, I'll use the existing mockCustomers array from the read file.
    const fullMockCustomers = [
      {
        name: 'Lucía Fernández',
        dni: '32123456',
        email: 'lucia.fernandez@example.com',
        phone: '+54 11 55551234',
        address: 'Av. Santa Fe 1234, CABA',
        notes: 'Prefiere contacto por email'
      },
      {
        name: 'Martín Gómez',
        dni: '28900123',
        email: 'martin.gomez@example.com',
        phone: '+54 11 55554444',
        address: 'Belgrano 2200, CABA',

      },
      {
        name: 'Carla Rodríguez',
        dni: '33111222',
        email: 'carla.rodriguez@example.com',
        phone: '+54 9 11 56781234',
        address: 'Ituzaingó 450, Lanús',

      },
      {
        name: 'Santiago Pérez',
        dni: '30222333',
        phone: '+54 11 55553333',
        address: 'Mitre 980, Quilmes',
        notes: 'Referido por Juan',

      },
      {
        name: 'Valentina López',
        dni: '34566789',
        email: 'valentina.lopez@example.com',
        phone: '+54 11 44443333',
        address: 'Rivadavia 789, Morón',

      },
      {
        name: 'Nicolás Duarte',
        dni: '37123456',
        email: 'nicolas.duarte@example.com',
        phone: '+54 11 55557777',
        address: 'San Martín 150, Ramos Mejía',

      },
      {
        name: 'Julieta Ortiz',
        dni: '31654321',
        email: 'julieta.ortiz@example.com',
        phone: '+54 11 55556666',
        address: 'Av. La Plata 2100, CABA',
        notes: 'Pago en efectivo',
      },
      {
        name: 'Gastón Alvarez',
        dni: '33445566',
        phone: '+54 11 55551111',
        address: 'Córdoba 1200, Rosario',

      },
      {
        name: 'Camila Herrera',
        dni: '32777888',
        email: 'camila.herrera@example.com',
        phone: '+54 9 11 62341234',
        address: 'Sarmiento 540, Lomas',
      },
      {
        name: 'Bruno Silva',
        dni: '31889900',
        email: 'bruno.silva@example.com',
        phone: '+54 11 55550000',
        address: 'Dorrego 700, CABA',
        notes: 'Factura A',
      },
    ];

    try {
      for (const customer of fullMockCustomers) {
        window.electronAPI.database.customers.create(customer);
      }
      await loadCustomers();
      console.log('Mock customers added successfully');
    } catch (error) {
      console.error('Error adding mock customers:', error);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    try {
      const sales = await window.electronAPI.database.sales.getByCustomer(customerId);
      if (Array.isArray(sales) && sales.length > 0) {
        await window.electronAPI.database.customers.archive(customerId, false);
        toast.success('Cliente eliminado (archivado)');
      } else {
        await window.electronAPI.database.customers.delete(customerId);
        toast.success('Cliente eliminado permanentemente');
      }
      dataCache.invalidateCache('customers');
      await loadCustomers(true);
      await loadAllCustomerIds();
    } catch (error: any) {
      console.error('Error eliminando cliente:', error);
      alert(error.message || 'Error al eliminar cliente. Porfavor intente de nuevo.');
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll && allCustomerIds.length === 0) {
      loadAllCustomerIds();
    }
  };

  const getCustomersByIds = async (ids: number[]): Promise<Customer[]> => {
    try {
      const allCustomers = await window.electronAPI.database.customers.getAll();
      return allCustomers.filter(customer => customer.id && ids.includes(customer.id));
    } catch (error) {
      console.error('Error fetching customers by IDs:', error);
      return [];
    }
  };

  const handleAddCustomer = () => {
    setEditingCustomer(undefined);
    setIsFormOpen(true);
  };

  const handleFormClose = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingCustomer(undefined);
    }
  };

  const stats = {
    total: customers.length,
    recentlyAdded: customers.filter(c => {
      if (!c.created_at) return false;
      const createdDate = new Date(c.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length
  };

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Actions Toolbar */}
        <div className="mb-8 flex items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-3xl border border-border/40 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-2xl">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Gestión de Clientes</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                  {paginationInfo.total} Clientes {showArchived ? '(Inactivos)' : ''}
                </p>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <p className="text-[11px] text-primary font-bold uppercase tracking-wider">
                  +{stats.recentlyAdded} Recientes (30d)
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-3">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={(checked) => {
                  setShowArchived(checked);
                  setCurrentPage(1); // Reset page on toggle
                }}
              />
              <Label htmlFor="show-archived" className="text-xs font-medium cursor-pointer">
                {showArchived ? 'Ocultar Inactivos' : 'Mostrar Inactivos'}
              </Label>
            </div>

            {SHOW_MOCK_BUTTONS && (
              <Button
                onClick={addMockCustomers}
                variant="outline"
                disabled={!isElectron}
                className="h-11 rounded-xl border-border/40 hover:bg-muted/50 transition-all font-medium text-xs"
              >
                <Database className="mr-2 h-4 w-4 text-muted-foreground" />
                Cargar datos de prueba
              </Button>
            )}
            <Button
              onClick={handleAddCustomer}
              disabled={!isElectron}
              className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all font-bold text-xs flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Añadir Cliente
            </Button>
          </div>
        </div>

        {/* Customers Table */}
        {!isElectron ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Electron Required</h3>
                <p className="text-muted-foreground">
                  Customer management is only available in the Electron desktop app.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : isLoading && customers.length === 0 ? (
          <CustomersSkeleton />
        ) : (
          <div>
            <EnhancedCustomersTable
              customers={customers}
              highlightId={highlightId}
              onEdit={handleEditCustomer}
              onView={handleViewCustomer}
              onDelete={handleDeleteCustomer}
              isLoading={isLoading}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              paginationInfo={paginationInfo}
              serverSidePagination={true}
              allCustomerIds={allCustomerIds}
              onSelectAll={handleSelectAll}
              onGetCustomersByIds={getCustomersByIds}
              onAddCustomer={handleAddCustomer}
            />
          </div>
        )}

        {/* Customer Form Dialog */}
        <CustomerForm
          customer={editingCustomer}
          open={isFormOpen}
          onOpenChange={handleFormClose}
          onSave={handleSaveCustomer}
        />

        {/* Customer Profile Modal */}
        {viewingCustomer && (
          <CustomerProfile
            customer={viewingCustomer}
            onEdit={(customer) => {
              setEditingCustomer(customer);
              setIsFormOpen(true);
            }}
            onClose={() => {
              setViewingCustomer(undefined);
              dataCache.invalidateCache('customers');
              loadCustomers(true); // Force reload to reflect changes
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
