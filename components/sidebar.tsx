'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRoutePrefetch } from '@/hooks/use-route-prefetch';
import { notificationsAdapter } from '@/notifications/renderer/adapter';
import type { NotificationItem } from '@/notifications/types';

import {
  Home,
  BarChart3,
  Package,
  Users,
  Settings,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Bell,
  ChevronDown,
  ChevronUp,
  FileText,
  FileSignature,
  DollarSign,
  Calculator,
  Receipt
} from 'lucide-react';
import Image from 'next/image';

interface SidebarProps {
  className?: string;
  initialCollapsed?: boolean;
}


export function Sidebar({ className, initialCollapsed = false }: SidebarProps) {


  const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
  const [searchOpen, setSearchOpen] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);



  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const { prefetchProducts, prefetchCustomers, prefetchSales, prefetchCalendar } = useRoutePrefetch();



  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    try {
      notificationsAdapter.list(25).then((list) => setNotifications(list ?? []));
      const unsub = notificationsAdapter.subscribe((item) => {
        setNotifications(prev => [item, ...prev]);
      });
      (window as any).__sidebarNotificationsUnsub = unsub;
    } catch { }
    return () => {
      try {
        const unsub = (window as any).__sidebarNotificationsUnsub;
        if (typeof unsub === 'function') unsub();
      } catch { }
    }
  }, []);




  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('sidebar:collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    } catch {


    }
  }, []);



  useEffect(() => {
    try {
      window.localStorage.setItem('sidebar:collapsed', String(collapsed));


      document.cookie = `sidebar-collapsed=${collapsed}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {


    }
  }, [collapsed]);



  useEffect(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : (pathname || '/');
      setCurrentPath(path || '/');
    } catch {
      setCurrentPath(pathname || '/');
    }


  }, [pathname]);

  useEffect(() => {
    if (pathname) {
      setCurrentPath(pathname);
    }
  }, [pathname]);

  const isRouteActive = useCallback((href: string) => {


    const normalize = (p: string) => (p && p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p || '/');
    const current = normalize(currentPath || '/');
    const target = normalize(href);
    if (target === '/') return current === '/';
    return current === target || current.startsWith(`${target}/`);
  }, [currentPath]);


  const [salesExpanded, setSalesExpanded] = useState(false);
  const [isElectron] = useState(() => typeof window !== 'undefined' && !!(window as any).electronAPI);

  const navigationItems = [
    {
      title: 'Inicio',
      icon: Home,
      href: '/',
      prefetch: null
    },
    {
      title: 'Productos',
      icon: Package,
      href: '/products',
      prefetch: prefetchProducts
    },
    {
      title: 'Clientes',
      icon: Users,
      href: '/customers',
      prefetch: prefetchCustomers
    },
    {
      title: 'Ventas',
      icon: CreditCard,
      href: '/sales',
      prefetch: prefetchSales
    },

  ];

  return (
    <>
      <div
        className={cn(
          'relative flex flex-col border-r bg-background transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          className
        )}
      >
        {/* Header */}
        <div className={cn('flex h-20 items-center justify-between pl-8 pr-4', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-fit h-fit overflow-hidden rounded-lg border border-primary/20 flex items-center justify-center">
                <Image src={mounted && resolvedTheme === 'dark' ? "/logo-light.svg" : "/logo-dark.svg"} alt="Logo" width={26} height={26} />
              </div>
              <span className="font-bold text-xl tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">GESTIO</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-10 w-10 rounded-xl hover:bg-muted font-bold", collapsed && "w-full")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className={cn('flex-1 px-4 py-2', collapsed && 'px-2')}>
          <div className="space-y-1.5">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isRouteActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block"
                  onMouseEnter={() => {
                    if (item.prefetch) item.prefetch();
                  }}
                >
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start gap-3.5 h-11 transition-all rounded-xl border border-transparent',
                      collapsed && 'justify-center px-0',
                      isActive ? 'bg-secondary/80 text-secondary-foreground font-semibold border-border/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                    {!collapsed && <span className="truncate">{item.title}</span>}
                  </Button>
                </Link>
              );
            })}
          </div>


          <Separator className="my-4" />

          {!collapsed && (
            <div className="mt-8 mb-3 px-4">
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                HERRAMIENTAS
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Link href="/calendar" className="block">
              <Button
                variant={isRouteActive('/calendar') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3.5 h-10 transition-all rounded-xl border border-transparent',
                  collapsed && 'justify-center px-0',
                  isRouteActive('/calendar') ? 'bg-secondary/80 text-secondary-foreground font-semibold border-border/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calendar className={cn("h-4 w-4 flex-shrink-0", isRouteActive('/calendar') ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">Calendario</span>}
              </Button>
            </Link>

            <Link href="/invoices" className="block">
              <Button
                variant={isRouteActive('/invoices') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3.5 h-10 transition-all rounded-xl border border-transparent',
                  collapsed && 'justify-center px-0',
                  isRouteActive('/invoices') ? 'bg-secondary/80 text-secondary-foreground font-semibold border-border/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className={cn("h-4 w-4 flex-shrink-0", isRouteActive('/invoices') ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">Facturas</span>}
              </Button>
            </Link>

            <Link href="/calculator" className="block">
              <Button
                variant={isRouteActive('/calculator') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3.5 h-10 transition-all rounded-xl border border-transparent',
                  collapsed && 'justify-center px-0',
                  isRouteActive('/calculator') ? 'bg-secondary/80 text-secondary-foreground font-semibold border-border/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Calculator className={cn("h-4 w-4 flex-shrink-0", isRouteActive('/calculator') ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">Calculadora</span>}
              </Button>
            </Link>
          </div>
        </ScrollArea>

        {/* Administration Section */}
        <div className={cn('px-4 py-6 border-t border-border/40', collapsed && 'px-2')}>
          {!collapsed && (
            <div className="mb-3 px-4">
              <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">
                ADMINISTRACIÓN
              </p>
            </div>
          )}
          <div className="space-y-1">
            <Link href="/ajustes" className="block">
              <Button
                variant={isRouteActive('/ajustes') ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3.5 h-10 transition-all rounded-xl border border-transparent',
                  collapsed && 'justify-center px-0',
                  isRouteActive('/ajustes') ? 'bg-secondary/80 text-secondary-foreground font-semibold border-border/50 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Settings className={cn("h-4 w-4 flex-shrink-0", isRouteActive('/ajustes') ? "text-primary" : "text-muted-foreground")} />
                {!collapsed && <span className="truncate">Ajustes</span>}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
