import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/config/locale';
import { CustomerStatusIndicator } from '../installment-status-indicator';
import { WhatsAppButton } from '@/components/whatsapp-button';
import { SaleCard } from './installment-sale-card';
import { selectExpansion, useInstallmentUIStore } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';
import type { Installment, Sale } from '@/lib/database-operations';

export interface CustomerWithInstallments {
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

export interface CustomerCardProps {
    customer: CustomerWithInstallments;
    onDeleteCustomer: (customer: CustomerWithInstallments) => void;
    onDeleteSale: (sale: Sale) => void;
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
    onSelectDate: (inst: Installment, date?: Date) => void;
    onClick?: (e: React.MouseEvent) => void;
}

export function CustomerCard({
    customer,
    onDeleteCustomer,
    onDeleteSale,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
    onSelectDate,
    onClick
}: CustomerCardProps) {
    const { expandedCustomers, toggleCustomer } = useInstallmentUIStore(useShallow(selectExpansion));
    const stickyHighlight = useInstallmentUIStore(state => state.stickyHighlight);

    const isExpanded = expandedCustomers.has(customer.id!);
    const isHighlighted = stickyHighlight === customer.id?.toString();

    return (
        <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleCustomer(customer.id!)}
        >
            <Card
                id={`customer-${customer.id}`}
                className={cn(
                    "transition-all duration-300",
                    customer.overdueAmount > 0 && "border-l-4 border-l-red-800",
                    isHighlighted && "ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg z-10"
                )}
            >
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                    <CustomerStatusIndicator customers={customer} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        {customer.name}
                                        {customer.overdueAmount > 0 && (
                                            <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 text-xs">
                                                {customer.installments.filter((i) => {
                                                    const isOverdue = new Date(i.due_date) < new Date() && i.status !== 'paid';
                                                    return isOverdue || i.status === 'overdue';
                                                }).length}{' '}
                                                vencidas
                                            </Badge>
                                        )}
                                        <WhatsAppButton customer={customer} onClick={onClick} />

                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                        {/* Additional info if needed */}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 text-right">
                                <div>
                                    <div className="text-sm font-medium">Total Adeudado</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">{formatCurrency(customer.totalOwed)}</div>
                                    </div>
                                </div>

                                <div className="text-sm text-muted-foreground">
                                    {customer.installments.length} cuotas
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteCustomer(customer);
                                    }}
                                    className="h-12 w-12 p-0 text-red-600 hover:text-red-700"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="pt-0">
                        <div className="border-t pt-4">
                            {customer.sales.map((sale) => {
                                const saleInstallments = customer.installments
                                    .filter((inst) => inst.sale_id === sale.id)
                                    .sort(
                                        (a, b) =>
                                            (a.original_installment_number ?? a.installment_number) -
                                            (b.original_installment_number ?? b.installment_number)
                                    );

                                return (
                                    <SaleCard
                                        key={sale.id}
                                        customer={customer}
                                        sale={sale}
                                        installments={saleInstallments}
                                        onDeleteSale={onDeleteSale}
                                        onMarkAsPaid={onMarkAsPaid}
                                        onRevertPayment={onRevertPayment}
                                        onOpenPaymentDialog={onOpenPaymentDialog}
                                        onSelectDate={onSelectDate}
                                    />
                                );
                            })}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}                  