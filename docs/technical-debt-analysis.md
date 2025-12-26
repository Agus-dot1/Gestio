# Technical Debt Analysis - GESTIO Application
**Date:** December 26, 2025  
**Focus:** State Management & Architecture Patterns

## Executive Summary

After analyzing the codebase, particularly comparing the recently refactored `installment-dashboard` (which uses Zustand) with other pages (`sales`, `customers`, `products`), I've identified significant technical debt related to **state management patterns**, **data fetching strategies**, and **component architecture**.

The installment dashboard represents the **optimal pattern** that should be replicated across the application.

---

## ✅ Optimal Pattern: Installment Dashboard

### What Makes It Excellent

#### 1. **Centralized UI State with Zustand**
- **Location:** `context/stores/installment-ui-store.ts`
- **Benefits:**
  - All UI state (filters, expansion, dialogs, highlights) in one place
  - Predictable state updates with named actions
  - DevTools integration for debugging
  - Proper use of `useShallow` to prevent unnecessary re-renders
  - Organized selectors (`selectFilters`, `selectExpansion`, `selectDialogs`, `selectHighlight`)

```typescript
// ✅ GOOD: Zustand store with selectors
const {
  searchTerm,
  debouncedSearch,
  setDebouncedSearch,
} = useInstallmentUIStore(useShallow(selectFilters));
```

#### 2. **Declarative Data Fetching**
- Uses `useQuery` hook from `use-data-cache.tsx`
- Automatic cache management
- Built-in loading states
- Subscription-based invalidation

```typescript
// ✅ GOOD: Declarative data fetching
const { data, isLoading, refetch } = useQuery<CustomerWithInstallments[]>({
  key: ['installments', partnerId],
  fetchFn: fetchInstallments,
  enabled: isElectron,
  onSuccess: () => {
    initializedRef.current = true;
  }
});
```

#### 3. **Separation of Concerns**
- **UI State:** Zustand store
- **Data Fetching:** `useQuery` hook
- **Business Logic:** `useInstallmentOperations` custom hook
- **Presentation:** Modular components

#### 4. **Proper Cache Invalidation**
```typescript
// ✅ GOOD: Simple, declarative invalidation
invalidateQuery(['installments']);
```

---

## ❌ Technical Debt: Other Pages

### 1. **Sales Page** (`app/sales/page.tsx`)

#### Problems Identified

##### A. **Scattered useState Declarations**
```typescript
// ❌ BAD: 15+ useState declarations
const [sales, setSales] = useState<Sale[]>([]);
const [overdueSales, setOverdueSales] = useState<number>(0);
const [isFormOpen, setIsFormOpen] = useState(false);
const [editingSale, setEditingSale] = useState<Sale | undefined>();
const [isElectron, setIsElectron] = useState(false);
const [hasHydrated, setHasHydrated] = useState(false);
const [activeTab, setActiveTab] = useState(() => tabParam || 'sales');
const [isLoading, setIsLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [paginationInfo, setPaginationInfo] = useState<...>(undefined);
const [refreshCounter, setRefreshCounter] = useState(0);
const [stickyHighlight, setStickyHighlight] = usePersistedState<string | null>('stickyHighlight-sales-page', null);
const [autoScrollEnabled, setAutoScrollEnabled] = usePersistedState<boolean>('gestio-auto-scroll', true);
```

**Issues:**
- Hard to track state changes
- No single source of truth
- Difficult to debug
- Props drilling to child components
- State scattered across component

##### B. **Imperative Data Fetching**
```typescript
// ❌ BAD: Manual loading state management
const loadSales = useCallback(async (forceRefresh = false) => {
  try {
    const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
    const isCacheExpired = dataCache.isSalesCacheExpired(currentPage, pageSize, searchTerm);
    
    if (cachedData && !forceRefresh) {
      setSales(cachedData.items);
      setPaginationInfo({...});
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
    
    const result = await window.electronAPI.database.sales.getPaginated(...);
    setSales(result.sales);
    setPaginationInfo({...});
    dataCache.setCachedSales(...);
    // ... more manual state management
  } catch (error) {
    console.error('Error cargando ventas:', error);
  } finally {
    setIsLoading(false);
  }
}, [dataCache, currentPage, pageSize, searchTerm, prefetchCustomers, prefetchProducts, sales.length]);
```

