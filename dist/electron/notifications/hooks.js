"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInstallmentForOverdueSingle = exports.checkLowStockAfterSaleHook = exports.setupClientNotificationScheduler = void 0;
const constants_1 = require("./constants");
const repository_1 = require("./repository");
const database_operations_1 = require("../lib/database-operations");
function setupClientNotificationScheduler(getWindow, interval) {
    const intervalMs = typeof interval === 'number' && interval > 0 ? interval : 5 * 60000;
    let lastWeeklyPrecheckKeyEmitted = null;
    const formatCurrency = (value) => {
        try {
            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
        }
        catch {
            return `$ ${value}`;
        }
    };
    function cleanupOrphans() {
        try {
            repository_1.notificationOperations.dedupeActiveByMessageKey();
        }
        catch { }
    }
    function emitBatchOrSingle(payloads) {
        const win = getWindow();
        if (!win || payloads.length === 0)
            return;
        const batchThreshold = parseInt(process.env.NOTIFICATIONS_BATCH_THRESHOLD || '10', 10);
        if (payloads.length >= batchThreshold) {
            win.webContents.send(constants_1.IPC_NOTIFICATIONS.eventBatch, payloads);
        }
        else {
            for (const p of payloads) {
                win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, p);
            }
        }
    }
    function tick() {
        try {
            cleanupOrphans();
            const suppressIfMuted = (process.env.NOTIFICATIONS_SUPPRESS_WHEN_MUTED ?? 'true') !== 'false';
            const isMuted = !getWindow();
            const overdue = database_operations_1.installmentOperations.getOverdue() || [];
            if (overdue.length > 0) {
                const payloads = [];
                for (const inst of overdue) {
                    try {
                        if (!inst?.id || !inst.customer_name || !inst.balance || inst.balance <= 0)
                            continue;
                        const customer = inst.customer_name;
                        const msg = `Hay una cuota vencida — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — ${formatCurrency(inst.balance)}`;
                        const key = `overdue|${inst.id}`;
                        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                        const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                        if (!existsActive && !existsToday) {
                            if (!(suppressIfMuted && isMuted)) {
                                const nid = repository_1.notificationOperations.create(msg, 'alert', key);
                                const latest = repository_1.notificationOperations.getLatestByKey(key);
                                const createdAt = latest?.created_at;
                                payloads.push({ id: nid, message: msg, type: 'alert', meta: { message_key: key, customerName: customer, due_at: inst.due_date ? new Date(inst.due_date).toISOString() : new Date().toISOString(), amount: inst.balance, ...(createdAt ? { created_at: createdAt } : {}) } });
                            }
                        }
                    }
                    catch { }
                }
                emitBatchOrSingle(payloads);
            }
            const upcoming = database_operations_1.installmentOperations.getUpcoming() || [];
            if (upcoming.length > 0) {
                const payloads = [];
                for (const inst of upcoming) {
                    try {
                        if (!inst?.id || !inst.customer_name || !inst.balance || inst.balance <= 0)
                            continue;
                        const customer = inst.customer_name;
                        const msg = `Cuota próxima a vencer — ${customer} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — ${formatCurrency(inst.balance)}`;
                        const key = `upcoming|${inst.id}`;
                        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                        const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                        if (!existsActive && !existsToday) {
                            if (!(suppressIfMuted && isMuted)) {
                                const nid = repository_1.notificationOperations.create(msg, 'reminder', key);
                                const latest = repository_1.notificationOperations.getLatestByKey(key);
                                const createdAt = latest?.created_at;
                                payloads.push({ id: nid, message: msg, type: 'attention', meta: { message_key: key, customerName: customer, due_at: new Date(inst.due_date).toISOString(), amount: inst.balance, ...(createdAt ? { created_at: createdAt } : {}) } });
                            }
                        }
                    }
                    catch { }
                }
                emitBatchOrSingle(payloads);
            }
            try {
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(now.getDate() + 1);
                const tDay = tomorrow.getDate();
                const weeklyHour = parseInt(process.env.NOTIFICATIONS_WEEKLY_PRECHECK_HOUR || '8', 10);
                const runThisHour = Number.isFinite(weeklyHour) ? now.getHours() === weeklyHour : true;
                if (runThisHour && (tDay === 1 || tDay === 15)) {
                    const weeklySales = (database_operations_1.saleOperations.getAll() || []).filter((s) => s?.payment_type === 'installments' && s?.period_type === 'weekly');
                    if (weeklySales.length > 0) {
                        const customers = [];
                        for (const s of weeklySales) {
                            try {
                                if (!s?.id || !s?.customer_id || !s?.customer_name || s?.payment_type !== 'installments' || s?.period_type !== 'weekly')
                                    continue;
                                const installments = database_operations_1.installmentOperations.getBySale(s.id) || [];
                                const hasPending = installments.some((i) => i?.status === 'pending' && i?.balance > 0);
                                if (!hasPending)
                                    continue;
                                const cid = s.customer_id;
                                const customer = s.customer_name || (typeof cid === 'number' ? database_operations_1.customerOperations.getById(cid).name : undefined) || 'Cliente';
                                customers.push(customer);
                            }
                            catch { }
                        }
                        if (customers.length > 0) {
                            const cycleLabel = tDay === 1 ? '1 del mes' : '15 del mes';
                            const listPreview = customers.slice(0, 3).join(', ');
                            const extras = Math.max(0, customers.length - 3);
                            const msg = extras > 0 ? `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview} y +${extras}` : `Recordatorio (Semanal): Mañana ${cycleLabel} — revisar pago — ${listPreview}`;
                            const key = `weekly_precheck|summary|${tomorrow.toISOString().slice(0, 10)}`;
                            if (lastWeeklyPrecheckKeyEmitted === key) {
                                // Already processed this summary in the current app session
                            }
                            else {
                                const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                                const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
                                if (!existsActive && !existsToday) {
                                    if (!(suppressIfMuted && isMuted)) {
                                        const nid = repository_1.notificationOperations.create(msg, 'reminder', key);
                                        const win = getWindow();
                                        if (win) {
                                            const latest = repository_1.notificationOperations.getLatestByKey(key);
                                            const createdAt = latest?.created_at;
                                            win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, { id: nid, message: msg, type: 'attention', meta: { message_key: key, customerName: customers[0], customerNames: customers.slice(0, 3), customerCount: customers.length, due_at: tomorrow.toISOString(), actionLabel: 'Revisar', route: '/sales?tab=installments', ...(createdAt ? { created_at: createdAt } : {}) } });
                                            lastWeeklyPrecheckKeyEmitted = key;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch { }
            try {
                const retentionDays = parseInt(process.env.NOTIFICATIONS_RETENTION_DAYS || '90', 10);
                if (Number.isFinite(retentionDays) && retentionDays > 0) {
                    const now = new Date();
                    if (now.getHours() === 1) {
                        repository_1.notificationOperations.purgeArchivedOlderThan(retentionDays);
                    }
                }
            }
            catch { }
        }
        catch { }
    }
    tick();
    setInterval(tick, intervalMs);
}
exports.setupClientNotificationScheduler = setupClientNotificationScheduler;
function checkLowStockAfterSaleHook(saleData, getWindow) {
    try {
        if (saleData && Array.isArray(saleData.items)) {
            for (const item of saleData.items) {
                try {
                    if (item?.product_id == null)
                        continue;
                    const p = database_operations_1.productOperations.getById(item.product_id);
                    if (p && typeof p.stock === 'number' && p.stock <= 1) {
                        const priceStr = (() => { try {
                            return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.price);
                        }
                        catch {
                            return `$${p.price}`;
                        } })();
                        const msg = `Stock bajo: ${p.name} — quedó en ${p.stock} unidad${p.stock === 1 ? '' : 'es'} — ${priceStr}${p.category ? ` — ${p.category}` : ''}`;
                        const key = `stock_low|${p.id}`;
                        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
                        const latest = repository_1.notificationOperations.getLatestByKey(key);
                        const productUpdatedAt = p.updated_at ? new Date(p.updated_at).getTime() : 0;
                        const lastCreatedAt = latest?.created_at ? new Date(latest.created_at).getTime() : 0;
                        const recoveredSinceLast = !!latest && productUpdatedAt > lastCreatedAt;
                        const shouldNotify = !existsActive && (!latest || recoveredSinceLast);
                        if (shouldNotify) {
                            const suppressIfMuted = (process.env.NOTIFICATIONS_SUPPRESS_WHEN_MUTED ?? 'true') !== 'false';
                            const isMuted = !getWindow();
                            if (!(suppressIfMuted && isMuted)) {
                                const nid = repository_1.notificationOperations.create(msg, 'reminder', key);
                                const win = getWindow();
                                if (win) {
                                    const latestNew = repository_1.notificationOperations.getLatestByKey(key);
                                    const createdAtNew = latestNew?.created_at;
                                    win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, { id: nid, message: msg, type: 'attention', meta: { message_key: key, stockStatus: `${p.stock} unidad${p.stock === 1 ? '' : 'es'}`, productId: p.id, productName: p.name, productPrice: p.price, productCategory: p.category || 'Sin categoría', currentStock: p.stock, ...(createdAtNew ? { created_at: createdAtNew } : {}) } });
                                }
                            }
                        }
                    }
                }
                catch { }
            }
        }
    }
    catch { }
}
exports.checkLowStockAfterSaleHook = checkLowStockAfterSaleHook;
function checkInstallmentForOverdueSingle(installmentId, getWindow) {
    try {
        const inst = database_operations_1.installmentOperations.getById(installmentId);
        if (!inst || !inst.id || inst.balance <= 0)
            return;
        const isOverdueByDate = new Date(inst.due_date).getTime() < new Date().setHours(0, 0, 0, 0);
        if (!isOverdueByDate)
            return;
        const sale = database_operations_1.saleOperations.getById(inst.sale_id);
        const customerName = sale?.customer_name || (typeof sale?.customer_id === 'number' ? database_operations_1.customerOperations.getById(sale.customer_id)?.name : undefined) || 'Cliente';
        const msg = `Hay una cuota vencida — ${customerName} — ${new Date(inst.due_date).toLocaleDateString('es-AR')} — ${new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(inst.balance)}`;
        const key = `overdue|${inst.id}`;
        const existsActive = repository_1.notificationOperations.existsActiveWithKey(key);
        const existsToday = repository_1.notificationOperations.existsTodayWithKey(key);
        if (!existsActive && !existsToday) {
            const suppressIfMuted = (process.env.NOTIFICATIONS_SUPPRESS_WHEN_MUTED ?? 'true') !== 'false';
            const isMuted = !getWindow();
            if (!(suppressIfMuted && isMuted)) {
                const nid = repository_1.notificationOperations.create(msg, 'alert', key);
                const win = getWindow();
                if (win) {
                    const latest = repository_1.notificationOperations.getLatestByKey(key);
                    const createdAt = latest?.created_at;
                    win.webContents.send(constants_1.IPC_NOTIFICATIONS.event, { id: nid, message: msg, type: 'alert', meta: { message_key: key, customerName, due_at: new Date(inst.due_date).toISOString(), amount: inst.balance, ...(createdAt ? { created_at: createdAt } : {}) } });
                }
            }
        }
    }
    catch { }
}
exports.checkInstallmentForOverdueSingle = checkInstallmentForOverdueSingle;
//# sourceMappingURL=hooks.js.map