import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { InstallmentRow } from './installment-row';
import type { Installment, Sale } from '@/lib/database-operations';

interface InstallmentTableProps {
    installments: Installment[];
    sale: Sale;
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
    onSelectDate: (inst: Installment, date?: Date) => void;
}

export function InstallmentTable({
    installments,
    sale,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
    onSelectDate,
}: InstallmentTableProps) {
    if (installments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground p-2">
                Sin cuotas para esta venta.
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Cuota</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Pagado</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {installments.map((installment) => (
                    <InstallmentRow
                        key={installment.id}
                        installment={installment}
                        sale={sale}
                        saleInstallments={installments}
                        onMarkAsPaid={onMarkAsPaid}
                        onRevertPayment={onRevertPayment}
                        onOpenPaymentDialog={onOpenPaymentDialog}
                        onSelectDate={onSelectDate}
                    />
                ))}
            </TableBody>
        </Table>
    );
}