import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Sale } from '@/lib/database-operations';

type StatusFilter = 'all' | 'paid' | 'unpaid';
type SortBy = 'date' | 'customer' | 'amount' | 'status';

interface SalesUIState {
    // Filters
    searchTerm: string;
    debouncedSearch: string;
    statusFilter: StatusFilter;
    sortBy: SortBy;
    sortOrder: 'asc' | 'desc';

    // Pagination
    currentPage: number;

    // Tabs
    activeTab: 'sales' | 'installments';

    // Dialogs
    isFormOpen: boolean;
    editingSale: Sale | undefined;

    // Highlight
    stickyHighlight: string | null;
    autoScrollEnabled: boolean;

    // Filter Actions
    setSearchTerm: (term: string) => void;
    setDebouncedSearch: (term: string) => void;
    setStatusFilter: (filter: StatusFilter) => void;
    setSortBy: (sort: SortBy) => void;
    setSortOrder: (order: 'asc' | 'desc') => void;
    resetFilters: () => void;

    // Pagination Actions
    setCurrentPage: (page: number) => void;

    // Tab Actions
    setActiveTab: (tab: 'sales' | 'installments') => void;

    // Dialog Actions
    setIsFormOpen: (open: boolean) => void;
    setEditingSale: (sale: Sale | undefined) => void;

    // Highlight Actions
    setStickyHighlight: (id: string | null) => void;
    clearHighlight: () => void;
    setAutoScrollEnabled: (enabled: boolean) => void;
}

const initialState = {
    searchTerm: '',
    debouncedSearch: '',
    statusFilter: 'all' as StatusFilter,
    sortBy: 'date' as SortBy,
    sortOrder: 'desc' as 'asc' | 'desc',
    currentPage: 1,
    activeTab: 'sales' as 'sales' | 'installments',
    isFormOpen: false,
    editingSale: undefined,
    stickyHighlight: null,
    autoScrollEnabled: true,
};

export const useSalesUIStore = create<SalesUIState>()(
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

            resetFilters: () =>
                set({
                    searchTerm: '',
                    debouncedSearch: '',
                    statusFilter: 'all',
                    sortBy: 'date',
                    sortOrder: 'desc',
                    currentPage: 1,
                }, false, 'resetFilters'),

            // Pagination Actions
            setCurrentPage: (page) =>
                set({ currentPage: page }, false, 'setCurrentPage'),

            // Tab Actions
            setActiveTab: (tab) =>
                set({ activeTab: tab }, false, 'setActiveTab'),

            // Dialog Actions
            setIsFormOpen: (open) =>
                set({ isFormOpen: open }, false, 'setIsFormOpen'),

            setEditingSale: (sale) =>
                set({ editingSale: sale }, false, 'setEditingSale'),

            // Highlight Actions
            setStickyHighlight: (id) =>
                set({ stickyHighlight: id }, false, 'setStickyHighlight'),

            clearHighlight: () =>
                set({ stickyHighlight: null }, false, 'clearHighlight'),

            setAutoScrollEnabled: (enabled) =>
                set({ autoScrollEnabled: enabled }, false, 'setAutoScrollEnabled'),
        }),
        { name: 'SalesUIStore' }
    )
);

// Selectors for performance
export const selectFilters = (state: SalesUIState) => ({
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    statusFilter: state.statusFilter,
    sortBy: state.sortBy,
    sortOrder: state.sortOrder,
    currentPage: state.currentPage,
    setSearchTerm: state.setSearchTerm,
    setDebouncedSearch: state.setDebouncedSearch,
    setStatusFilter: state.setStatusFilter,
    setSortBy: state.setSortBy,
    setSortOrder: state.setSortOrder,
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
    clearHighlight: state.clearHighlight,
    setAutoScrollEnabled: state.setAutoScrollEnabled,
});

export const selectTabs = (state: SalesUIState) => ({
    activeTab: state.activeTab,
    setActiveTab: state.setActiveTab,
});