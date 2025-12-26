# Refactoring Quick Reference

## 🎯 Goal
Replicate the **Zustand + useQuery** pattern from `installment-dashboard` across all pages.

---

## ✅ Good Pattern (Installment Dashboard)

### State Management
```typescript
// ✅ Zustand store with selectors
const { searchTerm, setSearchTerm } = useInstallmentUIStore(useShallow(selectFilters));
```

### Data Fetching
```typescript
// ✅ Declarative with useQuery
const { data, isLoading, refetch } = useQuery({
  key: ['installments', partnerId],
  fetchFn: fetchInstallments,
  enabled: isElectron,
});
```

### Cache Invalidation
```typescript
// ✅ Simple and declarative
invalidateQuery(['installments']);
```

---

## ❌ Anti-Pattern (Current Sales/Customers/Products)

### State Management
```typescript
// ❌ Too many useState hooks
const [sales, setSales] = useState<Sale[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
const [currentPage, setCurrentPage] = useState(1);
// ... 10+ more useState declarations
```

### Data Fetching
```typescript
// ❌ Imperative and complex
const loadSales = useCallback(async (forceRefresh = false) => {
  const cachedData = dataCache.getCachedSales(...);
  if (cachedData && !forceRefresh) {
    setSales(cachedData.items);
    setIsLoading(false);
    // ... 20+ more lines
  }
  // ... 30+ more lines
}, [/* complex dependencies */]);
```

### Cache Invalidation
```typescript
// ❌ Manual and error-prone
dataCache.invalidateCache('sales');
dataCache.invalidateCache('products');
await loadSales(true);
await loadOverdueSales();
if (installmentDashboardRef.current) {
  installmentDashboardRef.current.refreshData();
}
```

---

## 📦 Required Files to Create

### 1. Zustand Stores
```
context/stores/
├── installment-ui-store.ts  ✅ (exists - reference)
├── sales-ui-store.ts        ❌ (create)
├── customers-ui-store.ts    ❌ (create)
└── products-ui-store.ts     ❌ (create)
```

### 2. Operation Hooks
```
hooks/
├── use-installment-operations.ts  ✅ (exists - reference)
├── use-sales-operations.ts        ❌ (create)
├── use-customers-operations.ts    ❌ (create)
└── use-products-operations.ts     ❌ (create)
```

---

## 🔄 Migration Steps (Per Page)

### Step 1: Create Zustand Store
```typescript
// context/stores/[page]-ui-store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface [Page]UIState {
  // State
  searchTerm: string;
  currentPage: number;
  isFormOpen: boolean;
  // ... more state
  
  // Actions
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  setIsFormOpen: (open: boolean) => void;
  // ... more actions
}

export const use[Page]UIStore = create<[Page]UIState>()(
  devtools((set) => ({
    // Initial state
    searchTerm: '',
    currentPage: 1,
    isFormOpen: false,
    
    // Actions
    setSearchTerm: (term) => set({ searchTerm: term }, false, 'setSearchTerm'),
    setCurrentPage: (page) => set({ currentPage: page }, false, 'setCurrentPage'),
    setIsFormOpen: (open) => set({ isFormOpen: open }, false, 'setIsFormOpen'),
  }), { name: '[Page]UIStore' })
);

// Selectors
export const selectFilters = (state: [Page]UIState) => ({
  searchTerm: state.searchTerm,
  currentPage: state.currentPage,
  setSearchTerm: state.setSearchTerm,
  setCurrentPage: state.setCurrentPage,
});
```

### Step 2: Create Operations Hook
```typescript
// hooks/use-[page]-operations.ts
import { useCallback } from 'react';
import { useDataCache } from './use-data-cache';
import { use[Page]UIStore, selectDialogs } from '@/context/stores/[page]-ui-store';
import { useShallow } from 'zustand/react/shallow';
import { toast } from 'sonner';

export function use[Page]Operations() {
  const { invalidateQuery } = useDataCache();
  const { setIsFormOpen, setEditingItem } = use[Page]UIStore(useShallow(selectDialogs));

  const handleSave = useCallback(async (data) => {
    try {
      // Save logic
      invalidateQuery(['[page]']);
      setIsFormOpen(false);
      toast.success('Guardado correctamente');
    } catch (error) {
      toast.error('Error guardando');
      throw error;
    }
  }, [invalidateQuery, setIsFormOpen]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      // Delete logic
      invalidateQuery(['[page]']);
      toast.success('Eliminado correctamente');
    } catch (error) {
      toast.error('Error eliminando');
    }
  }, [invalidateQuery]);

  return {
    handleSave,
    handleDelete,
    // ... more operations
  };
}
```