**Issues:**
- Manual cache checking
- Manual loading state management
- Complex dependency array
- Potential for stale closures
- Hard to test

##### C. **Multiple useEffect Hooks**
```typescript
// ❌ BAD: Multiple effects for same concern
useEffect(() => {
  if (isElectron) {
    const cachedData = dataCache.getCachedSales(currentPage, pageSize, searchTerm);
    if (cachedData) {
      setSales(cachedData.items);
      setPaginationInfo({...});
    } else {
      setIsLoading(true);
    }
    loadSales();
    loadOverdueSales();
  }
}, [isElectron, dataCache, currentPage, pageSize, searchTerm, loadSales, loadOverdueSales]);

useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (isElectron) {
      setCurrentPage(1);
      loadSales();
    }
  }, 300);
  return () => clearTimeout(timeoutId);
}, [searchTerm, isElectron]);

useEffect(() => {
  if (isElectron && sales.length > 0) {
    setTimeout(() => {
      loadSales();
    }, 0);
  }
}, [currentPage, isElectron, sales.length, loadSales]);
```

**Issues:**
- Redundant data fetching
- Race conditions possible
- Hard to understand execution order
- Dependency array complexity

##### D. **Manual Cache Invalidation**
```typescript
// ❌ BAD: Manual invalidation everywhere
const handleSaveSale = async (saleData: SaleFormData) => {
  try {
    if (editingSale?.id) {
      await window.electronAPI.database.sales.update(editingSale.id, updateData);
    } else {
      await window.electronAPI.database.sales.create(saleData);
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
    // ...
  }
};
```

**Issues:**
- Multiple manual refresh calls
- Ref-based communication with child components
- Easy to forget invalidation
- Tight coupling

### 2. **Customers Page** (`app/customers/page.tsx`)

#### Similar Issues

```typescript
// ❌ BAD: Same pattern as Sales page
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
const [paginationInfo, setPaginationInfo] = useState({...});
```

**Additional Issues:**
- `showArchived` state adds complexity to cache logic
- Manual bypass of cache for archived items
- Duplicate loading logic

### 3. **Products Page** (`app/products/page.tsx`)

#### Same Pattern Repeated

```typescript
// ❌ BAD: Copy-paste state management
const [products, setProducts] = useState<Product[]>([]);
const [isFormOpen, setIsFormOpen] = useState(false);
const [editingProduct, setEditingProduct] = useState<Product | undefined>();
const [isElectron, setIsElectron] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
const [paginationInfo, setPaginationInfo] = useState({...});
```

**Issues:**
- Identical problems as Sales and Customers pages
- No code reuse
- Inconsistent patterns

---

## 📊 Comparison Table

| Aspect | Installment Dashboard ✅ | Sales/Customers/Products ❌ |
|--------|-------------------------|----------------------------|
| **State Management** | Zustand store with selectors | Multiple `useState` hooks |
| **Data Fetching** | Declarative `useQuery` | Imperative `loadData()` functions |
| **Loading States** | Automatic | Manual `setIsLoading()` |
| **Cache Management** | Automatic with subscriptions | Manual checking and setting |
| **Invalidation** | `invalidateQuery(['key'])` | Multiple manual calls |
| **Re-renders** | Optimized with `useShallow` | Potential unnecessary re-renders |
| **Testability** | High (isolated concerns) | Low (tightly coupled) |
| **Code Lines** | ~340 lines | ~970 lines (Sales page) |
| **Complexity** | Low | High |
| **Maintainability** | High | Low |

