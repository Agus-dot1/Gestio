import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/config/locale';
import { InstallmentStatusBadge } from '../installment-status-badge';
import { DatePickerPopover } from '@/components/date-picker-popover';
import { InstallmentActions } from '../installment-actions';
import { useInstallmentUIStore } from '@/context/stores/installment-ui-store';
import { inferPeriodType } from '@/lib/installments/installment-helpers';
import type { Installment, Sale } from '@/lib/database-operations';

interface InstallmentRowProps {
    installment: Installment;
    sale: Sale;
    saleInstallments: Installment[];
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
    onSelectDate: (inst: Installment, date?: Date) => void;
}

export function InstallmentRow({
    installment,
    sale,
    saleInstallments,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
    onSelectDate,
}: InstallmentRowProps) {
    const stickyHighlight = useInstallmentUIStore(state => state.stickyHighlight);

    const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';
    const isHighlighted = stickyHighlight === `i-${installment.id}`;

    const salePeriod = sale.period_type ?? inferPeriodType(saleInstallments);
    const periodLabel = salePeriod === 'monthly'
        ? 'Mensual'
        : salePeriod === 'biweekly'
            ? 'Quincenal'
            : 'Semanal';

    return (
        <TableRow
            id={`installment-${installment.id}`}
            className={cn(
                "transition-colors relative",
                isOverdue && "bg-red-950",
                installment.status === 'paid' && "bg-white/5",
                isHighlighted && "bg-primary/5 hover:bg-primary/10"
            )}
            aria-current={isHighlighted ? "true" : undefined}
        >
            <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                    #{installment.installment_number}
                    {installment.notes === 'Pago adelantado' && (
                        <Badge variant="outline" className="text-xs text-white">
                            Adelantado
                        </Badge>
                    )}
                </div>
            </TableCell>

            <TableCell className="group">
                <DatePickerPopover
                    installment={installment}
                    onSelectDate={onSelectDate}
                />
            </TableCell>

            <TableCell>
                <div className="text-sm text-muted-foreground">
                    {periodLabel}
                </div>
            </TableCell>

            <TableCell className="text-foreground font-medium">
                {formatCurrency(installment.amount)}
            </TableCell>

            <TableCell className="text-foreground/90">
                {formatCurrency(installment.paid_amount)}
            </TableCell>

            <TableCell>
                <span className={cn(
                    "font-medium",
                    installment.balance > 0 ? "text-red-600" : "text-green-600"
                )}>
                    {formatCurrency(installment.balance)}
                </span>
            </TableCell>

            <TableCell>
                <InstallmentStatusBadge installment={installment} />
            </TableCell>

            <TableCell>
                <InstallmentActions
                    installment={installment}
                    onMarkAsPaid={onMarkAsPaid}
                    onRevertPayment={onRevertPayment}
                    onOpenPaymentDialog={onOpenPaymentDialog}
                />
            </TableCell>
        </TableRow>
    );
}