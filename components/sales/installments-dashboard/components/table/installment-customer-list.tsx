import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { User } from 'lucide-react';
import { CustomerCard } from './installment-customer-card';
import { useInstallmentUIStore } from '@/context/stores/installment-ui-store';
import type { Installment, Sale } from '@/lib/database-operations';
import { selectFilters } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';

interface CustomerWithInstallments {
    id?: number;
    name: string;
    phone?: string;
    secondary_phone?: string;
    sales: Sale[];
    installments: Installment[];
    totalOwed: number;
    overdueAmount: number;
    nextPaymentDate: string | null;
}

interface CustomerListProps {
    customers: CustomerWithInstallments[];
    isLoading: boolean;
    onDeleteCustomer: (customer: CustomerWithInstallments) => void;
    onDeleteSale: (sale: Sale) => void;
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
    onSelectDate: (inst: Installment, date?: Date) => void;
}

export function CustomerList({
    customers,
    isLoading,
    onDeleteCustomer,
    onDeleteSale,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
    onSelectDate,
}: CustomerListProps) {
    const {
        debouncedSearch,
        statusFilter,
        sortBy,
        sortOrder,
        periodFilter,
    } = useInstallmentUIStore(useShallow(selectFilters));

    const filteredAndSortedCustomers = useMemo(() => {
        let filtered = customers.filter((customer) => {
            const matchesSearch =
                customer.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                customer.phone?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                customer.secondary_phone?.toLowerCase().includes(debouncedSearch.toLowerCase());

            if (!matchesSearch) return false;

            if (
                customer.installments.length > 0 &&
                customer.installments.every((i) => i.status === 'paid')
            ) {
                return false;
            }

            if (periodFilter !== 'all') {
                const hasPeriod = customer.sales.some(
                    (s) => s.payment_type === 'installments' && s.period_type === periodFilter
                );
                if (!hasPeriod) return false;
            }

            if (statusFilter === 'all') return true;

            const hasMatchingInstallments = customer.installments.some((installment) => {
                const isOverdue =
                    new Date(installment.due_date) < new Date() && installment.status !== 'paid';

                switch (statusFilter) {
                    case 'pending':
                        return installment.status === 'pending';
                    case 'paid':
                        return installment.status === 'paid';
                    case 'overdue':
                        return isOverdue || installment.status === 'overdue';
                    default:
                        return true;
                }
            });

            return hasMatchingInstallments;
        });

        filtered.sort((a, b) => {
            let aValue: any, bValue: any;

            switch (sortBy) {
                case 'customer':
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
                    break;
                case 'amount':
                    aValue = a.totalOwed;
                    bValue = b.totalOwed;
                    break;
                case 'dueDate':
                    aValue = a.nextPaymentDate ? new Date(a.nextPaymentDate) : new Date('9999-12-31');
                    bValue = b.nextPaymentDate ? new Date(b.nextPaymentDate) : new Date('9999-12-31');
                    break;
                case 'status':
                    aValue = a.overdueAmount > 0 ? 0 : 1;
                    bValue = b.overdueAmount > 0 ? 0 : 1;
                    break;
                default:
                    aValue = a.name.toLowerCase();
                    bValue = b.name.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return filtered;
    }, [customers, debouncedSearch, statusFilter, sortBy, sortOrder, periodFilter]);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-8 h-8 rounded-full" />
                                <div>
                                    <Skeleton className="h-5 w-32 mb-1" />
                                    <Skeleton className="h-4 w-24" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (filteredAndSortedCustomers.length === 0) {
        return (
            <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron clientes</h3>
                <p className="text-muted-foreground">
                    {debouncedSearch
                        ? 'No hay clientes que coincidan con la búsqueda.'
                        : 'No hay clientes con planes de cuotas activos.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {filteredAndSortedCustomers.map((customer) => (
                <CustomerCard
                    key={customer.id}
                    customer={customer}
                    onDeleteCustomer={onDeleteCustomer}
                    onDeleteSale={onDeleteSale}
                    onMarkAsPaid={onMarkAsPaid}
                    onRevertPayment={onRevertPayment}
                    onOpenPaymentDialog={onOpenPaymentDialog}
                    onSelectDate={onSelectDate}
                />
            ))}
        </div>
    );
}