---

## 🎯 Recommended Refactoring Plan

### Phase 1: Create Zustand Stores (Priority: HIGH)

#### 1.1 Sales UI Store
```typescript
// context/stores/sales-ui-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SalesUIState {
  // Filters
  searchTerm: string;
  debouncedSearch: string;
  
  // Tabs
  activeTab: 'sales' | 'installments';
  
  // Dialogs
  isFormOpen: boolean;
  editingSale: Sale | undefined;
  
  // Highlight
  stickyHighlight: string | null;
  autoScrollEnabled: boolean;
  
  // Pagination
  currentPage: number;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setDebouncedSearch: (term: string) => void;
  setActiveTab: (tab: 'sales' | 'installments') => void;
  setIsFormOpen: (open: boolean) => void;
  setEditingSale: (sale: Sale | undefined) => void;
  setStickyHighlight: (id: string | null) => void;
  setAutoScrollEnabled: (enabled: boolean) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

export const useSalesUIStore = create<SalesUIState>()(
  devtools(
    (set) => ({
      // Initial state
      searchTerm: '',
      debouncedSearch: '',
      activeTab: 'sales',
      isFormOpen: false,
      editingSale: undefined,
      stickyHighlight: null,
      autoScrollEnabled: true,
      currentPage: 1,
      
      // Actions
      setSearchTerm: (term) => set({ searchTerm: term }, false, 'setSearchTerm'),
      setDebouncedSearch: (term) => set({ debouncedSearch: term }, false, 'setDebouncedSearch'),
      setActiveTab: (tab) => set({ activeTab: tab }, false, 'setActiveTab'),
      setIsFormOpen: (open) => set({ isFormOpen: open }, false, 'setIsFormOpen'),
      setEditingSale: (sale) => set({ editingSale: sale }, false, 'setEditingSale'),
      setStickyHighlight: (id) => set({ stickyHighlight: id }, false, 'setStickyHighlight'),
      setAutoScrollEnabled: (enabled) => set({ autoScrollEnabled: enabled }, false, 'setAutoScrollEnabled'),
      setCurrentPage: (page) => set({ currentPage: page }, false, 'setCurrentPage'),
      resetFilters: () => set({
        searchTerm: '',
        debouncedSearch: '',
        currentPage: 1,
      }, false, 'resetFilters'),
    }),
    { name: 'SalesUIStore' }
  )
);

// Selectors
export const selectFilters = (state: SalesUIState) => ({
  searchTerm: state.searchTerm,
  debouncedSearch: state.debouncedSearch,
  currentPage: state.currentPage,
  setSearchTerm: state.setSearchTerm,
  setDebouncedSearch: state.setDebouncedSearch,
  setCurrentPage: state.setCurrentPage,
  resetFilters: state.resetFilters,
});

export const selectDialogs = (state: SalesUIState) => ({
  isFormOpen: state.isFormOpen,
  editingSale: state.editingSale,
  setIsFormOpen: state.setIsFormOpen,
  setEditingSale: state.setEditingSale,
});

export const selectHighlight = (state: SalesUIState) => ({
  stickyHighlight: state.stickyHighlight,
  autoScrollEnabled: state.autoScrollEnabled,
  setStickyHighlight: state.setStickyHighlight,
  setAutoScrollEnabled: state.setAutoScrollEnabled,
});
```

#### 1.2 Customers UI Store
```typescript
// context/stores/customers-ui-store.ts
// Similar structure to sales-ui-store.ts
// Add specific state like: showArchived, viewingCustomer, etc.
```

#### 1.3 Products UI Store
```typescript
// context/stores/products-ui-store.ts
// Similar structure
```

### Phase 2: Migrate to useQuery Hook (Priority: HIGH)

#### 2.1 Sales Page Refactor

