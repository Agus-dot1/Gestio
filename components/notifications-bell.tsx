'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, CheckCheck, BellOff, Bell, Inbox, Trash2, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNotificationsLogic } from '../notifications/renderer/hooks/use-notifications-logic';
import { NotificationItem } from '../notifications/renderer/components/notification-item';
import { EmptyState } from '../notifications/renderer/components/empty-state';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const scrollRef = useRef<any>(null);

  const {
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
  } = useNotificationsLogic(open);

  const snoozeActive = snoozeUntil && Date.now() < snoozeUntil;

  // Infinite scroll logic
  useEffect(() => {
    const root = scrollRef.current as HTMLElement | null;
    const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const el = viewport ?? root;
    if (!el) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if ((scrollTop + clientHeight) / scrollHeight > 0.8) {
        setRenderCount((rc) => Math.min(rc + 20, filtered.length));
      }
    };

    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [filtered.length, setRenderCount]);

  // Scroll to bottom on open or new notifications
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const root = scrollRef.current as HTMLElement | null;
      const viewport = root?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const el = viewport ?? root;
      if (el) el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(timer);
  }, [open, filtered.length, activeTab]);

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="group relative h-10 w-10 rounded-full shadow-md transition-transform active:scale-95"
          >
            <Inbox className={cn("h-5 w-5 origin-top transition-transform", !open && unreadCount > 0 && "animate-pulse")} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-sm px-1 min-w-[18px] text-center shadow-sm animate-badge-pop transition-transform group-hover:scale-110">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="bottom"
          className="w-[32rem] sm:w-[42rem] p-0 rounded-3xl overflow-hidden flex flex-col max-h-[80vh] bg-[#151515] border-[#3C3C3C] animate-pop shadow-2xl"
          onInteractOutside={(e) => { if (filtersOpen) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (filtersOpen) e.preventDefault(); }}
          sideOffset={8}
        >
          <div className="px-4 py-3 flex items-center justify-between gap-2 bg-[#1a1a1a]">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto overflow-x-auto">
              <TabsList className="rounded-3xl border border-[#3C3C3C] bg-[#202020]">
                <TabsTrigger className="rounded-3xl min-w-[80px]" value="all">Todas</TabsTrigger>
                <TabsTrigger className="rounded-3xl min-w-[80px]" value="unread">Nuevas</TabsTrigger>
                <TabsTrigger className="rounded-3xl min-w-[80px]" value="read">Leídas</TabsTrigger>
                <TabsTrigger className="rounded-r-3xl rounded-l-none min-w-[100px] border-l border-[#3C3C3C]" value="archived">Archivadas</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 flex-shrink-0">
              <DropdownMenu onOpenChange={setFiltersOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-[#3C3C3C] bg-[#202020]" title="Filtrar">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-[#202020] border-[#3C3C3C]">
                  <DropdownMenuCheckboxItem checked={visibleTypes.alert} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, alert: !!v }))}>
                    Críticas
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleTypes.attention} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, attention: !!v }))}>
                    Atención
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={visibleTypes.info} onCheckedChange={(v) => setVisibleTypes(s => ({ ...s, info: !!v }))}>
                    Sistema
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-[#3C3C3C] bg-[#202020]" title="Marcar todas como leídas" onClick={markAllRead}>
                <CheckCheck className="h-4 w-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 rounded-full border-[#3C3C3C] bg-[#202020]" title="Archivar todas">
                    <Archive className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl border-[#3C3C3C] bg-[#151515]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">¿Archivar todas las notificaciones?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción moverá todas las notificaciones actuales a la pestaña de archivadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg bg-transparent border-[#3C3C3C] text-white">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllNotifications} className="rounded-lg">
                      Confirmar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <Separator className="bg-[#3C3C3C]" />

          <div
            className="flex-1 overflow-y-auto max-h-[60vh] p-4 space-y-3 custom-scrollbar"
            ref={scrollRef}
          >
            {filtered.length === 0 ? (
              <EmptyState />
            ) : (
              <ul className="space-y-3">
                {filtered.map((n) => (
                  <NotificationItem
                    key={n.id ?? `${n.created_at}-${n.message}`}
                    notification={n}
                    onToggleRead={toggleNotificationRead}
                    onArchive={archiveNotification}
                    onUnarchive={unarchiveNotification}
                    onNotifyWhatsApp={openWhatsAppForCustomer}
                    activeTab={activeTab}
                  />
                ))}
              </ul>
            )}
            <div className="h-2" />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
