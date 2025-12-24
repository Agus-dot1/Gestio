import type { NotificationItem } from '../types';

export const DEFAULT_CVU = '747382997471';

export function formatAmountDesign(a?: number) {
    if (typeof a !== 'number') return '';
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(a);
}

export function formatRelative(iso: string) {
    const normalizeTs = (s: string): number => {
        try {
            if (s && s.includes(' ') && !s.includes('T')) {
                const candidate = s.replace(' ', 'T') + 'Z';
                const t = new Date(candidate).getTime();
                if (!Number.isNaN(t)) return t;
            }
            const t2 = new Date(s).getTime();
            return Number.isNaN(t2) ? Date.now() : t2;
        } catch {
            return Date.now();
        }
    };
    const d = normalizeTs(iso);
    const diff = Math.max(0, Date.now() - d);
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'hace unos segundos';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const days = Math.floor(h / 24);
    return `hace ${days} d`;
}

export function buildWhatsAppMessage(m: NotificationItem['meta'] = {}): string {
    const amountStr = typeof m.amount === 'number' ? formatAmountDesign(m.amount) : '';
    const interest = (m as any)?.interest;
    const interestStr = typeof interest === 'number' ? formatAmountDesign(interest) : '';
    const totalStr = typeof interest === 'number' && typeof m.amount === 'number'
        ? formatAmountDesign(m.amount + interest)
        : '';

    const hasDue = !!m.due_at;
    let dueLine = '';
    if (hasDue) {
        const dueMs = new Date(m.due_at!).getTime();
        const nowMs = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;
        const days = Math.max(0, Math.floor(Math.abs(dueMs - nowMs) / dayMs));
        const dueDateStr = new Date(m.due_at!).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        dueLine = (dueMs < nowMs)
            ? `La cuota venció el ${dueDateStr} (hace ${days} días).`
            : `La cuota vence el ${dueDateStr} (en ${days} días).`;
    }

    const greeting = m.customerName ? `Hola ${m.customerName}, que tal?` : 'Hola, que tal?';
    const lines = [
        `${greeting}`,
        'Te escribo para informarte sobre tu cuota.',
        hasDue ? dueLine : undefined,
        'Detalle:',
        `• Importe de la cuota: ${amountStr || 'consultar'}`,
        typeof interest === 'number' ? `• Interés aplicado: ${interestStr}` : '• Interés: según condiciones del acuerdo',
        typeof interest === 'number' ? `• Total a pagar: ${totalStr}` : undefined,
        `CVU para depósito: ${DEFAULT_CVU}`,
        'Por favor, enviá el comprobante por este chat para acreditar el pago.',
        'Gracias.',
    ].filter(Boolean).join('\n');
    return lines;
}

export function formatTitle(message: string, meta?: NotificationItem['meta']) {
    const key = meta?.message_key ?? '';
    if (key.startsWith('overdue|')) return 'Cuota vencida';
    if (key.startsWith('upcoming|')) return 'Cuota próxima a vencer';
    if (meta?.category === 'stock') {
        if (meta?.productName) return `Producto ${meta.productName}`;
        const firstPart = message?.split(' — ')[0] ?? '';
        const name = firstPart.replace(/^Stock bajo:\s*/i, '').trim();
        return name ? `Producto ${name}` : 'Stock';
    }
    if (meta?.category === 'system') return 'Sistema';
    const simplified = message?.split(' — ')[0] ?? message;
    return simplified || message;
}

export function formatExpirationLine(m: NotificationItem['meta'] = {}) {
    if (m.category === 'system' && typeof m.duration_ms === 'number') {
        const ms = m.duration_ms;
        const pretty = ms < 1 ? `${(ms * 1000).toFixed(1)}µs` : ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
        return `tiempo: ${pretty}`;
    }

    if (m.due_at) {
        const now = Date.now();
        const due = new Date(m.due_at).getTime();
        const diff = due - now;
        const dayMs = 24 * 60 * 60 * 1000;
        const absDays = Math.max(0, Math.floor(Math.abs(diff) / dayMs));
        if (Math.abs(diff) < dayMs && diff < 0) return 'Venció hoy';
        if (Math.abs(diff) < dayMs && diff >= 0) return 'Vence hoy';
        if (diff >= 0) return `Vencimiento en ${absDays} días`;
        return `Venció hace ${absDays} días`;
    }
    return undefined;
}
