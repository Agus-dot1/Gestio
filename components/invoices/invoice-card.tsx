'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    FileDown,
    MessageCircle,
    Clock,
    CheckCircle2,
    Send,
    XCircle,
    MoreVertical,
    Calendar,
    User,
    DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Invoice } from '@/lib/database-operations';
import { cn } from '@/lib/utils';

interface InvoiceCardProps {
    invoice: Invoice;
    onDownload: (invoice: Invoice) => void;
    onSendWhatsApp: (invoice: Invoice) => void;
    onStatusUpdate?: (invoice: Invoice, status: Invoice['status']) => void;
}

const statusConfig = {
    emitted: {
        label: 'Emitida',
        icon: Clock,
        className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    },
    sent: {
        label: 'Enviada',
        icon: Send,
        className: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    },
    paid: {
        label: 'Pagada',
        icon: CheckCircle2,
        className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    },
    cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        className: 'bg-red-500/10 text-red-500 border-red-500/20',
    },
};

export function InvoiceCard({ invoice, onDownload, onSendWhatsApp }: InvoiceCardProps) {
    const status = statusConfig[invoice.status || 'emitted'];
    const StatusIcon = status.icon;

    return (
        <Card id={`invoice-${invoice.id}`} className="group relative overflow-hidden border-white/10 bg-white/5 backdrop-blur-md transition-all duration-300 hover:bg-white/5">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                        {invoice.invoice_number}
                    </Badge>
                    <Badge variant="outline" className={cn("flex items-center gap-1", status.className)}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-medium leading-none">{invoice.customer_name || 'Consumidor Final'}</p>
                                <p className="text-xs text-muted-foreground mt-1">Cliente</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-bold tracking-tight text-foreground flex items-center justify-end">
                                <DollarSign className="h-4 w-4 mr-0.5 text-emerald-500" />
                                {(invoice.total_amount || 0).toLocaleString('es-AR', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Monto Total</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 text-primary/60" />
                            <span className="text-xs">
                                {invoice.created_at ? format(new Date(invoice.created_at), 'dd MMM, yyyy', { locale: es }) : 'N/A'}
                            </span>
                        </div>
                        {invoice.sale_date && (
                            <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                <Clock className="h-4 w-4 text-primary/60" />
                                <span className="text-xs">Venta: {format(new Date(invoice.sale_date), 'dd/MM/yy')}</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            <CardFooter className="grid grid-cols-2 gap-2 pt-2">
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 bg-white/5 hover:bg-white/10 border-white/10"
                    onClick={() => onDownload(invoice)}
                >
                    <FileDown className="h-4 w-4" />
                    PDF
                </Button>
                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20"
                    onClick={() => onSendWhatsApp(invoice)}
                >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp
                </Button>
            </CardFooter>
        </Card>
    );
}
