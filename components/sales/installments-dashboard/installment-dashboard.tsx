'use client';

import { useState, useEffect, useMemo, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useShallow } from 'zustand/react/shallow';

// Hooks & Stores
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useQuery, useDataCache } from '@/hooks/use-data-cache';
import {
  useInstallmentUIStore,
  selectFilters,
  selectHighlight,
  selectDialogs,
  selectExpansion
} from '@/context/stores/installment-ui-store';
import { useInstallmentOperations } from '@/hooks/use-installment-operations';

// Helpers
import {
  formatDate,
  toISODateLocal,
  inferPeriodType,
  openWhatsApp
} from '@/lib/installments/installment-helpers';

// Components
import { InstallmentFilters } from './components/installment-filters';
import { HighlightBanner } from './components/installment-highlight';
import { CustomerList } from './components/table/installment-customer-list';
import { DeleteConfirmationDialogs } from './components/installment-delete-confimation';
import { InstallmentPaymentDialog } from './components/installment-payment-dialog';

// Types
import type { Customer, Sale, Installment } from '@/lib/database-operations';

interface CustomerWithInstallments extends Customer {
  sales: Sale[];
  installments: Installment[];
  totalOwed: number;
  overdueAmount: number;
  nextPaymentDate: string | null;
}

interface InstallmentDashboardProps {
  highlightId?: string | null;
  onRefresh?: () => void;
  partnerId?: number | null;
}

export interface InstallmentDashboardRef {
  refreshData: () => Promise<void>;
}

