import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LucideCalendar } from 'lucide-react';
import dynamic from 'next/dynamic';
import { es } from 'date-fns/locale';
import { formatDate } from '@/lib/installments/installment-helpers';
import { useInstallmentUIStore } from '@/context/stores/installment-ui-store';
import type { Installment } from '@/lib/database-operations';

const Calendar = dynamic(() => import('@/components/ui/calendar').then(m => m.Calendar), {
    ssr: false,
});

interface DatePickerPopoverProps {
    installment: Installment;
    onSelectDate: (inst: Installment, date?: Date) => void;
}

export function DatePickerPopover({ installment, onSelectDate }: DatePickerPopoverProps) {
    const openDatePickerId = useInstallmentUIStore(state => state.openDatePickerId);
    const setOpenDatePickerId = useInstallmentUIStore(state => state.setOpenDatePickerId);

    const displayDate = (installment.status === 'paid' && installment.paid_date)
        ? installment.paid_date
        : installment.due_date;

    const isOverdue = new Date(installment.due_date) < new Date() && installment.status !== 'paid';

    return (
        <Popover
            open={openDatePickerId === installment.id}
            onOpenChange={(open) => setOpenDatePickerId(open ? installment.id! : null)}
        >
            <PopoverTrigger asChild>
                <button
                    className="flex items-center gap-2 px-2 py-1 -ml-2 rounded-md hover:bg-muted-foreground/10 transition-all duration-200 group-hover:ring-1 group-hover:ring-primary/20 w-fit"
                    title="Clic para cambiar la fecha"
                >
                    <LucideCalendar className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                    <span className={`truncate max-w-[140px] font-medium border-b border-transparent group-hover:border-primary/30 ${isOverdue ? 'text-red-500' : ''}`}>
                        {formatDate(displayDate)}
                    </span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b bg-muted/30">
                    <div className="text-xs font-semibold">
                        Editar {installment.status === 'paid' ? 'fecha de pago' : 'vencimiento'}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        La fecha se actualizará inmediatamente
                    </div>
                </div>
                <Calendar
                    mode="single"
                    selected={new Date(displayDate + 'T12:00:00')}
                    onSelect={(date) => onSelectDate(installment, date)}
                    initialFocus
                    locale={es}
                />
            </PopoverContent>
        </Popover>
    );
}