import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Package, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, inferPeriodType } from '@/lib/installments/installment-helpers';
import { InstallmentTable } from './installment-table';
import { useInstallmentUIStore, selectExpansion, selectHighlight } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';
import type { Sale, Installment } from '@/lib/database-operations';
import { CustomerWithInstallments } from './installment-customer-card';

interface SaleCardProps {
    customer: CustomerWithInstallments;
    sale: Sale;
    installments: Installment[];
    onDeleteSale: (sale: Sale) => void;
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
    onSelectDate: (inst: Installment, date?: Date) => void;
}


export function SaleCard({
    sale,
    installments,
    onDeleteSale,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
    onSelectDate,
}: SaleCardProps) {
    const { expandedSales, toggleSale } = useInstallmentUIStore(useShallow(selectExpansion));
    const { stickyHighlight } = useInstallmentUIStore(useShallow(selectHighlight));

    const isExpanded = expandedSales.has(sale.id!);
    const isHighlighted = stickyHighlight === `s-${sale.id}`;
    const isOverdue = installments.some(installment => new Date(installment.due_date) < new Date() && installment.status !== 'paid');


    const items = sale.items ?? [];
    const idLabel = sale.reference_code ? `Ref: ${sale.reference_code}` : `Venta #${sale.sale_number}`;
    const firstProduct = items[0];
    const hasMultipleItems = items.length > 1;
    const salePeriod = sale.period_type ?? inferPeriodType(installments);
    const periodLabel = salePeriod === 'monthly'
        ? 'Mensual'
        : salePeriod === 'biweekly'
            ? 'Quincenal'
            : 'Semanal';

    return (
        <Collapsible
            open={isExpanded}
            onOpenChange={() => toggleSale(sale.id!)}
        >
            <Card
                id={`sale-${sale.id}`}
                className={cn(
                    "mb-3 bg-muted/20 transition-all duration-300",
                    isHighlighted && "ring-2 ring-primary/50 shadow-lg z-10 bg-muted/50",
                    isOverdue && "ring-2 ring-destructive/50 shadow-lg z-10 bg-muted/50"
                )}
            >
                <CollapsibleTrigger asChild>
                    <div className="cursor-pointer p-3 hover:bg-muted/50 rounded-md flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                            ) : (
                                <ChevronRight className="h-4 w-4" />
                            )}

                            {items.length === 0 ? (
                                <span className="font-medium">{idLabel}</span>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                        <Package className="w-3 h-3 text-primary" />
                                    </div>
                                    <span className="font-medium">
                                        {firstProduct.product_name}
                                    </span>
                                    {hasMultipleItems && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    onClick={(e) => e.stopPropagation()}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-6 px-2 text-xs z-10"
                                                >
                                                    +{items.length - 1} más
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" align="start">
                                                <div className="space-y-2">
                                                    <h4 className="font-medium text-sm">Productos en esta venta:</h4>
                                                    <div className="space-y-1 max-h-48 overflow-y-auto">
                                                        {items.map((item, index) => (
                                                            <div
                                                                key={index}
                                                                className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <Package className="w-3 h-3 text-muted-foreground" />
                                                                    <span>{item.product_name}</span>
                                                                </div>
                                                                <div className="text-muted-foreground">x{item.quantity}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                    <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                        {periodLabel}
                                    </Badge>
                                </div>
                            )}

                            {installments.length > 0 && (
                                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                                    {installments.length} cuotas
                                </Badge>
                            )}
                            {sale.payment_status === 'overdue' && (
                                <Badge variant="destructive" className="text-xs">
                                    Pago Vencido
                                </Badge>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="text-sm text-muted-foreground">
                                {sale.date ? formatDate(sale.date) : ''}
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSale(sale);
                                }}
                                title="Eliminar venta"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar venta</span>
                            </Button>
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="pt-2">
                        <InstallmentTable
                            installments={installments}
                            sale={sale}
                            onMarkAsPaid={onMarkAsPaid}
                            onRevertPayment={onRevertPayment}
                            onOpenPaymentDialog={onOpenPaymentDialog}
                            onSelectDate={onSelectDate}
                        />
                    </div>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}