**Before:**
```typescript
// ❌ Current implementation
const loadSales = useCallback(async (forceRefresh = false) => {
  // 50+ lines of manual cache management
}, [/* complex dependencies */]);

useEffect(() => {
  if (isElectron) {
    loadSales();
  }
}, [isElectron, currentPage, pageSize, searchTerm, loadSales]);
```

**After:**
```typescript
// ✅ Proposed implementation
const { currentPage, debouncedSearch } = useSalesUIStore(useShallow(selectFilters));

const fetchSales = useCallback(async () => {
  const result = await window.electronAPI.database.sales.getPaginated(
    currentPage,
    pageSize,
    debouncedSearch
  );
  return {
    items: result.sales,
    total: result.total,
    totalPages: result.totalPages,
    currentPage: result.currentPage,
    pageSize: result.pageSize || pageSize,
  };
}, [currentPage, debouncedSearch]);

const { data, isLoading, error } = useQuery({
  key: ['sales', currentPage, pageSize, debouncedSearch],
  fetchFn: fetchSales,
  enabled: isElectron,
});

const sales = data?.items ?? [];
const paginationInfo = data ? {
  total: data.total,
  totalPages: data.totalPages,
  currentPage: data.currentPage,
  pageSize: data.pageSize,
} : undefined;
```

#### 2.2 Simplify Mutations

**Before:**
```typescript
// ❌ Current implementation
const handleSaveSale = async (saleData: SaleFormData) => {
  try {
    if (editingSale?.id) {
      await window.electronAPI.database.sales.update(editingSale.id, updateData);
    } else {
      await window.electronAPI.database.sales.create(saleData);
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
    // ...
  }
};
```

**After:**
```typescript
// ✅ Proposed implementation
const { invalidateQuery } = useDataCache();
const { setIsFormOpen, setEditingSale, editingSale } = useSalesUIStore(useShallow(selectDialogs));

const handleSaveSale = async (saleData: SaleFormData) => {
  try {
    if (editingSale?.id) {
      await window.electronAPI.database.sales.update(editingSale.id, updateData);
      toast.success('Venta actualizada correctamente');
    } else {
      await window.electronAPI.database.sales.create(saleData);
      toast.success('Venta creada correctamente');
    }
    
    // Single invalidation - all subscribed queries will auto-refresh
    invalidateQuery(['sales']);
    invalidateQuery(['products']);
    invalidateQuery(['installments']);
    
    setEditingSale(undefined);
    setIsFormOpen(false);
  } catch (error) {
    console.error('Error guardando venta:', error);
    toast.error('Error guardando la venta');
    throw error;
  }
};
```

### Phase 3: Extract Custom Hooks (Priority: MEDIUM)

