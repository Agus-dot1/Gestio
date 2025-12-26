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
                // Update existing sale
                const updateData = {
                    customer_id: saleData.customer_id,
                    notes: saleData.notes,
                    date: saleData.date
                };
                await window.electronAPI.database.sales.update(editingSale.id, updateData);
                toast.success('Venta actualizada correctamente');
            } else {
                // Create new sale
                await window.electronAPI.database.sales.create(saleData);
                toast.success('Venta creada correctamente');
            }

            // Invalidate related queries - they will auto-refresh
            invalidateQuery(['sales']);
            invalidateQuery(['products']);
            invalidateQuery(['installments']);

            // Close form
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

            // Invalidate queries
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

    const handleBulkStatusUpdate = useCallback(async (
        saleIds: number[],
        status: Sale['payment_status']
    ) => {
        try {
            for (const saleId of saleIds) {
                await window.electronAPI.database.sales.update(saleId, {
                    payment_status: status
                });
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

    const handleFormClose = useCallback((open: boolean) => {
        setIsFormOpen(open);
        if (!open) {
            setEditingSale(undefined);
        }
    }, [setIsFormOpen, setEditingSale]);

    return {
        handleSaveSale,
        handleDeleteSale,
        handleBulkDeleteSales,
        handleBulkStatusUpdate,
        handleEditSale,
        handleAddSale,
        handleFormClose,
    };
}