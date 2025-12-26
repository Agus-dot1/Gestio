import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { toast } from 'sonner';
import { loadPersisted, subscribeNotifications } from '../controller';
import { notificationsAdapter } from '../adapter';
import type { NotificationItem } from '../../types';
import { buildWhatsAppMessage } from '../utils';

export function useNotificationsLogic(open: boolean) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [archived, setArchived] = useState<NotificationItem[]>([]);
    const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read' | 'archived'>('all');
    const [visibleTypes, setVisibleTypes] = usePersistedState<{ alert: boolean; attention: boolean; info: boolean }>('notifications:visibleTypes', {
        alert: true,
        attention: true,
        info: true
    });
    const [snoozeUntil, setSnoozeUntil] = usePersistedState<number | null>('notifications:snoozeUntil', null);
    const [renderCount, setRenderCount] = useState(30);

    const pendingChangesRef = useRef<Map<number, { read: boolean; ts: number }>>(new Map());
    const suppressedTodayRef = useRef<Set<string>>(new Set());
    const suppressedKeysRef = useRef<Set<string>>(new Set());
    const loadedOnOpenRef = useRef<boolean>(false);


    const filterSuppressed = useCallback((list: NotificationItem[]) => {
        const today = new Date().toDateString();
        return list.filter(n => {
            const sameDay = new Date(n.created_at).toDateString() === today;
            const key = n.meta?.message_key;
            if (key && suppressedKeysRef.current.has(key)) return false;
            return !(sameDay && !!n.message && suppressedTodayRef.current.has(n.message));
        });
    }, []);

    const reconcileWithLocal = useCallback((prev: NotificationItem[], next: NotificationItem[]) => {
        const now = Date.now();
        return next.map((n) => {
            const p = prev.find(x => x.id === n.id);
            let read_at = n.read_at ?? (p?.read_at || null);

            if (typeof n.id === 'number') {
                const lock = pendingChangesRef.current.get(n.id);
                if (lock) {
                    const expired = now - lock.ts > 60000;
                    if (!expired) {
                        read_at = lock.read ? (read_at || new Date().toISOString()) : null;
                    } else {
                        if (!!n.read_at === !!lock.read) pendingChangesRef.current.delete(n.id);
                    }
                }
            }
            return { ...n, read_at } as NotificationItem;
        });
    }, []);

    // Subscription and logic loading
    useEffect(() => {
        let unmounted = false;
        (async () => {
            const initial = await loadPersisted(50);
            if (!unmounted) setNotifications(filterSuppressed(initial));

            try {
                const unsub = subscribeNotifications(() => notifications, (next) => {
                    setNotifications(prev => {
                        const result = typeof next === 'function' ? next(prev) : next;
                        return result;
                    });
                });
                (window as any).__notificationsUnsub = unsub;

                const __loadPersisted = async () => {
                    const refreshed = await loadPersisted(50);
                    setNotifications(prev => filterSuppressed(reconcileWithLocal(prev, refreshed)));
                };
                (window as any).__loadPersisted = __loadPersisted;

                if (open && !loadedOnOpenRef.current) {
                    __loadPersisted();
                    loadedOnOpenRef.current = true;
                }
            } catch { }
        })();

        return () => {
            unmounted = true;
            const unsub = (window as any).__notificationsUnsub;
            if (typeof unsub === 'function') unsub();
        };
    }, [snoozeUntil, open]);

    // Archived loader
    useEffect(() => {
        if (activeTab === 'archived') {
            notificationsAdapter.listArchived(50).then(rows => setArchived(rows || []));
        }
    }, [activeTab]);

    // Reset renderCount when tab changes
    useEffect(() => {
        setRenderCount(30);
    }, [activeTab]);

    const toggleNotificationRead = useCallback(async (id?: number, isRead?: boolean) => {
        if (!id) return;
        const nextRead = !isRead;
        setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read_at: nextRead ? new Date().toISOString() : null } : n)));
        pendingChangesRef.current.set(id, { read: nextRead, ts: Date.now() });
        try {
            if (isRead) await notificationsAdapter.markUnread(id);
            else await notificationsAdapter.markRead(id);
        } catch (e) {
            toast.error('No se pudo cambiar el estado de lectura');
        }
    }, [toast]);

    const archiveNotification = useCallback(async (id?: number) => {
        if (!id) return;
        setNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await notificationsAdapter.delete(id);
            const rows = await notificationsAdapter.listArchived(50);
            setArchived(rows || []);
        } catch (e) {
            const refreshed = await loadPersisted(50);
            setNotifications(refreshed);
        }
    }, []);

    const unarchiveNotification = useCallback(async (id?: number) => {
        if (!id) return;
        setArchived(prev => prev.filter(n => n.id !== id));
        try {
            await (notificationsAdapter as any).unarchive(id);
            // Re-fetch active notifications
            const initial = await loadPersisted(50);
            setNotifications(filterSuppressed(initial));
            // Also refresh archived list to be sure
            const rows = await notificationsAdapter.listArchived(50);
            setArchived(rows || []);
        } catch (e) {
            toast.error('No se pudo restaurar la notificación');
        }
    }, [filterSuppressed, toast]);

    const markAllRead = useCallback(async () => {
        const ids = notifications.filter(n => !n.read_at && n.id).map(n => n.id!);
        try {
            for (const id of ids) await notificationsAdapter.markRead(id);
            setNotifications(prev => prev.map(n => (!n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
        } catch (e) {
            toast.error('No se pudieron marcar todas como leídas');
        }
    }, [notifications, toast]);

    const clearAllNotifications = useCallback(async () => {
        try {
            const snapshot = [...notifications];
            for (const n of snapshot) {
                const key = n.meta?.message_key;
                if (key) {
                    suppressedKeysRef.current.add(key);
                    await notificationsAdapter.deleteByKeyToday(key);
                } else if (n.message) {
                    suppressedTodayRef.current.add(n.message);
                    await notificationsAdapter.deleteByMessageToday(n.message);
                }
            }
            await notificationsAdapter.clearAll();
            setNotifications([]);
            toast.success('Todas las notificaciones han sido eliminadas');
        } catch (error) {
            toast.error('No se pudieron eliminar las notificaciones');
        }
    }, [notifications, toast]);

    const snooze = useCallback((hours: number = 1) => {
        const until = Date.now() + hours * 60 * 60 * 1000;
        setSnoozeUntil(until);
    }, [setSnoozeUntil]);

    const clearSnooze = useCallback(() => {
        setSnoozeUntil(null);
    }, [setSnoozeUntil]);

    const openWhatsAppForCustomer = useCallback(async (m: NotificationItem['meta']) => {
        if (!m) return;
        const normalize = (s: string) => String(s || '').replace(/\D/g, '');
        let digits = normalize(String(m.customerPhone ?? ''));
        if (!digits && m.customerName) {
            try {
                const customers = await (window.electronAPI?.database?.customers?.getAll?.() ?? []);
                const found = Array.isArray(customers)
                    ? customers.find((c: any) => String(c?.name || '').trim().toLowerCase() === String(m.customerName).trim().toLowerCase())
                    : null;
                digits = found?.phone ? normalize(String(found.phone)) : '';
            } catch { }
        }
        if (!digits) return;
        const body = buildWhatsAppMessage(m);
        const text = encodeURIComponent(body);
        const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${text}`;
        const webUrl = `https://wa.me/+54${digits}?text=${text}`;
        try {
            const okNative = await (window as any)?.electronAPI?.openExternal?.(nativeUrl);
            if (okNative === false) throw new Error();
        } catch {
            try {
                await (window as any)?.electronAPI?.openExternal?.(webUrl);
            } catch {
                window.open(webUrl, '_blank');
            }
        }
    }, []);

    const unreadCount = useMemo(() => notifications.filter(n => !n.read_at).length, [notifications]);

    const filtered = useMemo(() => {
        const source = activeTab === 'archived' ? archived : notifications;
        const base = activeTab === 'unread'
            ? source.filter(n => !n.read_at)
            : activeTab === 'read'
                ? source.filter(n => !!n.read_at)
                : source;
        return base
            .filter(n => visibleTypes[n.type])
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [notifications, archived, activeTab, visibleTypes]);

    return {
        notifications,
        archived,
        filtered,
        activeTab,
        setActiveTab,
        unreadCount,
        snoozeUntil,
        visibleTypes,
        setVisibleTypes,
        renderCount,
        setRenderCount,
        toggleNotificationRead,
        archiveNotification,
        unarchiveNotification,
        markAllRead,
        clearAllNotifications,
        snooze,
        clearSnooze,
        openWhatsAppForCustomer
    };
}
