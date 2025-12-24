'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Archive, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { NotificationItem } from '../../types';

interface NotificationActionsProps {
    notification: NotificationItem;
    isRead: boolean;
    onToggleRead: (id: number, isRead: boolean) => void;
    onArchive: (id: number) => void;
    onUnarchive: (id: number) => void;
    onNotifyWhatsApp: (meta: NotificationItem['meta']) => void;
    activeTab: string;
}

export function NotificationActions({
    notification: n,
    isRead,
    onToggleRead,
    onArchive,
    onUnarchive,
    onNotifyWhatsApp,
    activeTab,
}: NotificationActionsProps) {
    const router = useRouter();
    const m = n.meta || {};

    const baseActions = (
        <>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                    isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                )}
                title={isRead ? "Marcar no leída" : "Marcar leído"}
                onClick={(e) => {
                    e.preventDefault();
                    if (n.id) onToggleRead(n.id, isRead);
                }}
            >
                {isRead ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            </Button>
            {activeTab === 'archived' ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    title="Restaurar"
                    onClick={(e) => {
                        e.preventDefault();
                        if (n.id) onUnarchive(n.id);
                    }}
                >
                    <RotateCcw className="h-4 w-4 mr-1" />
                </Button>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    title="Archivar"
                    onClick={(e) => {
                        e.preventDefault();
                        if (n.id) onArchive(n.id);
                    }}
                >
                    <Archive className="h-4 w-4 mr-1" />
                </Button>
            )}
        </>
    );

    if (m.category === 'stock') {
        const pid = m.productId;
        return (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        router.push(pid ? `/products?highlight=${pid}` : '/products');
                    }}
                    title="Revisar producto"
                >
                    Revisar
                </Button>
                {baseActions}
            </>
        );
    }

    if (n.type === 'alert') {
        return (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        router.push('/sales?tab=installments');
                    }}
                >
                    Revisar
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        onNotifyWhatsApp(m);
                    }}
                >
                    Notificar cliente
                </Button>
                {baseActions}
            </>
        );
    }

    if (n.type === 'attention' && m.category === 'client') {
        return (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        router.push(m.route || '/sales?tab=installments');
                    }}
                    title={m.actionLabel || 'Revisar'}
                >
                    {m.actionLabel || 'Revisar'}
                </Button>
                {baseActions}
            </>
        );
    }

    if (m.category === 'system') {
        const onOpenDownloads = async () => {
            try {
                const downloads = await (window as any)?.electronAPI?.getDownloadsPath?.();
                if (downloads) await (window as any)?.electronAPI?.openPath?.(downloads);
            } catch { }
        };
        return (
            <>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                        "h-8 text-muted-foreground hover:bg-[#3C3C3C] transition-transform active:scale-95",
                        isRead ? "text-muted-foreground font-medium hover:bg-transparent" : "font-semibold"
                    )}
                    onClick={(e) => {
                        e.preventDefault();
                        onOpenDownloads();
                    }}
                    title={m.actionLabel || 'Mostrar en carpeta'}
                >
                    {m.actionLabel || 'Mostrar en carpeta'}
                </Button>
                {baseActions}
            </>
        );
    }

    return baseActions;
}