#### 3.1 Create `useSalesOperations` Hook
```typescript
// hooks/use-sales-operations.ts
import { useCallback } from 'react';
import { useDataCache } from './use-data-cache';
import { useSalesUIStore, selectDialogs } from '@/context/stores/sales-ui-store';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';
import type { Sale, SaleFormData } from '@/lib/database-operations';

export function useSalesOperations() {
  const { invalidateQuery } = useDataCache();
  const { setIsFormOpen, setEditingSale, editingSale } = useSalesUIStore(useShallow(selectDialogs));

  const handleSaveSale = useCallback(async (saleData: SaleFormData) => {
    try {
      if (editingSale?.id) {
        await window.electronAPI.database.sales.update(editingSale.id, {
          customer_id: saleData.customer_id,
          notes: saleData.notes,
          date: saleData.date
        });
        toast.success('Venta actualizada correctamente');
      } else {
        await window.electronAPI.database.sales.create(saleData);
        toast.success('Venta creada correctamente');
      }
      
      invalidateQuery(['sales']);
      invalidateQuery(['products']);
      invalidateQuery(['installments']);
      
      setEditingSale(undefined);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Error guardando venta:', error);
      toast.error('Error guardando la venta');
      throw error;
    }
  }, [editingSale, invalidateQuery, setEditingSale, setIsFormOpen]);

  const handleDeleteSale = useCallback(async (saleId: number) => {
    try {
      await window.electronAPI.database.sales.delete(saleId);
      invalidateQuery(['sales']);
      invalidateQuery(['installments']);
      toast.success('Venta eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando venta:', error);
      toast.error('Error eliminando la venta');
    }
  }, [invalidateQuery]);

  const handleBulkDeleteSales = useCallback(async (saleIds: number[]) => {
    try {
      for (const saleId of saleIds) {
        await window.electronAPI.database.sales.delete(saleId);
      }
      invalidateQuery(['sales']);
      toast.success(`Ventas eliminadas: ${saleIds.length}`);
    } catch (error) {
      console.error('Error eliminando ventas:', error);
      toast.error('Error eliminando las ventas seleccionadas');
      throw error;
    }
  }, [invalidateQuery]);

  const handleBulkStatusUpdate = useCallback(async (saleIds: number[], status: Sale['payment_status']) => {
    try {
      for (const saleId of saleIds) {
        await window.electronAPI.database.sales.update(saleId, { payment_status: status });
      }
      invalidateQuery(['sales']);
      const statusLabel = status === 'paid' ? 'Pagadas' : 'Pendientes';
      toast.success(`Estado actualizado a ${statusLabel}`);
    } catch (error) {
      console.error('Error actualizando estado de ventas:', error);
      toast.error('Error actualizando el estado de las ventas');
      throw error;
    }
  }, [invalidateQuery]);

  const handleEditSale = useCallback((sale: Sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
  }, [setEditingSale, setIsFormOpen]);

  const handleAddSale = useCallback(() => {
    setEditingSale(undefined);
    setIsFormOpen(true);
  }, [setEditingSale, setIsFormOpen]);

  return {
    handleSaveSale,
    handleDeleteSale,
    handleBulkDeleteSales,
    handleBulkStatusUpdate,
    handleEditSale,
    handleAddSale,
  };
}
```

#### 3.2 Create Similar Hooks
- `useCustomersOperations`
- `useProductsOperations`

### Phase 4: Component Simplification (Priority: MEDIUM)

#### 4.1 Simplified Sales Page

