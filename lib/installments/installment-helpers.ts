import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Installment } from '../database-operations';

export const toISODateLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
        const [y, m, d] = dateString.split('-').map(Number);
        if (y && m && d) {
            return format(new Date(y, m - 1, d), 'dd MMM yyyy', { locale: es });
        }
        return format(parseISO(dateString), 'dd MMM yyyy', { locale: es });
    } catch (e) {
        return dateString;
    }
};

export const inferPeriodType = (installments: Installment[]): 'monthly' | 'weekly' | 'biweekly' => {
    if (!installments || installments.length === 0) return 'monthly';
    const uniqueDays = new Set(installments.map(i => new Date(i.due_date).getDate()));
    const isOneAndFifteenOnly = Array.from(uniqueDays).every(d => d === 1 || d === 15);
    if (isOneAndFifteenOnly) return 'biweekly';
    const sorted = [...installments].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const deltas = sorted.slice(1).map((i, idx) => (new Date(i.due_date).getTime() - new Date(sorted[idx].due_date).getTime()) / (1000 * 60 * 60 * 24));
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 30;
    return avgDelta <= 10 ? 'weekly' : 'monthly';
};

export const buildWhatsAppMessageForCustomer = (customer: any): string => {
    const normalize = (s: string) => String(s || '').trim();
    const next = [...(customer.installments || [])]
        .filter((inst: any) => inst.status !== 'paid')
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    const formatAmt = (n: number) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(n);

    const amountStr = next
        ? formatAmt(typeof next.balance === 'number' ? next.balance : next.amount)
        : formatAmt(customer.totalOwed || 0);

    let dueLine: string | undefined;
    if (next?.due_date) {
        const dueMs = new Date(next.due_date).getTime();
        const nowMs = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(0, Math.floor(Math.abs(dueMs - nowMs) / dayMs));
        const dueDateStr = new Date(next.due_date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit'
        });
        dueLine = (dueMs < nowMs)
            ? `La cuota venció el ${dueDateStr} (hace ${days} días).`
            : `La cuota vence el ${dueDateStr} (en ${days} días).`;
    }

    const greeting = customer.name ? `Hola ${normalize(customer.name)}, que tal?` : 'Hola, que tal?';
    const lines = [
        `${greeting}`,
        'Te escribo para enviarte el comprobante.',
        dueLine,
        'Detalle:',
        `*Importe de la cuota: ${amountStr}*`,
        '',
        'Te adjunto la factura con las cuotas actualizadas.',
        'Quedo a la espera del comprobante de transferencia. ¡Gracias!',
    ].filter(Boolean).join('\n');

    return lines;
};

export const buildWhatsAppMessageForContact = (customer: any): string => {
    const normalize = (s: string) => String(s || '').trim();
    const next = [...(customer.installments || [])]
        .filter((inst: any) => inst.status !== 'paid')
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    const formatAmt = (n: number) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(n);

    const amountStr = next
        ? formatAmt(typeof next.balance === 'number' ? next.balance : next.amount)
        : formatAmt(customer.totalOwed || 0);

    let dueLine: string | undefined;
    if (next?.due_date) {
        const dueMs = new Date(next.due_date).getTime();
        const nowMs = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(0, Math.floor(Math.abs(dueMs - nowMs) / dayMs));
        const dueDateStr = new Date(next.due_date).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit'
        });
        dueLine = (dueMs < nowMs)
            ? `La cuota venció el ${dueDateStr} (hace ${days} días).`
            : `La cuota vence el ${dueDateStr} (en ${days} días).`;
    }

    const customerName = customer.name ? normalize(customer.name) : 'el cliente';
    const lines = [
        `Hola, ¿qué tal? Te escribo por parte de ${customerName}.`,
        'Le estoy enviando su comprobante de cuota.',
        dueLine,
        'Detalle:',
        `*Importe de la cuota: ${amountStr}*`,
        '',
        'Le adjunto la factura con las cuotas actualizadas. ¡Muchas gracias!',
    ].filter(Boolean).join('\n');

    return lines;
};

export const openWhatsApp = async (
    customer: any,
    num: string,
    useAlternate?: boolean
) => {
    const digits = (num || '').replace(/\D/g, '');
    if (!digits) return;

    const body = useAlternate
        ? buildWhatsAppMessageForContact(customer)
        : buildWhatsAppMessageForCustomer(customer);

    const text = encodeURIComponent(body);
    const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${text}`;
    // Force web interface instead of generic wa.me which might try to open app again
    const webUrl = `https://web.whatsapp.com/send?phone=+54${digits}&text=${text}`;

    if ((window as any)?.electronAPI?.openExternal) {
        try {
            // Try to open with default handler (likely desktop app if installed)
            await (window as any).electronAPI.openExternal(nativeUrl);
        } catch (error) {
            console.warn('Failed to open native WhatsApp, falling back to Web:', error);
            // Fallback to web
            try {
                await (window as any).electronAPI.openExternal(webUrl);
            } catch (webError) {
                console.error('Failed to open WhatsApp Web:', webError);
            }
        }
    } else {
        // Not in electron or API missing
        window.open(webUrl, '_blank');
    }
};
