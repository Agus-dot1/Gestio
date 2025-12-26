import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';
type SortBy = 'customer' | 'amount' | 'dueDate' | 'status';
type PeriodFilter = 'all' | 'monthly' | 'weekly' | 'biweekly';

interface InstallmentUIState {
    // Filters
    searchTerm: string;
    debouncedSearch: string;
    statusFilter: StatusFilter;
    sortBy: SortBy;
    sortOrder: 'asc' | 'desc';
    periodFilter: PeriodFilter;

    // Expansion
    expandedCustomers: Set<number>;
    expandedSales: Set<number>;

    // Highlight
    stickyHighlight: string | null;
    autoScrollEnabled: boolean;

    // Dialogs/Modals
    isInstallmentFormOpen: boolean;
    paymentDialogOpen: boolean;
    paymentInstallment: any | null;
    selectedInstallment: any | null;
    deleteCustomer: any | null;
    deleteSale: any | null;
    openDatePickerId: number | null;
    openMarkPaidPickerId: number | null;
    selectedPaymentDates: Map<number, string>;

    // Filter Actions
    setSearchTerm: (term: string) => void;
    setDebouncedSearch: (term: string) => void;
    setStatusFilter: (filter: StatusFilter) => void;
    setSortBy: (sort: SortBy) => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    setPeriodFilter: (filter: PeriodFilter) => void;
    resetFilters: () => void;

    // Expansion Actions
    toggleCustomer: (id: number) => void;
    toggleSale: (id: number) => void;
    expandCustomer: (id: number) => void;
    expandSale: (id: number) => void;
    collapseAll: () => void;

    // Highlight Actions
    setStickyHighlight: (id: string | null) => void;
    clearHighlight: () => void;
    setAutoScrollEnabled: (enabled: boolean) => void;

    // Dialog Actions
    setInstallmentFormOpen: (open: boolean) => void;
    setPaymentDialogOpen: (open: boolean) => void;
    setPaymentInstallment: (installment: any | null) => void;
    setSelectedInstallment: (installment: any | null) => void;
    setDeleteCustomer: (customer: any | null) => void;
    setDeleteSale: (sale: any | null) => void;
    setOpenDatePickerId: (id: number | null) => void;
    setOpenMarkPaidPickerId: (id: number | null) => void;
    setPaymentDateForInstallment: (instId: number, date?: string) => void;
    clearPaymentDate: (instId: number) => void;
}

const initialState = {
    searchTerm: '',
    debouncedSearch: '',
    statusFilter: 'all' as StatusFilter,
    sortBy: 'customer' as SortBy,
    sortOrder: 'asc' as 'asc' | 'desc',
    periodFilter: 'all' as PeriodFilter,
    expandedCustomers: new Set<number>(),
    expandedSales: new Set<number>(),
    stickyHighlight: null,
    autoScrollEnabled: true,
    isInstallmentFormOpen: false,
    paymentDialogOpen: false,
    paymentInstallment: null,
    selectedInstallment: null,
    deleteCustomer: null,
    deleteSale: null,
    openDatePickerId: null,
    openMarkPaidPickerId: null,
    selectedPaymentDates: new Map<number, string>(),
};