**Result:**
```typescript
// app/sales/page.tsx (AFTER refactoring)
'use client';

import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';

// Stores & Hooks
import { useSalesUIStore, selectFilters, selectDialogs, selectHighlight } from '@/context/stores/sales-ui-store';
import { useQuery } from '@/hooks/use-data-cache';
import { useSalesOperations } from '@/hooks/use-sales-operations';

// Components
import { DashboardLayout } from '@/components/dashboard-layout';
import { SaleForm } from '@/components/sales/sale-form';
import { SalesTable } from '@/components/sales/sales-table';
import { InstallmentDashboard } from '@/components/sales/installments-dashboard/installment-dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  
  // Zustand state
  const { currentPage, debouncedSearch } = useSalesUIStore(useShallow(selectFilters));
  const { isFormOpen, editingSale, setIsFormOpen } = useSalesUIStore(useShallow(selectDialogs));
  const { activeTab, setActiveTab } = useSalesUIStore(state => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
  }));
  
  // Data fetching
  const { data, isLoading } = useQuery({
    key: ['sales', currentPage, 25, debouncedSearch],
    fetchFn: async () => {
      const result = await window.electronAPI.database.sales.getPaginated(currentPage, 25, debouncedSearch);
      return {
        items: result.sales,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || 25,
      };
    },
    enabled: isElectron,
  });
  
  // Operations
  const operations = useSalesOperations();
  
  // Derived state
  const sales = data?.items ?? [];
  const paginationInfo = data ? {
    total: data.total,
    totalPages: data.totalPages,
    currentPage: data.currentPage,
    pageSize: data.pageSize,
  } : undefined;
  
  const stats = useMemo(() => {
    const now = new Date();
    const calcSaleTotal = (sale: Sale) => {
      const direct = Number((sale as any).total_amount ?? 0);
      if (direct > 0) return direct;
      const items = Array.isArray((sale as any).items) ? (sale as any).items : [];
      return items.reduce((acc: number, it: any) => 
        acc + (Number(it.line_total ?? (Number(it.quantity || 0) * Number(it.unit_price || 0))) || 0), 0);
    };
    
    const monthlyRevenue = sales.reduce((sum, sale) => {
      const d = new Date((sale as any).date || (sale as any).created_at || '');
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        ? sum + calcSaleTotal(sale)
        : sum;
    }, 0);
    
    return {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + calcSaleTotal(sale), 0),
      monthlyRevenue,
      installmentSales: sales.filter(sale => sale.payment_type === 'installments').length,
      paidSales: sales.filter(sale => sale.payment_status === 'paid').length,
      pendingSales: sales.filter(sale => sale.payment_status === 'unpaid').length
    };
  }, [sales]);
  
  // Handle tab from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam as 'sales' | 'installments');
    }
  }, [searchParams, setActiveTab]);
  
  return (
    <DashboardLayout>
      <div className="p-8">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'installments')}>
          <TabsList>
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="installments">Cuotas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sales">
            <SalesTable
              sales={sales}
              isLoading={isLoading}
              paginationInfo={paginationInfo}
              onEdit={operations.handleEditSale}
              onDelete={operations.handleDeleteSale}
              onBulkDelete={operations.handleBulkDeleteSales}
              onBulkStatusUpdate={operations.handleBulkStatusUpdate}
            />
          </TabsContent>
          
          <TabsContent value="installments">
            <InstallmentDashboard />
          </TabsContent>
        </Tabs>
        
        <SaleForm
          sale={editingSale}
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSave={operations.handleSaveSale}
        />
      </div>
    </DashboardLayout>
  );
}
```

**Benefits:**
- **~970 lines → ~150 lines** (85% reduction)
- Clear separation of concerns
- Easy to test
- Easy to understand
- Consistent with installment dashboard

---

## 🔧 Additional Technical Debt Items

### 1. **Inconsistent Highlight Management**

**Current State:**
- Each page manages highlights differently
- Mix of `usePersistedState` and local state
- Duplicate scroll logic

**Recommendation:**
- Create shared `useHighlight` hook
- Centralize scroll behavior
- Use Zustand for highlight state

### 2. **Duplicate Pagination Logic**

**Current State:**
- Each page implements pagination separately
- Inconsistent page size handling
- Manual page state management

**Recommendation:**
- Create `usePagination` hook
- Standardize page size across app
- Include in Zustand stores

### 3. **Missing TypeScript Strictness**

**Issues Found:**
```typescript
// ❌ Using 'any' types
const [paginationInfo, setPaginationInfo] = useState<any>(undefined);
paymentInstallment: any | null;
deleteCustomer: any | null;
```

**Recommendation:**
- Enable `strict: true` in `tsconfig.json`
- Define proper interfaces for all state
- Remove all `any` types

### 4. **Inconsistent Error Handling**

**Current State:**
```typescript
// Some places
try {
  // ...
} catch (error) {
  console.error('Error:', error);
}

// Other places
try {
  // ...
} catch (error: any) {
  console.error('Error:', error);
  toast.error(error.message || 'Error message');
}
```

**Recommendation:**
- Create centralized error handling utility
- Consistent toast notifications
- Proper error logging

### 5. **Console.log Statements**

**Found in:**
- `installment-dashboard.tsx`: `console.log('[InstallmentDashboard] Fetching from DB...')`
- `sales/page.tsx`: `console.time('loadSales_db')`, `console.timeEnd('loadSales_db')`
- Multiple other locations

