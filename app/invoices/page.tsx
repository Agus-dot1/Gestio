'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Plus,
    Search,
    FileSpreadsheet,
    RefreshCw,
    Filter,
    ArrowBigUpDash,
    Receipt,
    Download,
    Share2,
    FileText
} from 'lucide-react';
import { InvoiceCard } from '@/components/invoices/invoice-card';
import { Invoice, Sale, Customer, SaleItem, Installment } from '@/lib/database-operations';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import * as ExcelJS from 'exceljs';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/config/locale';

import { useSearchParams } from 'next/navigation';
import { useRef } from 'react';

// Formatting helpers
function formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const str = String(dateString);
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(str);
    if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]) - 1;
        const d = Number(m[3]);
        const dt = new Date(y, mo, d);
        return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    const dt = new Date(str);
    return dt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getPaymentMethodLabel(method: string | undefined) {
    if (method === 'bank_transfer') return 'Transferencia';
    if (method === 'cash') return 'Efectivo';
    if (method === 'credit_card') return 'Tarjeta de Crédito';
    if (method === 'debit_card') return 'Tarjeta de Débito';
    if (method === 'check') return 'Cheque';
    return 'N/A';
}

function getInstallmentStatusLabel(status: string): string {
    if (status === 'paid') return 'Pagada';
    if (status === 'overdue') return 'Vencida';
    return 'Pendiente';
}

