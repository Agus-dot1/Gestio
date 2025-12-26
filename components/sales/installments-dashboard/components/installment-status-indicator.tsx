interface CustomerStatusIndicatorProps {
    customers: any;
}

export function CustomerStatusIndicator({ customers }: CustomerStatusIndicatorProps) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Check for overdue installments
    const hasOverdue = customers.installments.some((inst: any) =>
        new Date(inst.due_date) < today && inst.status !== 'paid'
    );

    if (hasOverdue) {
        return <div className="w-3 h-3 bg-red-500 rounded-full" title="Tiene pagos vencidos" />;
    }

    // Check current month installments
    const currentMonthInstallments = customers.installments.filter((inst: any) => {
        const d = new Date(inst.due_date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });

    if (currentMonthInstallments.length > 0) {
        const anyUnpaidThisMonth = currentMonthInstallments.some((inst: any) => inst.status !== 'paid');
        if (anyUnpaidThisMonth) {
            return <div className="w-3 h-3 bg-yellow-500 rounded-full" title="Cuota del mes pendiente" />;
        } else {
            return <div className="w-3 h-3 bg-green-500 rounded-full" title="Cuota del mes paga" />;
        }
    }

    // All paid
    const allPaid = customers.installments.length > 0 &&
        customers.installments.every((inst: any) => inst.status === 'paid');

    if (allPaid) {
        return <div className="w-3 h-3 bg-green-500 rounded-full" title="Plan de cuotas completado" />;
    }

    return <div className="w-3 h-3 bg-green-500 rounded-full" title="Sin cuota este mes" />;
}