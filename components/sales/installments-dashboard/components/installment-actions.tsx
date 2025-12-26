import { Button } from '@/components/ui/button';
import { CheckCircle, X } from 'lucide-react';
import type { Installment } from '@/lib/database-operations';

interface InstallmentActionsProps {
    installment: Installment;
    onMarkAsPaid: (installment: Installment) => void;
    onRevertPayment: (installment: Installment) => void;
    onOpenPaymentDialog: (installment: Installment) => void;
}

export function InstallmentActions({
    installment,
    onMarkAsPaid,
    onRevertPayment,
    onOpenPaymentDialog,
}: InstallmentActionsProps) {
    if (installment.status === 'paid') {
        return (
            <Button
                size="sm"
                variant="outline"
                onClick={() => onRevertPayment(installment)}
                className="h-7 px-2 text-xs text-white/80 hover:text-white border-white hover:border-white"
            >
                <X className="h-3 w-3 mr-1" />
                Revertir
            </Button>
        );
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onOpenPaymentDialog(installment)}
                    className="h-7 px-2 text-xs"
                >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Registrar Pago
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMarkAsPaid(installment)}
                    className="h-7 px-2 text-xs"
                >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Marcar Pagada
                </Button>
            </div>
        </>
    );
}