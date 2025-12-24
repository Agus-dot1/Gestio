'use client';

import { BellOff, Inbox } from 'lucide-react';

export function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="relative bg-[#202020] border border-[#3C3C3C] p-6 rounded-3xl shadow-2xl">
                    <Inbox className="h-12 w-12 text-muted-foreground/40" />
                </div>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Bandeja de entrada vacía</h3>
            <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
                Todo al día. Cuando haya algo importante que revisar, te lo notificaremos.
            </p>
        </div>
    );
}