### Step 3: Refactor Page Component
```typescript
// app/[page]/page.tsx
'use client';

import { useShallow } from 'zustand/react/shallow';
import { use[Page]UIStore, selectFilters, selectDialogs } from '@/context/stores/[page]-ui-store';
import { useQuery } from '@/hooks/use-data-cache';
import { use[Page]Operations } from '@/hooks/use-[page]-operations';

export default function [Page]Page() {
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
  
  // Zustand state
  const { currentPage, debouncedSearch } = use[Page]UIStore(useShallow(selectFilters));
  const { isFormOpen, editingItem } = use[Page]UIStore(useShallow(selectDialogs));
  
  // Data fetching
  const { data, isLoading } = useQuery({
    key: ['[page]', currentPage, 25, debouncedSearch],
    fetchFn: async () => {
      const result = await window.electronAPI.database.[page].getPaginated(currentPage, 25, debouncedSearch);
      return {
        items: result.[page],
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize || 25,
      };
    },
    enabled: isElectron,
  });
  
  // Operations
  const operations = use[Page]Operations();
  
  // Derived state
  const items = data?.items ?? [];
  
  return (
    <DashboardLayout>
      <[Page]Table
        items={items}
        isLoading={isLoading}
        onEdit={operations.handleEdit}
        onDelete={operations.handleDelete}
      />
      
      <[Page]Form
        item={editingItem}
        open={isFormOpen}
        onSave={operations.handleSave}
      />
    </DashboardLayout>
  );
}
```

---

## 🎯 Key Principles

### 1. **Single Source of Truth**
- UI state → Zustand store
- Server state → useQuery cache
- Never duplicate state

### 2. **Declarative Over Imperative**
```typescript
// ❌ Imperative
await loadData();
setIsLoading(true);
const data = await fetch();
setData(data);
setIsLoading(false);

// ✅ Declarative
const { data, isLoading } = useQuery({ key, fetchFn });
```

### 3. **Automatic Cache Invalidation**
```typescript
// ❌ Manual refresh
dataCache.invalidateCache('sales');
await loadSales();
await loadOtherData();
if (ref.current) ref.current.refresh();

// ✅ Automatic
invalidateQuery(['sales']); // All subscribers auto-refresh
```

### 4. **Use Selectors to Prevent Re-renders**
```typescript
// ❌ Will re-render on any store change
const store = useStore();

// ✅ Only re-renders when selected values change
const { searchTerm, setSearchTerm } = useStore(useShallow(selectFilters));
```

---

## 📊 Expected Results

### Before
```typescript
// ~970 lines
// 15+ useState hooks
// 5+ useEffect hooks
// Complex dependency arrays
// Manual cache management
```

### After
```typescript
// ~150 lines (85% reduction)
// 2-3 Zustand selectors
// 1-2 useEffect hooks
// Simple dependencies
// Automatic cache management
```

---

## 🚀 Quick Start

1. **Copy** `context/stores/installment-ui-store.ts` as template
2. **Adapt** for your page (sales/customers/products)
3. **Create** operations hook following `use-installment-operations.ts`
4. **Refactor** page component to use Zustand + useQuery
5. **Test** all functionality
6. **Remove** old code

---

## 📚 Reference Files

### Study These (Good Examples)
- ✅ `context/stores/installment-ui-store.ts`
- ✅ `hooks/use-installment-operations.ts`
- ✅ `components/sales/installments-dashboard/installment-dashboard.tsx`
- ✅ `hooks/use-data-cache.tsx` (useQuery implementation)

### Refactor These (Anti-patterns)
- ❌ `app/sales/page.tsx`
- ❌ `app/customers/page.tsx`
- ❌ `app/products/page.tsx`

---

## 🔍 Common Mistakes to Avoid

### 1. Not Using useShallow
```typescript
// ❌ Will cause unnecessary re-renders
const { searchTerm } = useStore(state => ({ searchTerm: state.searchTerm }));

// ✅ Prevents unnecessary re-renders
const { searchTerm } = useStore(useShallow(selectFilters));
```

### 2. Mixing State Management Patterns
```typescript
// ❌ Don't mix useState with Zustand
const [searchTerm, setSearchTerm] = useState('');
const { currentPage } = useStore();

// ✅ All UI state in Zustand
const { searchTerm, currentPage } = useStore(useShallow(selectFilters));
```

### 3. Manual Cache Management
```typescript
// ❌ Don't manually manage cache
const cachedData = cache.get();
if (cachedData) setData(cachedData);
else fetchData();

// ✅ Let useQuery handle it
const { data } = useQuery({ key, fetchFn });
```

### 4. Forgetting to Invalidate
```typescript
// ❌ Data won't refresh
await window.electronAPI.database.sales.create(data);
// No invalidation!

// ✅ Trigger refresh
await window.electronAPI.database.sales.create(data);
invalidateQuery(['sales']);
```

---

## 💡 Pro Tips

1. **Use DevTools**: Zustand DevTools show all state changes
2. **Name Actions**: Second parameter in `set()` helps debugging
3. **Organize Selectors**: Group related state in selectors
4. **Keep Stores Focused**: One store per page/feature
5. **Extract Operations**: Business logic in custom hooks
6. **Test Incrementally**: Migrate one page at a time

---

## ✅ Checklist (Per Page)

- [ ] Create Zustand store
- [ ] Create selectors
- [ ] Create operations hook
- [ ] Refactor page to use Zustand
- [ ] Replace manual data fetching with useQuery
- [ ] Remove all useState for UI state
- [ ] Remove manual cache management
- [ ] Update invalidation calls
- [ ] Test all CRUD operations
- [ ] Test pagination
- [ ] Test search/filters
- [ ] Test highlights
- [ ] Remove old code
- [ ] Update documentation

---

**Remember:** The installment dashboard is your reference implementation. When in doubt, check how it's done there!
