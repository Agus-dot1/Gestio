'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import type { Customer, Product, Sale } from '@/lib/database-operations';

export interface PaginatedData<T> {
  items: T[];
  total: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  searchTerm: string;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export type QueryKey = string | (string | number | boolean | null | undefined)[];

export interface DataCacheContextType {
  // Generic Query System
  getQueryData: <T>(key: QueryKey) => T | null;
  setQueryData: <T>(key: QueryKey, data: T) => void;
  invalidateQuery: (key: QueryKey) => void;

  // Legacy / Direct access if needed
  getCachedCustomers: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Customer> | null;
  setCachedCustomers: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Customer>) => void;
  isCustomersCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;

  getCachedProducts: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Product> | null;
  setCachedProducts: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Product>) => void;
  isProductsCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;

  getCachedSales: (page: number, pageSize: number, searchTerm: string) => PaginatedData<Sale> | null;
  setCachedSales: (page: number, pageSize: number, searchTerm: string, data: PaginatedData<Sale>) => void;
  isSalesCacheExpired: (page: number, pageSize: number, searchTerm: string) => boolean;

  clearCache: () => void;
  invalidateCache: (type: 'customers' | 'products' | 'sales' | 'all') => void;
}

const DataCacheContext = createContext<(DataCacheContextType & { subscribe: (key: QueryKey, cb: () => void) => () => void }) | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000;

function stringifyKey(key: QueryKey): string {
  if (Array.isArray(key)) {
    return key.map(k => String(k ?? '')).join(':');
  }
  return key;
}

function isExpired(entry: CacheEntry<any>): boolean {
  return Date.now() > entry.expiresAt;
}

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const [genericCache, setGenericCache] = useState<Map<string, CacheEntry<any>>>(new Map());
  // Listeners for invalidation
  const listeners = useRef<Map<string, Set<() => void>>>(new Map());

  const getQueryData = useCallback(<T,>(key: QueryKey): T | null => {
    const sKey = stringifyKey(key);
    const entry = genericCache.get(sKey);
    if (entry && !isExpired(entry)) {
      return entry.data as T;
    }
    return null;
  }, [genericCache]);

  const setQueryData = useCallback(<T,>(key: QueryKey, data: T) => {
    const sKey = stringifyKey(key);
    setGenericCache(prev => {
      const next = new Map(prev);
      next.set(sKey, {
        data,
        expiresAt: Date.now() + CACHE_DURATION
      });
      return next;
    });
  }, []);

  const invalidateQuery = useCallback((key: QueryKey) => {
    const sKey = stringifyKey(key);

    // 1. Remove from cache
    setGenericCache(prev => {
      const next = new Map(prev);

      const keysToDelete = Array.from(next.keys()).filter(k => k.startsWith(sKey));
      keysToDelete.forEach(k => next.delete(k));

      return next;
    });

    // 2. Notify listeners
    listeners.current.forEach((callbacks, listenKey) => {
      if (listenKey.startsWith(sKey)) {
        callbacks.forEach(cb => cb());
      }
    });
  }, []);

  const clearCache = useCallback(() => {
    setGenericCache(new Map());
    listeners.current.forEach(callbacks => callbacks.forEach(cb => cb()));
  }, []);

  const invalidateCache = useCallback((type: 'customers' | 'products' | 'sales' | 'all') => {
    if (type === 'all') {
      clearCache();
    } else {
      invalidateQuery([type]);
    }
  }, [clearCache, invalidateQuery]);

  // Legacy helper bridge
  const getCachedCustomers = useCallback((page: number, pageSize: number, searchTerm: string) =>
    getQueryData<PaginatedData<Customer>>(['customers', page, pageSize, searchTerm]), [getQueryData]);

  const setCachedCustomers = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Customer>) =>
    setQueryData(['customers', page, pageSize, searchTerm], data), [setQueryData]);

  const isCustomersCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const entry = genericCache.get(stringifyKey(['customers', page, pageSize, searchTerm]));
    return !entry || isExpired(entry);
  }, [genericCache]);

  const getCachedProducts = useCallback((page: number, pageSize: number, searchTerm: string) =>
    getQueryData<PaginatedData<Product>>(['products', page, pageSize, searchTerm]), [getQueryData]);

  const setCachedProducts = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Product>) =>
    setQueryData(['products', page, pageSize, searchTerm], data), [setQueryData]);

  const isProductsCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const entry = genericCache.get(stringifyKey(['products', page, pageSize, searchTerm]));
    return !entry || isExpired(entry);
  }, [genericCache]);

  const getCachedSales = useCallback((page: number, pageSize: number, searchTerm: string) =>
    getQueryData<PaginatedData<Sale>>(['sales', page, pageSize, searchTerm]), [getQueryData]);

  const setCachedSales = useCallback((page: number, pageSize: number, searchTerm: string, data: PaginatedData<Sale>) =>
    setQueryData(['sales', page, pageSize, searchTerm], data), [setQueryData]);

  const isSalesCacheExpired = useCallback((page: number, pageSize: number, searchTerm: string) => {
    const entry = genericCache.get(stringifyKey(['sales', page, pageSize, searchTerm]));
    return !entry || isExpired(entry);
  }, [genericCache]);

  const subscribe = useCallback((key: QueryKey, callback: () => void) => {
    const sKey = stringifyKey(key);
    if (!listeners.current.has(sKey)) {
      listeners.current.set(sKey, new Set());
    }
    listeners.current.get(sKey)!.add(callback);
    return () => {
      listeners.current.get(sKey)?.delete(callback);
      if (listeners.current.get(sKey)?.size === 0) {
        listeners.current.delete(sKey);
      }
    };
  }, []);

  const value = {
    getQueryData,
    setQueryData,
    invalidateQuery,
    getCachedCustomers,
    setCachedCustomers,
    isCustomersCacheExpired,
    getCachedProducts,
    setCachedProducts,
    isProductsCacheExpired,
    getCachedSales,
    setCachedSales,
    isSalesCacheExpired,
    clearCache,
    invalidateCache,
    subscribe
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
}

