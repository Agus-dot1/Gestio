import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '@/config/locale';

interface InstallmentStatsProps {
    totalCustomers: number;
    totalOwed: number;
    overdueInstallments: number;
    overdueAmount: number;
    pendingInstallments: number;
}

export function InstallmentStats({
    totalCustomers,
    totalOwed,
    overdueInstallments,
    overdueAmount,
    pendingInstallments,
}: InstallmentStatsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Clientes con Cuotas</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{totalCustomers}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <User className="h-3 w-3 mr-1 text-blue-500" />
                        Clientes con planes de pago activos
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Total Adeudado</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalOwed)}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <DollarSign className="h-3 w-3 mr-1 text-green-500" />
                        Monto total pendiente de cobro
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Cuotas Vencidas</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{overdueInstallments}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />
                        {formatCurrency(overdueAmount)} vencido
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Cuotas Pendientes</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pendingInstallments}</div>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1 text-blue-500" />
                        Cuotas por vencer próximamente
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}