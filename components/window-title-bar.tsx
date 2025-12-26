'use client';

import { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function WindowTitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const checkMaximized = async () => {
            try {
                const maximized = await window.electronAPI.window.isMaximized();
                setIsMaximized(maximized);
            } catch (e) {
                console.error('Failed to check window maximized state:', e);
            }
        };

        checkMaximized();

        const unsub = window.electronAPI.window.onStateChange((state) => {
            if (state === 'maximized') setIsMaximized(true);
            if (state === 'restored') setIsMaximized(false);
        });

        return unsub;
    }, []);

    if (!mounted) return null;

    return (
        <div className="h-9 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border/40 select-none overflow-hidden shrink-0 z-50">
            {/* Draggable Area & Logo */}
            <div
                className="flex-1 flex items-center h-full px-4 gap-2.5 transition-opacity"
                style={{ WebkitAppRegion: 'drag' } as any}
            >
                <div className="flex items-center justify-center overflow-hidden w-fit h-fit rounded-sm">
                    <Image
                        src={resolvedTheme === 'dark' ? "./logo-light.svg" : "./logo-dark.svg"}
                        alt="Logo"
                        width={14}
                        height={14}
                        className="opacity-90"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-foreground tracking-[0.2em] uppercase">
                        Gestio
                    </span>
                    <div className="h-1 w-1 rounded-full bg-primary/40" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">
                        Sistema de Ventas
                    </span>
                </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button
                    onClick={() => window.electronAPI.window.minimize()}
                    className="h-full w-12 flex items-center justify-center hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-90"
                    title="Minimizar"
                >
                    <Minus className="h-3.5 w-3.5" />
                </button>

                <button
                    onClick={() => window.electronAPI.window.toggleMaximize()}
                    className="h-full w-12 flex items-center justify-center hover:bg-muted transition-all text-muted-foreground hover:text-foreground active:scale-90"
                    title={isMaximized ? "Restaurar" : "Maximizar"}
                >
                    {isMaximized ? (
                        <Copy className="h-3 w-3" />
                    ) : (
                        <Square className="h-3 w-3" />
                    )}
                </button>

                <button
                    onClick={() => window.electronAPI.window.close()}
                    className="h-full w-12 flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-all text-muted-foreground active:bg-destructive/90"
                    title="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
