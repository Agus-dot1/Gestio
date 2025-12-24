'use client';

import { useState, useCallback } from 'react';
import { SearchTrigger } from '@/components/search/search-trigger';
import { SearchDialog } from '@/components/search/search-dialog';
import { NotificationsBell } from '@/components/notifications-bell';
import { useSearchShortcut } from '@/hooks/use-search-shortcut';
import { User, Bell, LayoutGrid, DollarSign, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';

const routeMetadata: Record<string, { title: string; subtitle: string }> = {
    '/': { title: 'Hola, bienvenido', subtitle: 'Resumen del sistema' },
    '/products': { title: 'Productos', subtitle: 'Control de inventario y catálogo' },
    '/customers': { title: 'Clientes', subtitle: 'Gestión de base de datos de clientes' },
    '/sales': { title: 'Ventas', subtitle: 'Registro y seguimiento de transacciones' },
    '/calendar': { title: 'Calendario', subtitle: 'Gestión de eventos, ventas y pagos previstos' },
    '/invoices': { title: 'Facturas', subtitle: 'Control de facturación y recibos' },
    '/calculator': { title: 'Calculadora', subtitle: 'Herramientas de cálculo rápido' },
    '/ajustes': { title: 'Configuración', subtitle: 'Preferencias del sistema y personalización' },
};

export function Header() {
    const [searchOpen, setSearchOpen] = useState(false);

    const handleOpenSearch = useCallback(() => {
        setSearchOpen(true);
    }, []);

    const handleToggleSearch = useCallback(() => {
        setSearchOpen(prev => !prev);
    }, []);

    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);
    const basePath = segments.length > 0 ? `/${segments[0]}` : '/';
    const metadata = routeMetadata[basePath] || routeMetadata['/'];

    useSearchShortcut({ onOpenSearch: handleOpenSearch, onToggleSearch: handleToggleSearch });

    return (
        <header className="flex items-center justify-between px-8 py-5 bg-background/60 backdrop-blur-xl sticky top-0 z-30 border-b border-border/5 shadow-sm">
            <div className="flex flex-col group cursor-default">
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:to-primary transition-all duration-500">
                    {metadata.title}
                </h1>
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider opacity-70">
                    {metadata.subtitle}
                </p>
            </div>

            <div className="flex-1 max-w-md mx-8">
                <SearchTrigger onOpenSearch={handleOpenSearch} />
            </div>

            <div className="flex items-center gap-3">
                <NotificationsBell />
            </div>

            <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
        </header>
    );
}