export default function InvoicesPage() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    const loadInvoices = useCallback(async () => {
        try {
            setIsLoading(true);
            if (!(window as any).electronAPI) return;
            const result = await (window as any).electronAPI.database.invoices.getAllWithDetails();
            setInvoices(result);
        } catch (error) {
            console.error('Error loading invoices:', error);
            toast.error('Error al cargar las facturas');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && highlightId) {
            setTimeout(() => {
                const element = document.getElementById(`invoice-${highlightId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-1', 'ring-white/10', 'ring-offset-1');
                    setTimeout(() => {
                        element.classList.remove('ring-1', 'ring-white/10', 'ring-offset-1');
                    }, 3000);
                }
            }, 500);
        }
    }, [isLoading, highlightId]);

    useEffect(() => {
        loadInvoices();

        // Listen for database changes
        if ((window as any).electronAPI) {
            const unsubscribe = (window as any).electronAPI.database.onChanged(({ entity }: { entity: string }) => {
                if (entity === 'invoices') {
                    loadInvoices();
                }
            });
            return () => unsubscribe();
        }
    }, [loadInvoices]);

    const filteredInvoices = useMemo(() => {
        let result = invoices;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(inv =>
                inv.invoice_number.toLowerCase().includes(lowerSearch) ||
                inv.customer_name?.toLowerCase().includes(lowerSearch)
            );
        }

        if (statusFilter) {
            result = result.filter(inv => inv.status === statusFilter);
        }

        return result;
    }, [searchTerm, statusFilter, invoices]);

    const stats = useMemo(() => {
        const totalAmount = invoices.reduce((acc, inv) => acc + (inv.total_amount || 0), 0);
        const recent = invoices.filter(inv => {
            if (!inv.created_at) return false;
            const date = new Date(inv.created_at);
            const today = new Date();
            const diff = (today.getTime() - date.getTime()) / (1000 * 3600 * 24);
            return diff <= 30;
        }).length;

        return { totalAmount, recent };
    }, [invoices]);

    const handleDownloadPDF = async (invoice: Invoice) => {
        if (!(window as any).electronAPI) return;

        const loadingToast = toast.loading(`Generando factura ${invoice.invoice_number}...`);

        try {
            // 1. Fetch full details
            const sale = await (window as any).electronAPI.database.sales.getWithDetails(invoice.sale_id);
            const customer = await (window as any).electronAPI.database.customers.getById(invoice.customer_id);
            const saleItems: SaleItem[] = sale.items || [];
            const installments: Installment[] = sale.installments || [];

            // 2. Generate PDF using provided structure
            const { default: jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            const colors = {
                primary: [30, 30, 30] as [number, number, number],
                accent: [71, 85, 105] as [number, number, number],
                secondary: [110, 110, 110] as [number, number, number],
                lightGray: [248, 250, 252] as [number, number, number],
                border: [226, 232, 240] as [number, number, number]
            };

            let y = 0;

            // 1. Header Bar
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(0, 0, 210, 45, 'F');
            doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
            doc.rect(0, 45, 210, 1.2, 'F');

            // Brand
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.text('GESTIO', 15, 22);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(160, 160, 160);
            doc.text('SOLUCIONES DE GESTIÓN COMERCIAL', 15, 28);

            // Comprobante Right Aligned
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('COMPROBANTE DE VENTA', 195, 20, { align: 'right' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`REF: ${sale.reference_code || '---'}`, 195, 27, { align: 'right' });
            doc.setTextColor(140, 140, 140);
            doc.setFontSize(8);
            doc.text(`Factura N°: ${invoice.invoice_number}`, 195, 32, { align: 'right' });

            y = 60;

            // 2. Twin Info Blocks
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
            doc.text('CLIENTE', 15, y);
            doc.text('INFORMACIÓN DE VENTA', 110, y);
            y += 3;
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.line(15, y, 95, y);
            doc.line(110, y, 195, y);
            y += 6;
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text(customer?.name || 'Consumidor Final', 15, y);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            let custY = y + 5;
            if (customer?.dni) { doc.text(`DNI: ${customer.dni}`, 15, custY); custY += 5; }
            if (customer?.phone) { doc.text(`Tel: ${customer.phone}`, 15, custY); custY += 5; }
            if (customer?.address) {
                const addr = doc.splitTextToSize(`Dir: ${customer.address}`, 75);
                doc.text(addr, 15, custY);
            }

            doc.setTextColor(30, 30, 30);
            doc.setFontSize(9.5);
            doc.text(`Fecha de Emisión:`, 110, y);
            doc.setFont('helvetica', 'bold');
            doc.text(formatDate(sale.date), 145, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(`Financiación:`, 110, y);
            doc.setFont('helvetica', 'bold');
            doc.text(sale.payment_type === 'cash' ? 'Venta al Contado' : 'Plan en Cuotas', 145, y);
            y += 5;
            doc.setFont('helvetica', 'normal');
            doc.text(`Medio de Pago:`, 110, y);
            doc.setFont('helvetica', 'bold');
            doc.text(getPaymentMethodLabel(sale.payment_method), 145, y);

            y += 18;

            // 3. Items Table
            autoTable(doc, {
                startY: y,
                head: [['ÍTEM', 'CANTIDAD', 'PRECIO UNIT.', 'TOTAL']],
                body: saleItems.map(item => [
                    item.product_name || 'Producto',
                    item.quantity.toString(),
                    formatCurrency(item.unit_price),
                    formatCurrency(item.line_total)
                ]),
                styles: { fontSize: 8, cellPadding: 3.5 },
                headStyles: { fillColor: colors.primary, textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'center', cellWidth: 25 },
                    2: { halign: 'right', cellWidth: 40 },
                    3: { halign: 'right', cellWidth: 40, fontStyle: 'bold' }
                },
                margin: { left: 15, right: 15 },
                theme: 'striped'
            });

            y = (doc as any).lastAutoTable.finalY + 10;

            // 4. Installments Section
            if (sale.payment_type === 'installments' && installments.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
                doc.text('PLAN DE CUOTAS Y VENCIMIENTOS', 15, y);
                y += 4;
                autoTable(doc, {
                    startY: y,
                    head: [['CUOTA', 'VENCIMIENTO', 'ESTADO', 'MONTO', 'SALDO']],
                    body: installments.map(inst => [
                        `#${inst.installment_number}`,
                        formatDate(inst.due_date),
                        getInstallmentStatusLabel(inst.status).toUpperCase(),
                        formatCurrency(inst.amount),
                        formatCurrency(inst.balance)
                    ]),
                    styles: { fontSize: 7.5, cellPadding: 2.5 },
                    headStyles: { fillColor: colors.accent, textColor: 255, fontStyle: 'bold' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 25 },
                        1: { halign: 'center', cellWidth: 45 },
                        2: { halign: 'center', cellWidth: 40 },
                        3: { halign: 'right', cellWidth: 35 },
                        4: { halign: 'right', cellWidth: 35, fontStyle: 'bold' }
                    },
                    margin: { left: 15, right: 15 },
                    theme: 'grid'
                });
                y = (doc as any).lastAutoTable.finalY + 10;
            }

            // 5. Summary and Totals
            const summaryX = 130;
            doc.setFontSize(9);
            doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
            doc.text('Subtotal:', summaryX, y);
            doc.setTextColor(0, 0, 0);
            doc.text(formatCurrency(sale.subtotal || 0), 195, y, { align: 'right' });
            if (sale.discount_amount) {
                y += 5;
                doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
                doc.text('Bonificación:', summaryX, y);
                doc.setTextColor(180, 0, 0);
                doc.text(`-${formatCurrency(sale.discount_amount)}`, 195, y, { align: 'right' });
            }
            y += 8;
            doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.rect(summaryX - 5, y - 5.5, 75, 11, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('TOTAL FINAL', summaryX, y + 1.5);
            doc.setFontSize(12);
            doc.text(formatCurrency(sale.total_amount || 0), 195, y + 1.5, { align: 'right' });

            y += 18;

            // 6. Tracking Box
            doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
            doc.setFillColor(colors.lightGray[0], colors.lightGray[1], colors.lightGray[2]);
            doc.roundedRect(15, y - 5, 180, 22, 1, 1, 'FD');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
            doc.text('NOTAS Y SEGUIMIENTO', 20, y);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            const instruction = [
                `Referencia de seguimiento única: [ ${sale.reference_code || '---'} ]`,
                'Para cualquier consulta o reclamo, mencione este código de referencia.',
                'Este documento es un comprobante de control comercial interno.'
            ];
            doc.text(instruction, 20, y + 5);

            // Footer
            const footerY = 285;
            doc.setFontSize(7);
            doc.setTextColor(180, 180, 180);
            doc.text('Comprobante digital no válido como factura fiscal.', 105, footerY, { align: 'center' });
            doc.text(`Operación gestionada mediante GESTIO - ${formatDateTime(new Date().toISOString())}`, 105, footerY + 3.5, { align: 'center' });

            // 3. Save to Desktop automatically
            const desktopPath = await (window as any).electronAPI.utils.getDesktopPath();
            const fileName = `Factura-${invoice.invoice_number}.pdf`;
            const filePath = `${desktopPath}\\${fileName}`;

            const pdfBuffer = doc.output('arraybuffer');
            const success = await (window as any).electronAPI.utils.saveFile(filePath, pdfBuffer);

            if (success) {
                toast.success(`Factura guardada en el Escritorio: ${fileName}`, {
                    action: {
                        label: 'Abrir',
                        onClick: () => (window as any).electronAPI.showItemInFolder(filePath)
                    }
                });
            } else {
                // Fallback to standard download if auto-save fails
                doc.save(fileName);
                toast.success('Factura descargada (auto-guardado falló)');
            }
        } catch (error) {
            console.error('Error rendering PDF:', error);
            toast.error('Error al generar el PDF de la factura');
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const handleSendWhatsApp = (invoice: Invoice) => {
        if (!invoice.customer_phone) {
            toast.error('El cliente no tiene un teléfono registrado');
            return;
        }

        const message = `Hola ${invoice.customer_name || 'Cliente'}, te adjunto la factura por tu compra. ¡Muchas gracias!`;
        const encodedMessage = encodeURIComponent(message);
        const digits = invoice.customer_phone.replace(/\D/g, '');
        const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${encodedMessage}`;
        const webUrl = `https://web.whatsapp.com/send?phone=+54${digits}&text=${encodedMessage}`;

        if ((window as any).electronAPI) {
            (window as any).electronAPI.openExternal(nativeUrl).catch(() => {
                (window as any).electronAPI.openExternal(webUrl);
            });
        } else {
            window.open(webUrl, '_blank');
        }
    };

    const exportToExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Facturas');

            worksheet.columns = [
                { header: 'Nro Factura', key: 'invoice_number', width: 15 },
                { header: 'Fecha', key: 'created_at', width: 20 },
                { header: 'Cliente', key: 'customer_name', width: 30 },
                { header: 'Monto Total', key: 'total_amount', width: 15 },
                { header: 'Estado', key: 'status', width: 15 },
            ];

            filteredInvoices.forEach(inv => {
                worksheet.addRow({
                    invoice_number: inv.invoice_number,
                    created_at: inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '',
                    customer_name: inv.customer_name || 'N/A',
                    total_amount: inv.total_amount || 0,
                    status: inv.status
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `facturas-${new Date().toISOString().split('T')[0]}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);

            toast.success('Reporte Excel generado correctamente');
        } catch (error) {
            console.error('Error exporting to excel:', error);
            toast.error('Error al generar reporte Excel');
        }
    };

    return (
        <DashboardLayout>
            <div className="p-8">
                {/* Actions Toolbar */}
                <div className="mb-8 flex items-center justify-between bg-card/40 backdrop-blur-md p-4 rounded-3xl border border-border/40 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-2xl">
                            <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-tight">Gestión de Facturas</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider opacity-70">
                                    {invoices.length} Comprobantes Emitidos
                                </p>
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <p className="text-[11px] text-primary font-bold uppercase tracking-wider">
                                    +{stats.recent} Nuevos (30d)
                                </p>
                                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <p className="text-[11px] text-emerald-500 font-bold uppercase tracking-wider">
                                    Total: ${stats.totalAmount.toLocaleString('es-AR')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 items-center">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar factura..."
                                className="pl-9 h-11 bg-white/5 border-white/10 focus-visible:ring-primary/20 rounded-xl text-xs"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="h-11 gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl text-xs font-medium">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <span>{statusFilter ? `Estado: ${statusFilter}` : 'Filtrar'}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-background/95 backdrop-blur-md border-white/10">
                                <DropdownMenuItem onClick={() => setStatusFilter(null)}>Todos los estados</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('emitted')}>Emitida</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('sent')}>Enviada</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('paid')}>Pagada</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setStatusFilter('cancelled')}>Cancelada</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                            variant="outline"
                            className="h-11 gap-2 bg-white/5 border-white/10 hover:bg-white/10 rounded-xl text-xs font-medium"
                            onClick={exportToExcel}
                            disabled={filteredInvoices.length === 0}
                        >
                            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                            <span>Exportar</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 hover:bg-white/10 rounded-xl"
                            onClick={loadInvoices}
                        >
                            <RefreshCw className={cn("h-4 w-4 text-muted-foreground", isLoading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Invoices List */}
                {isLoading && invoices.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse border border-white/10" />
                        ))}
                    </div>
                ) : filteredInvoices.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredInvoices.map(invoice => (
                            <InvoiceCard
                                key={invoice.id}
                                invoice={invoice}
                                onDownload={handleDownloadPDF}
                                onSendWhatsApp={handleSendWhatsApp}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-card/20 backdrop-blur-sm rounded-3xl border border-dashed border-border/40">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-4">
                            <Receipt className="h-10 w-10 text-primary/20" />
                        </div>
                        <h3 className="text-xl font-semibold">No se encontraron facturas</h3>
                        <p className="text-muted-foreground mt-2 max-w-sm">
                            Aún no has emitido facturas para tus ventas o los filtros aplicados no coinciden.
                        </p>
                        {(searchTerm || statusFilter) && (
                            <Button
                                variant="link"
                                className="mt-4 text-primary font-bold uppercase tracking-widest text-xs"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter(null);
                                }}
                            >
                                Limpiar filtros
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
