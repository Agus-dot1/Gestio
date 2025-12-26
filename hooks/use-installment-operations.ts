import { useCallback } from 'react';
import { toast } from 'sonner';
import { useDataCache } from '@/hooks/use-data-cache';
import { validateSequentialPayment } from '@/lib/installments/installments-scheduler';
import type { Installment, Sale, Customer } from '@/lib/database-operations';
import { useInstallmentUIStore } from '@/context/stores/installment-ui-store';

export function useInstallmentOperations(
    customers: any[],
    onRefresh?: () => void
) {
    const { invalidateQuery } = useDataCache();
    const setDeleteCustomer = useInstallmentUIStore(state => state.setDeleteCustomer);
    const setDeleteSale = useInstallmentUIStore(state => state.setDeleteSale);
    const setPaymentDialogOpen = useInstallmentUIStore(state => state.setPaymentDialogOpen);
    const setPaymentInstallment = useInstallmentUIStore(state => state.setPaymentInstallment);

    const handleMarkAsPaid = useCallback(async (installment: Installment) => {
        try {
            const customerWithSale = customers.find(c =>
                c.installments.some((i: any) => i.id === installment.id)
            );

            const saleInstallments = customerWithSale
                ? customerWithSale.installments.filter((i: any) => i.sale_id === installment.sale_id)
                : [];

            const isSequential = validateSequentialPayment(
                saleInstallments,
                installment.installment_number || 0
            );

            if (!isSequential) {
                toast.warning('Tenés que pagar las cuotas en orden. Hay cuotas anteriores pendientes.');
                return;
            }

            const isoLocal = installment.due_date;
            await window.electronAPI.database.installments.markAsPaid(installment.id!, isoLocal);

            invalidateQuery(['installments']);
            onRefresh?.();

            toast.success('Cuota marcada como pagada');
        } catch (error) {
            console.error('Error marking installment as paid:', error);
            toast.error('Error al marcar la cuota como pagada');
        }
    }, [customers, invalidateQuery, onRefresh]);

    const handleRevertPayment = useCallback(async (installment: Installment) => {
        try {
            const payments = await window.electronAPI.database.payments.getBySale(installment.sale_id);
            const installmentPayments = payments.filter(
                (p: any) => p.installment_id === installment.id && p.status === 'completed'
            );

            if (installmentPayments.length === 0) {
                toast.warning('No se encontraron pagos completados para revertir');
                return;
            }

            const latestPayment = installmentPayments.sort((a: any, b: any) =>
                new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
            )[0];

            await window.electronAPI.database.installments.revertPayment(
                installment.id!,
                latestPayment.id!
            );

            invalidateQuery(['installments']);
            onRefresh?.();

            toast.success('Pago revertido correctamente');
        } catch (error) {
            console.error('Error reverting payment:', error);
            toast.error('Error revirtiendo el último pago');
        }
    }, [invalidateQuery, onRefresh]);

    const handleDeleteCustomer = useCallback((customer: any) => {
        setDeleteCustomer(customer);
    }, [setDeleteCustomer]);

    const handleDeleteSale = useCallback((sale: Sale) => {
        setDeleteSale(sale);
    }, [setDeleteSale]);

    const confirmDeleteCustomer = useCallback(async (customer: any) => {
        if (!customer?.id) return;

        try {
            for (const installment of customer.installments) {
                if (installment.id) {
                    await window.electronAPI.database.installments.delete(installment.id);
                }
            }

            for (const sale of customer.sales) {
                if (sale.id) {
                    await window.electronAPI.database.sales.delete(sale.id);
                }
            }

            await window.electronAPI.database.customers.delete(customer.id);

            invalidateQuery(['installments']);
            onRefresh?.();

            toast.success('Cliente eliminado correctamente');
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error('Error eliminando el cliente');
        } finally {
            setDeleteCustomer(null);
        }
    }, [invalidateQuery, onRefresh, setDeleteCustomer]);

    const confirmDeleteSale = useCallback(async (sale: Sale) => {
        if (!sale?.id) return;

        try {
            const saleId = sale.id;
            const targetCustomer = customers.find(c =>
                c.sales.some((s: any) => s.id === saleId)
            );

            if (targetCustomer) {
                const saleInstalls = targetCustomer.installments.filter(
                    (inst: any) => inst.sale_id === saleId
                );

                for (const inst of saleInstalls) {
                    if (inst.id) {
                        await window.electronAPI.database.installments.delete(inst.id);
                    }
                }
            }

            await window.electronAPI.database.sales.delete(saleId);

            invalidateQuery(['installments']);
            onRefresh?.();

            toast.success('Venta eliminada correctamente');
        } catch (error) {
            console.error('Error deleting sale:', error);
            toast.error('Error eliminando la venta');
        } finally {
            setDeleteSale(null);
        }
    }, [customers, invalidateQuery, onRefresh, setDeleteSale]);

    const openPaymentDialog = useCallback((installment: Installment) => {
        setPaymentInstallment(installment);
        setPaymentDialogOpen(true);
    }, [setPaymentInstallment, setPaymentDialogOpen]);

    const handleSelectDate = useCallback(async (inst: Installment, date?: Date) => {
        try {
            if (!date || isNaN(date.getTime())) {
                toast.error('Fecha inválida. Por favor seleccioná una fecha válida.');
                return;
            }

            const toISODateLocal = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const iso = toISODateLocal(date);
            const payload: Partial<Installment> = {};

            if (inst.status === 'paid') {
                payload.paid_date = iso;
            } else {
                payload.due_date = iso;
            }

            await window.electronAPI.database.installments.update(inst.id!, payload);

            invalidateQuery(['installments']);
            onRefresh?.();

            toast.success('Fecha actualizada correctamente');
        } catch (e) {
            console.error('Error al actualizar la fecha de la cuota', e);
            toast.error('No se pudo actualizar la fecha. Inténtalo nuevamente.');
        }
    }, [invalidateQuery, onRefresh]);

    return {
        handleMarkAsPaid,
        handleRevertPayment,
        handleDeleteCustomer,
        handleDeleteSale,
        confirmDeleteCustomer,
        confirmDeleteSale,
        openPaymentDialog,
        handleSelectDate,
    };
}