**Recommendation:**
- Remove or replace with proper logging library
- Use environment-based logging
- Consider structured logging

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Create `context/stores/sales-ui-store.ts`
- [ ] Create `context/stores/customers-ui-store.ts`
- [ ] Create `context/stores/products-ui-store.ts`
- [ ] Create `hooks/use-sales-operations.ts`
- [ ] Create `hooks/use-customers-operations.ts`
- [ ] Create `hooks/use-products-operations.ts`

### Week 2: Sales Page Migration
- [ ] Refactor `app/sales/page.tsx` to use Zustand
- [ ] Migrate to `useQuery` for data fetching
- [ ] Remove manual cache management
- [ ] Update `SalesTable` component if needed
- [ ] Test all sales operations
- [ ] Verify highlight functionality
- [ ] Verify pagination

### Week 3: Customers Page Migration
- [ ] Refactor `app/customers/page.tsx` to use Zustand
- [ ] Migrate to `useQuery` for data fetching
- [ ] Handle `showArchived` state properly
- [ ] Update `CustomersTable` component if needed
- [ ] Test all customer operations
- [ ] Verify highlight functionality

### Week 4: Products Page Migration
- [ ] Refactor `app/products/page.tsx` to use Zustand
- [ ] Migrate to `useQuery` for data fetching
- [ ] Update `ProductsTable` component if needed
- [ ] Test all product operations
- [ ] Verify toggle status functionality

### Week 5: Cleanup & Polish
- [ ] Remove unused state variables
- [ ] Remove unused useEffect hooks
- [ ] Clean up console.log statements
- [ ] Add proper TypeScript types
- [ ] Update documentation
- [ ] Performance testing
- [ ] Code review

---

## 🎓 Learning Resources

### Zustand Best Practices
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Preventing unnecessary re-renders with useShallow](https://github.com/pmndrs/zustand#preventing-rerenders-with-useshallow)
- [Zustand DevTools](https://github.com/pmndrs/zustand#devtools)

### React Query Patterns (Similar to our useQuery)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
- [React Query and Forms](https://tkdodo.eu/blog/react-query-and-forms)

---

## 📈 Expected Benefits

### Code Quality
- **85% reduction** in page component lines
- **Improved testability** through separation of concerns
- **Better type safety** with proper TypeScript usage
- **Consistent patterns** across all pages

### Performance
- **Fewer unnecessary re-renders** with `useShallow`
- **Better cache utilization** with automatic invalidation
- **Reduced memory usage** with centralized state

### Developer Experience
- **Easier debugging** with Zustand DevTools
- **Faster development** with reusable hooks
- **Better code navigation** with clear structure
- **Reduced cognitive load** with simpler components

### Maintainability
- **Single source of truth** for UI state
- **Predictable state updates** with named actions
- **Easy to add features** with established patterns
- **Reduced bugs** from consistent architecture

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Refactor one page at a time
- Comprehensive testing before deployment
- Keep old code commented until verified
- Use feature flags if needed

### Risk 2: Learning Curve
**Mitigation:**
- Document patterns clearly
- Pair programming sessions
- Code review process
- Reference installment dashboard as example

### Risk 3: Migration Time
**Mitigation:**
- Prioritize high-traffic pages
- Incremental migration
- Don't refactor everything at once
- Focus on most problematic areas first

---

## 📝 Conclusion

The installment dashboard represents a **significant improvement** in code quality and architecture. By replicating this pattern across the application, we can:

1. **Reduce technical debt** by 70-80%
2. **Improve code maintainability** significantly
3. **Enhance developer productivity**
4. **Reduce bugs** from inconsistent patterns
5. **Improve performance** through better state management

The migration should be done **incrementally**, starting with the Sales page (highest complexity), followed by Customers and Products pages.

**Estimated Total Effort:** 4-5 weeks for complete migration
**Expected ROI:** High - reduced bugs, faster feature development, better code quality

---

**Next Steps:**
1. Review this analysis with the team
2. Prioritize which pages to refactor first
3. Create detailed implementation tickets
4. Begin Phase 1: Create Zustand stores
5. Start with Sales page migration as proof of concept