export const useInstallmentUIStore = create<InstallmentUIState>()(
    devtools(
        (set) => ({
            ...initialState,

            // Filter Actions
            setSearchTerm: (term) =>
                set({ searchTerm: term }, false, 'setSearchTerm'),

            setDebouncedSearch: (term) =>
                set({ debouncedSearch: term }, false, 'setDebouncedSearch'),

            setStatusFilter: (filter) =>
                set({ statusFilter: filter }, false, 'setStatusFilter'),

            setSortBy: (sort) =>
                set({ sortBy: sort }, false, 'setSortBy'),

            setSortOrder: (order) =>
                set({ sortOrder: order }, false, 'setSortOrder'),

            setPeriodFilter: (filter) =>
                set({ periodFilter: filter }, false, 'setPeriodFilter'),

            resetFilters: () =>
                set({
                    searchTerm: '',
                    debouncedSearch: '',
                    statusFilter: 'all',
                    sortBy: 'customer',
                    sortOrder: 'asc',
                    periodFilter: 'all',
                }, false, 'resetFilters'),

            // Expansion Actions
            toggleCustomer: (id) =>
                set((state) => {
                    const next = new Set(state.expandedCustomers);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return { expandedCustomers: next };
                }, false, 'toggleCustomer'),

            toggleSale: (id) =>
                set((state) => {
                    const next = new Set(state.expandedSales);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return { expandedSales: next };
                }, false, 'toggleSale'),

            expandCustomer: (id) =>
                set((state) => ({
                    expandedCustomers: new Set(state.expandedCustomers).add(id)
                }), false, 'expandCustomer'),

            expandSale: (id) =>
                set((state) => ({
                    expandedSales: new Set(state.expandedSales).add(id)
                }), false, 'expandSale'),

            collapseAll: () =>
                set({
                    expandedCustomers: new Set(),
                    expandedSales: new Set(),
                }, false, 'collapseAll'),

            // Highlight Actions
            setStickyHighlight: (id) =>
                set({ stickyHighlight: id }, false, 'setStickyHighlight'),

            clearHighlight: () =>
                set({ stickyHighlight: null }, false, 'clearHighlight'),

            setAutoScrollEnabled: (enabled) =>
                set({ autoScrollEnabled: enabled }, false, 'setAutoScrollEnabled'),

            // Dialog Actions
            setInstallmentFormOpen: (open) =>
                set({ isInstallmentFormOpen: open }, false, 'setInstallmentFormOpen'),

            setPaymentDialogOpen: (open) =>
                set({ paymentDialogOpen: open }, false, 'setPaymentDialogOpen'),

            setPaymentInstallment: (installment) =>
                set({ paymentInstallment: installment }, false, 'setPaymentInstallment'),

            setSelectedInstallment: (installment) =>
                set({ selectedInstallment: installment }, false, 'setSelectedInstallment'),

            setDeleteCustomer: (customer) =>
                set({ deleteCustomer: customer }, false, 'setDeleteCustomer'),

            setDeleteSale: (sale) =>
                set({ deleteSale: sale }, false, 'setDeleteSale'),

            setOpenDatePickerId: (id) =>
                set({ openDatePickerId: id }, false, 'setOpenDatePickerId'),

            setOpenMarkPaidPickerId: (id) =>
                set({ openMarkPaidPickerId: id }, false, 'setOpenMarkPaidPickerId'),

            setPaymentDateForInstallment: (instId, date) =>
                set((state) => {
                    const next = new Map(state.selectedPaymentDates);
                    if (date) next.set(instId, date);
                    else next.delete(instId);
                    return { selectedPaymentDates: next };
                }, false, 'setPaymentDateForInstallment'),

            clearPaymentDate: (instId) =>
                set((state) => {
                    const next = new Map(state.selectedPaymentDates);
                    next.delete(instId);
                    return { selectedPaymentDates: next };
                }, false, 'clearPaymentDate'),
        }),
        { name: 'InstallmentUIStore' }
    )
);

// Selectors for performance
export const selectFilters = (state: InstallmentUIState) => ({
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    statusFilter: state.statusFilter,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    periodFilter: state.periodFilter,
    setSearchTerm: state.setSearchTerm,
    setDebouncedSearch: state.setDebouncedSearch,
    setStatusFilter: state.setStatusFilter,
    setSortBy: state.setSortBy,
    setSortOrder: state.setSortOrder,
    setPeriodFilter: state.setPeriodFilter,
    resetFilters: state.resetFilters,
});

export const selectExpansion = (state: InstallmentUIState) => ({
    expandedCustomers: state.expandedCustomers,
    expandedSales: state.expandedSales,
    toggleCustomer: state.toggleCustomer,
    toggleSale: state.toggleSale,
    expandCustomer: state.expandCustomer,
    expandSale: state.expandSale,
    collapseAll: state.collapseAll,
});

export const selectHighlight = (state: InstallmentUIState) => ({
    stickyHighlight: state.stickyHighlight,
    autoScrollEnabled: state.autoScrollEnabled,
    setStickyHighlight: state.setStickyHighlight,
    clearHighlight: state.clearHighlight,
    setAutoScrollEnabled: state.setAutoScrollEnabled,
});

export const selectDialogs = (state: InstallmentUIState) => ({
    isInstallmentFormOpen: state.isInstallmentFormOpen,
    paymentDialogOpen: state.paymentDialogOpen,
    paymentInstallment: state.paymentInstallment,
    selectedInstallment: state.selectedInstallment,
    deleteCustomer: state.deleteCustomer,
    deleteSale: state.deleteSale,
    openDatePickerId: state.openDatePickerId,
    openMarkPaidPickerId: state.openMarkPaidPickerId,
    selectedPaymentDates: state.selectedPaymentDates,
    setInstallmentFormOpen: state.setInstallmentFormOpen,
    setPaymentDialogOpen: state.setPaymentDialogOpen,
    setPaymentInstallment: state.setPaymentInstallment,
    setSelectedInstallment: state.setSelectedInstallment,
    setDeleteCustomer: state.setDeleteCustomer,
    setDeleteSale: state.setDeleteSale,
    setOpenDatePickerId: state.setOpenDatePickerId,
    setOpenMarkPaidPickerId: state.setOpenMarkPaidPickerId,
    setPaymentDateForInstallment: state.setPaymentDateForInstallment,
    clearPaymentDate: state.clearPaymentDate,
});