interface UseQueryOptions<T> {
  key: QueryKey;
  fetchFn: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
}

export function useQuery<T>({ key, fetchFn, enabled = true, onSuccess }: UseQueryOptions<T>) {
  const cache = useDataCache();
  const [data, setData] = useState<T | null>(() => cache.getQueryData<T>(key));
  const [isLoading, setIsLoading] = useState(!data && enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchRef = useRef(0);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled && !force) return;

    const currentFetchId = ++fetchRef.current;

    // Check cache first
    const cached = cache.getQueryData<T>(key);
    if (cached && !force) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchFn();
      if (currentFetchId === fetchRef.current) {
        cache.setQueryData(key, result);
        setData(result);
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      if (currentFetchId === fetchRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (currentFetchId === fetchRef.current) {
        setIsLoading(false);
      }
    }
  }, [cache, key, fetchFn, enabled, onSuccess]);

  // Initial fetch and fetch on key change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to invalidations
  useEffect(() => {
    return cache.subscribe(key, () => {
      fetchData(true);
    });
  }, [cache, key, fetchData]);

  return { data, isLoading, error, refetch: () => fetchData(true) };
}

export function usePrefetch() {
  const cache = useDataCache();

  const prefetchCustomers = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const key = ['customers', page, pageSize, searchTerm];
    const cached = cache.getQueryData<PaginatedData<Customer>>(key);
    if (cached) return;

    try {
      const result = await window.electronAPI.database.customers.getPaginated(page, pageSize, searchTerm);
      const data: PaginatedData<Customer> = {
        items: result.customers,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      };
      cache.setQueryData(key, data);
    } catch (error) {
      console.error('Failed to prefetch customers:', error);
    }
  }, [cache]);

  const prefetchProducts = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const key = ['products', page, pageSize, searchTerm];
    const cached = cache.getQueryData<PaginatedData<Product>>(key);
    if (cached) return;

    try {
      const result = await window.electronAPI.database.products.getPaginated(page, pageSize, searchTerm);
      const data: PaginatedData<Product> = {
        items: result.products,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      };
      cache.setQueryData(key, data);
    } catch (error) {
      console.error('Failed to prefetch products:', error);
    }
  }, [cache]);

  const prefetchSales = useCallback(async (page: number = 1, pageSize: number = 25, searchTerm: string = '') => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    const key = ['sales', page, pageSize, searchTerm];
    const cached = cache.getQueryData<PaginatedData<Sale>>(key);
    if (cached) return;

    try {
      const result = await window.electronAPI.database.sales.getPaginated(page, pageSize, searchTerm);
      const data: PaginatedData<Sale> = {
        items: result.sales,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
        searchTerm,
        timestamp: Date.now()
      };
      cache.setQueryData(key, data);
    } catch (error) {
      console.error('Failed to prefetch sales:', error);
    }
  }, [cache]);

  return {
    prefetchCustomers,
    prefetchProducts,
    prefetchSales
  };
}