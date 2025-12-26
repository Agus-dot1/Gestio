"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openWhatsApp = exports.buildWhatsAppMessageForContact = exports.buildWhatsAppMessageForCustomer = exports.inferPeriodType = exports.formatDate = exports.toISODateLocal = void 0;
const date_fns_1 = require("date-fns");
const locale_1 = require("date-fns/locale");
const toISODateLocal = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
exports.toISODateLocal = toISODateLocal;
const formatDate = (dateString) => {
    if (!dateString)
        return '-';
    try {
        const [y, m, d] = dateString.split('-').map(Number);
        if (y && m && d) {
            return (0, date_fns_1.format)(new Date(y, m - 1, d), 'dd MMM yyyy', { locale: locale_1.es });
        }
        return (0, date_fns_1.format)((0, date_fns_1.parseISO)(dateString), 'dd MMM yyyy', { locale: locale_1.es });
    }
    catch (e) {
        return dateString;
    }
};
exports.formatDate = formatDate;
const inferPeriodType = (installments) => {
    if (!installments || installments.length === 0)
        return 'monthly';
    const uniqueDays = new Set(installments.map(i => new Date(i.due_date).getDate()));
    const isOneAndFifteenOnly = Array.from(uniqueDays).every(d => d === 1 || d === 15);
    if (isOneAndFifteenOnly)
        return 'biweekly';
    const sorted = [...installments].sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    const deltas = sorted.slice(1).map((i, idx) => (new Date(i.due_date).getTime() - new Date(sorted[idx].due_date).getTime()) / (1000 * 60 * 60 * 24));
    const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 30;
    return avgDelta <= 10 ? 'weekly' : 'monthly';
};
exports.inferPeriodType = inferPeriodType;
const buildWhatsAppMessageForCustomer = (customer) => {
    const normalize = (s) => String(s || '').trim();
    const next = [...(customer.installments || [])]
        .filter((inst) => inst.status !== 'paid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    const formatAmt = (n) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(n);
    const amountStr = next
        ? formatAmt(typeof next.balance === 'number' ? next.balance : next.amount)
        : formatAmt(customer.totalOwed || 0);
    let dueLine;
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
exports.buildWhatsAppMessageForCustomer = buildWhatsAppMessageForCustomer;
const buildWhatsAppMessageForContact = (customer) => {
    const normalize = (s) => String(s || '').trim();
    const next = [...(customer.installments || [])]
        .filter((inst) => inst.status !== 'paid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
    const formatAmt = (n) => new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(n);
    const amountStr = next
        ? formatAmt(typeof next.balance === 'number' ? next.balance : next.amount)
        : formatAmt(customer.totalOwed || 0);
    let dueLine;
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
exports.buildWhatsAppMessageForContact = buildWhatsAppMessageForContact;
const openWhatsApp = async (customer, num, useAlternate) => {
    const digits = (num || '').replace(/\D/g, '');
    if (!digits)
        return;
    const body = useAlternate
        ? (0, exports.buildWhatsAppMessageForContact)(customer)
        : (0, exports.buildWhatsAppMessageForCustomer)(customer);
    const text = encodeURIComponent(body);
    const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${text}`;
    // Force web interface instead of generic wa.me which might try to open app again
    const webUrl = `https://web.whatsapp.com/send?phone=+54${digits}&text=${text}`;
    if (window?.electronAPI?.openExternal) {
        try {
            // Try to open with default handler (likely desktop app if installed)
            await window.electronAPI.openExternal(nativeUrl);
        }
        catch (error) {
            console.warn('Failed to open native WhatsApp, falling back to Web:', error);
            // Fallback to web
            try {
                await window.electronAPI.openExternal(webUrl);
            }
            catch (webError) {
                console.error('Failed to open WhatsApp Web:', webError);
            }
        }
    }
    else {
        // Not in electron or API missing
        window.open(webUrl, '_blank');
    }
};
exports.openWhatsApp = openWhatsApp;
//# sourceMappingURL=installment-helpers.js.map