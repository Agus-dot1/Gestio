'use client';

import { cn } from '@/lib/utils';
import type { NotificationItem as NotificationItemType } from '../../types';
import { formatTitle, formatExpirationLine, formatRelative } from '../utils';
import { NotificationActions } from './notification-actions';

interface NotificationItemProps {
    notification: NotificationItemType;
    onToggleRead: (id: number, isRead: boolean) => void;
    onArchive: (id: number) => void;
    onUnarchive: (id: number) => void;
    onNotifyWhatsApp: (meta: NotificationItemType['meta']) => void;
    activeTab: string;
}

export function NotificationItem({
    notification: n,
    onToggleRead,
    onArchive,
    onUnarchive,
    onNotifyWhatsApp,
    activeTab,
}: NotificationItemProps) {
    const isRead = !!n.read_at;
    const m = n.meta || {};

    const secondaryLine = m.category === 'client'
        ? (() => {
            const names = Array.isArray(m.customerNames) ? m.customerNames : (m.customerName ? [m.customerName] : []);
            const shown = names.slice(0, 2);
            const count = typeof m.customerCount === 'number' ? m.customerCount : Math.max(names.length, shown.length);
            const extras = Math.max(0, count - shown.length);
            const multi = extras > 0 || shown.length > 1;
            const label = multi ? 'Clientes' : 'Cliente';
            const namesStr = shown.length > 0 ? shown.join(', ') : (m.customerName ?? 'Cliente');
            return `${label}: ${namesStr}${extras > 0 ? `... +${extras}` : ''}`;
        })()
        : m.category === 'system'
            ? (() => {
                const parts: string[] = [];
                if (m.systemStatus) parts.push(String(m.systemStatus));
                const filename = (m as any)?.downloadFilename || (String(n.message || '').match(/Descarga completada:\s([^—]+)/i)?.[1]?.trim() || '');
                if (filename) parts.push(`${filename}`);
                const line = parts.join(' • ');
                return `Sistema: ${line || n.message}`;
            })()
            : m.category === 'stock'
                ? (() => {
                    const parts = [];
                    if (m.stockStatus) parts.push(`Stock: ${m.stockStatus}`);
                    if (m.productPrice) parts.push(`$${m.productPrice}`);
                    if (m.productCategory) parts.push(m.productCategory);
                    return parts.length > 0 ? parts.join(' • ') : 'Stock';
                })()
                : undefined;

    return (
        <li className={cn(
            "rounded-3xl border animate-in fade-in-0 slide-in-from-bottom-1 transition-transform duration-200",
            isRead ? "bg-[#151515] border-[#2b2b2b] hover:bg-[#1a1a1a]" : "bg-[#202020] border-[#3C3C3C] hover:bg-[#262626]"
        )}>
            <div className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                            "mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0",
                            n.type === 'alert' && "bg-red-500",
                            n.type === 'attention' && "bg-orange-500",
                            n.type === 'info' && "bg-blue-500",
                            !n.type && "bg-slate-400",
                            isRead && "opacity-50"
                        )} style={{ minWidth: '10px', minHeight: '10px' }} />
                        <div className="space-y-1 min-w-0">
                            <div className={cn("text-sm", isRead ? "text-muted-foreground opacity-70 font-medium" : "font-semibold")}>
                                {formatTitle(n.message, m)}
                            </div>
                            {secondaryLine && (
                                <div className="text-xs text-muted-foreground font-bold">{secondaryLine}</div>
                            )}
                            {(() => {
                                const line = formatExpirationLine(m);
                                return line ? <div className="text-xs text-muted-foreground">{line}</div> : null;
                            })()}
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium opacity-60">
                                {formatRelative(n.created_at)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                    <NotificationActions
                        notification={n}
                        isRead={isRead}
                        onToggleRead={onToggleRead}
                        onArchive={onArchive}
                        onUnarchive={onUnarchive}
                        onNotifyWhatsApp={onNotifyWhatsApp}
                        activeTab={activeTab}
                    />
                </div>
            </div>
        </li>
    );
}
