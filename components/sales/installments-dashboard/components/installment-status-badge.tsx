import { Badge } from '@/components/ui/badge';
import type { Installment } from '@/lib/database-operations';

interface InstallmentStatusBadgeProps {
    installment: Installment;
}

export function InstallmentStatusBadge({ installment }: InstallmentStatusBadgeProps) {
    const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';

    if (installment.status === 'paid') {
        return (
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                Pagada
            </Badge>
        );
    } else if (isOverdue || installment.status === 'overdue') {
        return (
            <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">
                Vencida
            </Badge>
        );
    } else {
        return (
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">
                Pendiente
            </Badge>
        );
    }
}