export const InstallmentDashboard = forwardRef<InstallmentDashboardRef, InstallmentDashboardProps>(
  ({ highlightId, onRefresh, partnerId }, ref) => {
    // 1. Hooks & Basic State
    const [isElectron] = useState(() => typeof window !== 'undefined' && !!window.electronAPI);
    const [clientDate, setClientDate] = useState<Date | null>(null);
    const initializedRef = useRef(false);
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const router = useRouter();
    const { invalidateQuery } = useDataCache();

    // 2. Zustand State
    const {
      searchTerm,
      debouncedSearch,
      setDebouncedSearch,
    } = useInstallmentUIStore(useShallow(selectFilters));

    const {
      stickyHighlight,
      autoScrollEnabled,
      setStickyHighlight,
    } = useInstallmentUIStore(useShallow(selectHighlight));

    const {
      paymentDialogOpen,
      paymentInstallment,
      selectedPaymentDates,
      setPaymentDialogOpen,
    } = useInstallmentUIStore(useShallow(selectDialogs));

    const {
      expandCustomer,
      expandSale,
    } = useInstallmentUIStore(useShallow(selectExpansion));

    // 3. Data Fetching
    const fetchInstallments = useCallback(async () => {
      console.log('[InstallmentDashboard] Fetching from DB...');
      const [allCustomers, allSalesUnfiltered] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.sales.getAll()
      ]);

      const allSales = partnerId
        ? allSalesUnfiltered.filter(s => (s.partner_id || 0) === Number(partnerId))
        : allSalesUnfiltered;

      const customersWithInstallments: CustomerWithInstallments[] = [];

      for (const customer of allCustomers) {
        const customerSales = allSales.filter(sale => sale.customer_id === customer.id);
        const installmentSales = customerSales.filter(sale => sale.payment_type === 'installments');

        if (installmentSales.length === 0) continue;

        const salesWithItems = await Promise.all(
          installmentSales.map(async (sale) => {
            try {
              const items = await window.electronAPI.database.saleItems.getBySale(sale.id!);
              return { ...sale, items };
            } catch (e) {
              console.warn('No se pudieron obtener items para la venta', sale.id, e);
              return { ...sale, items: [] };
            }
          })
        );

        let allInstallments: Installment[] = [];
        for (const sale of installmentSales) {
          const saleInstallments = await window.electronAPI.database.installments.getBySale(sale.id!);
          allInstallments = [...allInstallments, ...saleInstallments];
        }

        const totalOwed = allInstallments
          .filter(inst => inst.status !== 'paid')
          .reduce((sum, inst) => sum + inst.balance, 0);

        const overdueAmount = allInstallments
          .filter(inst => inst.status === 'overdue' || (inst.status === 'pending' && new Date(inst.due_date) < new Date()))
          .reduce((sum, inst) => sum + inst.balance, 0);

        const nextPayment = allInstallments
          .filter(inst => inst.status === 'pending')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

        customersWithInstallments.push({
          ...customer,
          sales: salesWithItems,
          installments: allInstallments,
          totalOwed,
          overdueAmount,
          nextPaymentDate: nextPayment?.due_date || null
        });
      }
      return customersWithInstallments;
    }, [partnerId]);

    const { data, isLoading, refetch } = useQuery<CustomerWithInstallments[]>({
      key: ['installments', partnerId],
      fetchFn: fetchInstallments,
      enabled: isElectron,
      onSuccess: () => {
        initializedRef.current = true;
      }
    });

    const customers = data ?? [];

    // 4. Operations Hook
    const operations = useInstallmentOperations(customers, onRefresh);

    // 5. Effects

    // Set client date once
    useEffect(() => {
      setClientDate(new Date());
    }, []);

    // Handle debounced search
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }, [searchTerm, setDebouncedSearch]);

    // Handle URL parameters & Highlight Persistence
    const highlightIdFromUrl = searchParams.get('highlight');
    useEffect(() => {
      if (highlightIdFromUrl) {
        setStickyHighlight(highlightIdFromUrl);
        const params = new URLSearchParams(searchParams);
        params.delete('highlight');
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }, [highlightIdFromUrl, pathname, router, searchParams, setStickyHighlight]);

    // Handle highlight expansion and scroll
    const activeHighlight = highlightIdFromUrl || stickyHighlight;
    useEffect(() => {
      if (activeHighlight && customers.length > 0) {
        if (activeHighlight.startsWith('i-')) {
          const instId = parseInt(activeHighlight.slice(2), 10);
          const targetCustomer = customers.find(c => c.installments.some(i => i.id === instId));
          const installment = targetCustomer?.installments.find(i => i.id === instId);
          if (targetCustomer?.id && installment) {
            expandCustomer(targetCustomer.id);
            expandSale(installment.sale_id);

            if (autoScrollEnabled) {
              setTimeout(() => {
                const el = document.getElementById(`installment-${instId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 500);
            }
          }
        } else if (activeHighlight.startsWith('s-')) {
          const saleId = parseInt(activeHighlight.replace('s-', ''));
          const customer = customers.find(c => c.sales.some(s => s.id === saleId));
          if (customer && customer.id) {
            expandCustomer(customer.id);
            expandSale(saleId);

            if (autoScrollEnabled) {
              setTimeout(() => {
                const el = document.getElementById(`sale-${saleId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 500);
            }
          }
        } else {
          const customerId = parseInt(activeHighlight);
          if (!isNaN(customerId)) {
            expandCustomer(customerId);

            if (autoScrollEnabled) {
              setTimeout(() => {
                const el = document.getElementById(`customer-${customerId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 500);
            }
          }
        }
      }
    }, [activeHighlight, customers, autoScrollEnabled, expandCustomer, expandSale]);

    // Handle partnerId change
    useEffect(() => {
      if (initializedRef.current) {
        initializedRef.current = false;
      }
    }, [partnerId]);

    // 6. Imperative Handle
    useImperativeHandle(ref, () => ({
      refreshData: refetch
    }), [refetch]);

    // 7. Calculations (Stats)
    const stats = useMemo(() => {
      const allInstallments = customers.flatMap(c => c.installments);
      return {
        totalCustomers: customers.length,
        totalInstallments: allInstallments.length,
        pendingInstallments: allInstallments.filter(i => i.status === 'pending').length,
        overdueInstallments: allInstallments.filter(i => {
          const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid';
          return isOverdue || i.status === 'overdue';
        }).length,
        totalOwed: allInstallments.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.balance, 0),
        overdueAmount: customers.reduce((sum, c) => sum + c.overdueAmount, 0)
      };
    }, [customers]);

    // 8. Render
    if (!isElectron) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Electron Requerido</h3>
              <p className="text-muted-foreground">
                La gestión de cuotas solo está disponible en la aplicación de escritorio.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6 overflow-y-visible">
        <HighlightBanner />

        <Card>
          <CardHeader>
            <InstallmentFilters />
          </CardHeader>
          <CardContent>
            <CustomerList
              customers={customers}
              isLoading={isLoading}
              onDeleteCustomer={operations.handleDeleteCustomer}
              onDeleteSale={operations.handleDeleteSale}
              onMarkAsPaid={operations.handleMarkAsPaid}
              onRevertPayment={operations.handleRevertPayment}
              onOpenPaymentDialog={operations.openPaymentDialog}
              onSelectDate={operations.handleSelectDate}
            />
          </CardContent>
        </Card>

        <DeleteConfirmationDialogs
          onConfirmDeleteCustomer={operations.confirmDeleteCustomer}
          onConfirmDeleteSale={operations.confirmDeleteSale}
        />

        <InstallmentPaymentDialog
          open={paymentDialogOpen}
          installment={paymentInstallment}
          onOpenChange={setPaymentDialogOpen}
          onSuccess={async () => {
            invalidateQuery(['installments']);
            onRefresh?.();
          }}
          initialPaymentDate={paymentInstallment ? selectedPaymentDates.get(paymentInstallment.id!) : undefined}
        />
      </div>
    );
  }
);

InstallmentDashboard.displayName = 'InstallmentDashboard';
