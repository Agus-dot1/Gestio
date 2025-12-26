import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, ChevronsDownUp } from 'lucide-react';
import { useInstallmentUIStore, selectFilters, selectExpansion } from '@/context/stores/installment-ui-store';
import { useShallow } from 'zustand/react/shallow';

export function InstallmentFilters() {
    const {
        searchTerm,
        statusFilter,
        sortBy,
        periodFilter,
        setSearchTerm,
        setStatusFilter,
        setSortBy,
        setPeriodFilter,
    } = useInstallmentUIStore(useShallow(selectFilters));

    const { collapseAll } = useInstallmentUIStore(useShallow(selectExpansion));

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar clientes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 w-44 xl:w-64 rounded-xl"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-52 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pending">Pendientes</SelectItem>
                        <SelectItem value="overdue">Vencidas</SelectItem>
                        <SelectItem value="paid">Pagadas</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="customer">Cliente</SelectItem>
                        <SelectItem value="amount">Monto</SelectItem>
                        <SelectItem value="dueDate">Próximo vencimiento</SelectItem>
                        <SelectItem value="status">Estado</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                    <SelectTrigger className="w-44 rounded-xl">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los periodos</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="biweekly">Quincenal (1 y 15)</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
                className="gap-2 rounded-xl"
            >
                <ChevronsDownUp className="h-4 w-4" />
                Colapsar todo
            </Button>
        </div>
    );
}