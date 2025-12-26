'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  User,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Printer,
  Download,
  Copy,
  Phone,
  Mail,
  MapPin,
  Search,
  AlertCircle,
  Receipt,
  FileCheck
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { Sale, Customer, SaleItem, Installment, Invoice } from '@/lib/database-operations';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/config/locale';

interface SaleDetailModalProps {
  sale: Sale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (sale: Sale) => void;
}

function formatDate(dateString: string): string {
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

function getPaymentStatusBadge(status: Sale['payment_status']) {
  if (status === 'paid') {
    return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Pagada</Badge>;
  } else if (status === 'overdue') {
    return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">Vencida</Badge>;
  } else {
    return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Pendiente</Badge>;
  }
}

function getPaymentTypeBadge(type: Sale['payment_type']) {
  if (type === 'cash') {
    return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20">Contado</Badge>;
  } else {
    return <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20">Cuotas</Badge>;
  }
}

function getPaymentMethodLabel(method: Sale['payment_method'] | string | undefined) {
  if (method === 'bank_transfer') return 'Transferencia';
  if (method === 'cash') return 'Efectivo';
  if (method === 'credit_card') return 'Tarjeta de Crédito';
  if (method === 'debit_card') return 'Tarjeta de Débito';
  if (method === 'check') return 'Cheque';
  return 'N/A';
}

function getStatusBadge(status: Sale['status']) {
  if (status === 'completed') {
    return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Completada</Badge>;
  } else {
    return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-500/20">Pendiente</Badge>;
  }
}

function getInstallmentStatusBadge(status: Installment['status'], isOverdue: boolean) {
  if (status === 'paid') {
    return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">Pagada</Badge>;
  } else if (isOverdue || status === 'overdue') {
    return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20">Vencida</Badge>;
  } else {
    return <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20">Pendiente</Badge>;
  }
}



function getInstallmentStatusLabel(status: Installment['status']): string {
  if (status === 'paid') return 'Pagada';
  if (status === 'overdue') return 'Vencida';
  return 'Pendiente';
}

export function SaleDetailModal({ sale, open, onOpenChange, onEdit }: SaleDetailModalProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTransactions, setDetailTransactions] = useState<any[]>([]);
  const [detailInstallment, setDetailInstallment] = useState<Installment | null>(null);
  const [detailPopoverId, setDetailPopoverId] = useState<number | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<Invoice | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };


  const loadSaleDetails = useCallback(async () => {
    if (!sale) return;

    setIsLoading(true);
    try {


      if (sale.customer_id) {
        const customerData = await window.electronAPI.database.customers.getById(sale.customer_id);
        setCustomer(customerData);
      }



      try {
        if (window.electronAPI.database.saleItems) {
          const items = await window.electronAPI.database.saleItems.getBySale(sale.id!);
          setSaleItems(items);
        }
      } catch (error) {
        console.warn('Sale items API not available:', error);
        setSaleItems([]);
      }
      if (sale.payment_type === 'installments') {
        const installmentData = await window.electronAPI.database.installments.getBySale(sale.id!);
        setInstallments(installmentData);
      }

      // Load invoice if exists
      if (window.electronAPI.database.invoices) {
        const invoice = await window.electronAPI.database.invoices.getBySaleId(sale.id!);
        setExistingInvoice(invoice);
      }
    } catch (error) {
      console.error('Error loading sale details:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sale]);

  useEffect(() => {
    if (sale && open && typeof window !== 'undefined' && window.electronAPI) {
      loadSaleDetails();
    }
  }, [sale, open, loadSaleDetails]);



  const openInstallmentDetails = async (inst: Installment) => {
    try {
      const tx = await window.electronAPI.database.payments.getBySale(inst.sale_id);
      const related = (tx || [])
        .filter((t: any) => t.installment_id === inst.id && t.status === 'completed')
        .sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());
      const dedup = [] as any[];
      const seen = new Set<string>();
      for (const t of related) {
        const key = `${t.transaction_date}|${t.amount}|${t.payment_method}|${t.payment_reference || ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dedup.push(t);
      }
      setDetailTransactions(dedup.slice(0, 5));
      setDetailInstallment(inst);
      setDetailPopoverId(inst.id!);
    } catch {
      setDetailTransactions([]);
      setDetailInstallment(inst);
      setDetailPopoverId(inst.id!);
    }
  };

  const handleWhatsAppShare = () => {
    if (!sale) return;
    if (!sale) return;

    // Check phone availability early
    if (!customer?.phone) {
      toast.error('El cliente no tiene un teléfono registrado para WhatsApp');
      return;
    }

    const formatAmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n);
    const dateStr = formatDate(sale.date);

    const productName = saleItems.length > 0
      ? (saleItems.length === 1 ? saleItems[0].product_name : `sus productos (${saleItems.length})`)
      : 'sus productos';

    const customerName = customer?.name || 'Cliente';

    let body = '';
    if (sale.payment_type === 'installments') {
      body = `Hola ${customerName}, te adjunto la factura con las cuotas actualizadas. Muchas gracias!`;
    } else {
      body = `Hola ${customerName}, te adjunto la factura por tu compra de ${productName}. Muchas gracias!`;
    }

    const text = encodeURIComponent(body);
    const digits = (customer?.phone || '').replace(/\D/g, '');
    const nativeUrl = `whatsapp://send?phone=+54${digits}&text=${text}`;
    const webUrl = `https://web.whatsapp.com/send?phone=+54${digits}&text=${text}`;

    if (typeof window !== 'undefined' && (window as any).electronAPI?.openExternal) {
      (window as any).electronAPI.openExternal(nativeUrl).catch(() => {
        (window as any).electronAPI.openExternal(webUrl);
      });
    } else {
      window.open(webUrl, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmitInvoice = async (): Promise<Invoice | null> => {
    if (!sale) return null;
    setIsGeneratingInvoice(true);
    try {
      const nextNumber = await window.electronAPI.database.invoices.getNextInvoiceNumber();
      const invoiceData = {
        sale_id: sale.id!,
        customer_id: sale.customer_id,
        invoice_number: nextNumber,
        total_amount: sale.total_amount,
        status: 'emitted' as const,
      };

      const newInvoice = await window.electronAPI.database.invoices.create(invoiceData);
      toast.success(`Factura ${nextNumber} emitida correctamente`);

      // Reload details to show the invoice
      await loadSaleDetails();

      // Return the new invoice to be used immediately
      return { ...invoiceData, id: newInvoice };
    } catch (error) {
      console.error('Error emitting invoice:', error);
      toast.error('Error al emitir la factura');
      return null;
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleInvoiceAction = async () => {
    if (!sale) return;

    if (existingInvoice) {
      // Redirect to invoices page with highlight
      router.push(`/invoices?highlight=${existingInvoice.id}`);
      onOpenChange(false);
      return;
    }

    // Auto-emit invoice
    setIsGeneratingInvoice(true);
    try {
      await handleEmitInvoice();
      toast.success('Factura generada correctamente');
    } catch (error) {
      console.error('Error auto-emitting invoice:', error);
      toast.error('Error al generar la factura');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();

      const periodLabel = sale?.payment_type === 'installments' ? (sale?.period_type === 'weekly' ? 'Semanal (1 y 15)' : 'Mensual') : 'N/A';

      // Sale Details Sheet
      const saleSheet = workbook.addWorksheet('Detalle de Venta');
      saleSheet.columns = [
        { header: 'Referencia', key: 'referencia', width: 16 },
        { header: 'Número de Venta', key: 'numero', width: 14 },
        { header: 'Fecha', key: 'fecha', width: 22 },
        { header: 'Cliente', key: 'cliente', width: 14 },
        { header: 'Teléfono', key: 'telefono', width: 18 },
        { header: 'Teléfono secundario', key: 'telefono2', width: 28 },
        { header: 'Dirección', key: 'direccion', width: 12 },
        { header: 'Subtotal', key: 'subtotal', width: 12 },
        { header: 'Total', key: 'total', width: 18 },
        { header: 'Método de Pago', key: 'metodo_pago', width: 18 },
        { header: 'Método de cobro', key: 'metodo_cobro', width: 14 },
        { header: 'Periodo', key: 'periodo', width: 18 },
        { header: 'Estado de Pago', key: 'estado_pago', width: 18 },
        { header: 'Estado', key: 'estado', width: 12 },
        { header: 'Notas', key: 'notas', width: 40 }
      ];

      saleSheet.addRow({
        referencia: sale?.reference_code ?? sale?.sale_number ?? 'N/A',
        numero: sale?.sale_number ?? 'N/A',
        fecha: sale?.date ? formatDate(sale.date) : 'N/A',
        cliente: customer?.name || 'N/A',
        telefono: customer?.phone || 'N/A',
        telefono2: customer?.secondary_phone || 'N/A',
        direccion: customer?.address || 'N/A',
        subtotal: sale?.subtotal ?? 0,
        total: sale?.total_amount ?? 0,
        metodo_pago: sale?.payment_type === 'cash' ? 'Al Contado' : 'Cuotas',
        metodo_cobro: sale?.payment_method ? getPaymentMethodLabel(sale.payment_method) : 'N/A',
        periodo: periodLabel,
        estado_pago: sale?.payment_status === 'paid' ? 'Pagada' : sale?.payment_status === 'overdue' ? 'Vencida' : 'Pendiente',
        estado: sale?.status === 'completed' ? 'Completada' : 'Pendiente',
        notas: sale?.notes || ''
      });

      // Products Sheet
      if (saleItems.length > 0) {
        const productsSheet = workbook.addWorksheet('Productos');
        productsSheet.columns = [
          { header: 'Producto', key: 'producto', width: 28 },
          { header: 'Cantidad', key: 'cantidad', width: 10 },
          { header: 'Precio Unitario', key: 'precio', width: 14 },
          { header: 'Total', key: 'total', width: 14 }
        ];

        saleItems.forEach(item => {
          productsSheet.addRow({
            producto: item.product_name || 'Producto',
            cantidad: item.quantity,
            precio: item.unit_price,
            total: item.line_total
          });
        });
      }

      // Installments Sheet
      let latestInstallments: Installment[] = installments;
      if (sale?.payment_type === 'installments' && typeof window !== 'undefined' && (window as any).electronAPI?.database?.installments && sale?.id) {
        try {
          latestInstallments = await (window as any).electronAPI.database.installments.getBySale(sale.id);
        } catch (e) {
          console.warn('No se pudieron obtener cuotas actualizadas para Excel, usando estado actual.', e);
        }
      }

      if (latestInstallments.length > 0) {
        const installmentsSheet = workbook.addWorksheet('Cuotas');
        installmentsSheet.columns = [
          { header: 'Cuota', key: 'cuota', width: 8 },
          { header: 'Fecha', key: 'fecha', width: 14 },
          { header: 'Monto', key: 'monto', width: 12 },
          { header: 'Pagado', key: 'pagado', width: 12 },
          { header: 'Balance', key: 'balance', width: 12 },
          { header: 'Estado', key: 'estado', width: 12 }
        ];

        latestInstallments.forEach(installment => {
          const displayDate = (installment.status === 'paid' && installment.paid_date)
            ? installment.paid_date
            : installment.due_date;

          installmentsSheet.addRow({
            cuota: installment.installment_number,
            fecha: formatDate(displayDate),
            monto: installment.amount,
            pagado: installment.paid_amount,
            balance: installment.balance,
            estado: installment.status
          });
        });
      }

      // Summary Sheet
      const productsTotal = saleItems.reduce((sum: number, i: SaleItem) => sum + (i.line_total || 0), 0);
      const installmentsTotal = installments.reduce((sum: number, i: Installment) => sum + (i.amount || 0), 0);

      const summarySheet = workbook.addWorksheet('Resumen');
      summarySheet.columns = [
        { header: 'Concepto', key: 'concepto', width: 24 },
        { header: 'Valor', key: 'valor', width: 16 }
      ];

      summarySheet.addRow({ concepto: 'Subtotal', valor: sale?.subtotal ?? 0 });
      summarySheet.addRow({ concepto: 'Total', valor: sale?.total_amount ?? 0 });
      summarySheet.addRow({ concepto: 'Productos (total $)', valor: productsTotal });
      summarySheet.addRow({ concepto: 'Cuotas (total $)', valor: installmentsTotal });
      summarySheet.addRow({ concepto: 'Productos (cantidad)', valor: saleItems.length });
      summarySheet.addRow({ concepto: 'Cuotas (cantidad)', valor: installments.length });

      // Save file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sale?.sale_number ?? 'unknown'}-${new Date().toISOString().split('T')[0]}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('Error al exportar los datos de la venta a Excel');
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl antialiased w-[95vw] lg:w-full max-h-[90vh] lg:h-auto overflow-hidden p-0 rounded-xl border-none shadow-2xl bg-background/90 backdrop-blur-xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {sale.items && sale.items.length > 0 ? sale.items[0].product_name : 'Venta'}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-0.5 text-xs font-medium uppercase tracking-widest opacity-60">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(sale.date)}
                  {sale.reference_code && (
                    <>
                      <span>•</span>
                      <span>Ref: {sale.reference_code}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={handleWhatsAppShare} className="h-9 w-9 text-green-600 hover:bg-green-500/10 hover:text-green-700">
                  <MessageCircle className="w-5 h-5" />
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleInvoiceAction}
                        className={cn(
                          "h-9 w-9 transition-all",
                          existingInvoice ? "text-emerald-600 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-primary"
                        )}
                      >
                        {existingInvoice ? <FileCheck className="w-5 h-5" /> : <FileText className="w-4 h-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{existingInvoice ? 'Ver Factura' : 'Emitir Factura'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button variant="ghost" size="icon" onClick={handleExportToExcel} className="h-9 w-9 text-muted-foreground hover:text-primary">
                  <FileText className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6 custom-scrollbar">
          <div className="space-y-6">
            {/* Status and Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estado de Pago</span>
                </div>
                <div className="flex items-center justify-between">
                  {getPaymentStatusBadge(sale.payment_status)}
                  {sale.due_date && sale.payment_status !== 'paid' && (
                    <span className="text-[10px] font-bold text-red-500/80">Vence: {formatDate(sale.due_date)}</span>
                  )}
                </div>
              </div>

              <div className="bg-primary/5 backdrop-blur-md p-4 rounded-xl border border-primary/10 shadow-sm space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Total Venta</span>
                </div>
                <div className="text-2xl font-black tracking-tight tabular-nums text-primary">{formatCurrency(sale.total_amount)}</div>

                {existingInvoice && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Receipt className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Factura: {existingInvoice.invoice_number}</span>
                  </div>
                )}
              </div>

              <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Método</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getPaymentTypeBadge(sale.payment_type)}
                  {sale.payment_method && (
                    <Badge variant="outline" className="bg-background/50 border-border/40 text-xs">{getPaymentMethodLabel(sale.payment_method)}</Badge>
                  )}
                </div>
              </div>
            </div>

            <Tabs defaultValue="details" className="w-full">
              <TabsList className="flex w-full overflow-x-auto bg-muted/20 p-1 rounded-xl border border-border/40 gap-1 h-auto mb-6">
                <TabsTrigger value="details" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 text-xs font-bold uppercase tracking-widest">Detalles</TabsTrigger>
                <TabsTrigger value="customer" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 text-xs font-bold uppercase tracking-widest">Cliente</TabsTrigger>
                <TabsTrigger value="items" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 text-xs font-bold uppercase tracking-widest">Productos</TabsTrigger>
                {sale.payment_type === 'installments' && (
                  <TabsTrigger value="installments" className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm py-2 text-xs font-bold uppercase tracking-widest">Cuotas</TabsTrigger>
                )}
              </TabsList>

              {/* Sale Details Tab */}
              <TabsContent value="details" className="space-y-4 outline-none">
                <div className="bg-card/40 backdrop-blur-md p-6 rounded-xl border border-border/40 shadow-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Información de la Venta</h3>
                  </div>

                  <div className="grid gap-8 md:grid-cols-2">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Número de Venta</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">{sale.sale_number}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => copyToClipboard(sale.sale_number, 'sale_number')}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fecha de Venta</span>
                        <span className="text-sm font-semibold">{formatDate(sale.date)}</span>
                      </div>
                      {sale.due_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vencimiento</span>
                          <span className="text-sm font-semibold text-red-500">{formatDate(sale.due_date)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Estado</span>
                        {getStatusBadge(sale.status)}
                      </div>
                      {sale.payment_type === 'installments' && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Periodicidad</span>
                          <span className="text-sm font-semibold italic text-primary">
                            {sale.period_type === 'weekly' ? 'Semanal' : sale.period_type === 'biweekly' ? 'Quincenal' : 'Mensual'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 bg-muted/20 rounded-xl border border-border/20 space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold uppercase tracking-widest text-muted-foreground">Subtotal de Ítems</span>
                          <span className="font-bold">{formatCurrency(sale.subtotal)}</span>
                        </div>
                        {sale.discount_amount ? (
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold uppercase tracking-widest text-red-500/70">Descuento Aplicado</span>
                            <span className="font-bold text-red-500">-{formatCurrency(sale.discount_amount)}</span>
                          </div>
                        ) : null}
                        <div className="h-px bg-border/40" />
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black uppercase tracking-widest text-primary">Total Final</span>
                          <span className="text-lg font-black text-primary tabular-nums">{formatCurrency(sale.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sale.notes && (
                    <div className="space-y-2 pt-4 mt-4 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Notas Internas</span>
                      </div>
                      <p className="text-xs font-medium leading-relaxed text-muted-foreground p-4 bg-muted/10 rounded-xl border border-border/20 italic">
                        &quot;{sale.notes}&quot;
                      </p>
                    </div>
                  )}

                  {(sale.created_at || sale.updated_at) && (
                    <div className="pt-4 border-t border-border/40">
                      <div className="grid grid-cols-2 gap-4">
                        {sale.created_at && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Registro</span>
                            <span className="text-[10px] font-medium opacity-60">{formatDateTime(sale.created_at)}</span>
                          </div>
                        )}
                        {sale.updated_at && (
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">Última Modif.</span>
                            <span className="text-[10px] font-medium opacity-60">{formatDateTime(sale.updated_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Customer Tab */}
              <TabsContent value="customer" className="space-y-4 outline-none">
                <div className="bg-card/40 backdrop-blur-md p-6 rounded-xl border border-border/40 shadow-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Información del Cliente</h3>
                  </div>

                  {isLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-24 w-full rounded-xl" />
                    </div>
                  ) : customer ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-xl border border-primary/10 transition-all hover:bg-primary/10">
                        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <User className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight">{customer.name}</h3>
                          {customer.dni && (
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">DNI: {customer.dni}</span>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                          {customer.phone && (
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40 group hover:bg-muted/40 transition-colors">
                              <Phone className="w-4 h-4 text-primary" />
                              <div className="flex-1">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teléfono Principal</span>
                                <span className="text-sm font-semibold">{customer.phone}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => copyToClipboard(customer.phone!, 'phone')}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                          {customer.secondary_phone && (
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40 group hover:bg-muted/40 transition-colors">
                              <Phone className="w-4 h-4 text-primary" />
                              <div className="flex-1">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teléfono Alternativo</span>
                                <span className="text-sm font-semibold">{customer.secondary_phone}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => copyToClipboard(customer.secondary_phone!, 'secondary_phone')}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {customer.address && (
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40 group hover:bg-muted/40 transition-colors">
                              <MapPin className="w-4 h-4 text-primary" />
                              <div className="flex-1">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dirección</span>
                                <span className="text-sm font-semibold">{customer.address}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all"
                                onClick={() => copyToClipboard(customer.address!, 'address')}
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                          {customer.email && (
                            <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-xl border border-border/40 group hover:bg-muted/40 transition-colors">
                              <Mail className="w-4 h-4 text-primary" />
                              <div className="flex-1">
                                <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail</span>
                                <span className="text-sm font-semibold lowercase">{customer.email}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {customer.notes && (
                        <div className="space-y-2 pt-4 border-t border-border/40">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Notas del Cliente</span>
                          </div>
                          <p className="text-xs font-medium leading-relaxed text-muted-foreground p-4 bg-muted/10 rounded-xl border border-border/20 italic">
                            &quot;{customer.notes}&quot;
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/10 rounded-xl border border-border/20 border-dashed">
                      <User className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">No se encontró información del cliente</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-4 outline-none">
                <div className="bg-card/40 backdrop-blur-md p-6 rounded-xl border border-border/40 shadow-sm space-y-6">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Productos en esta Venta</h3>
                  </div>

                  {isLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : saleItems.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-border/40 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/40">
                              <TableHead className="text-xs font-bold uppercase tracking-widest h-10">Producto</TableHead>
                              <TableHead className="text-center text-xs font-bold uppercase tracking-widest h-10">Cant.</TableHead>
                              <TableHead className="text-right text-xs font-bold uppercase tracking-widest h-10">Precio Unit.</TableHead>
                              <TableHead className="text-right text-xs font-bold uppercase tracking-widest h-10">Subtotal</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {saleItems.map((item, index) => (
                              <TableRow key={item.id || index} className="hover:bg-primary/5 transition-colors border-border/20">
                                <TableCell className="font-bold text-sm tracking-tight py-4">
                                  {item.product_name || `Producto ID: ${item.product_id}`}
                                </TableCell>
                                <TableCell className="text-center font-bold tabular-nums">
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="text-right font-medium tabular-nums text-muted-foreground">
                                  {formatCurrency(item.unit_price)}
                                </TableCell>
                                <TableCell className="text-right font-black tabular-nums text-primary">
                                  {formatCurrency(item.line_total)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end pt-4">
                        <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 text-right min-w-[200px] space-y-1">
                          <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Subtotal Productos</span>
                          <div className="text-xl font-black text-primary tabular-nums">
                            {formatCurrency(sale.subtotal)}
                          </div>
                          <span className="block text-[10px] font-medium opacity-40 italic">
                            {saleItems.reduce((sum, item) => sum + item.quantity, 0)} items en total
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/10 rounded-xl border border-border/20 border-dashed">
                      <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">No hay productos registrados</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Installments Tab */}
              {sale.payment_type === 'installments' && (
                <TabsContent value="installments" className="space-y-4 outline-none">
                  <div className="bg-card/40 backdrop-blur-md p-6 rounded-xl border border-border/40 shadow-sm space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Cronograma de Pagos</h3>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/5 px-3 py-1 rounded-full border border-primary/10">
                        {sale.number_of_installments} Pagos de {formatCurrency(Math.round(sale.installment_amount || 0))}
                      </div>
                    </div>

                    {isLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full rounded-xl" />
                        ))}
                      </div>
                    ) : installments.length > 0 ? (
                      <div className="rounded-xl border border-border/40 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/40">
                              <TableHead className="text-xs font-bold uppercase tracking-widest h-10">#</TableHead>
                              <TableHead className="text-xs font-bold uppercase tracking-widest h-10">Vencimiento</TableHead>
                              <TableHead className="text-right text-xs font-bold uppercase tracking-widest h-10">Monto</TableHead>
                              <TableHead className="text-center text-xs font-bold uppercase tracking-widest h-10">Estado</TableHead>
                              <TableHead className="text-center text-xs font-bold uppercase tracking-widest h-10">Pago</TableHead>
                              <TableHead className="text-right text-xs font-bold uppercase tracking-widest h-10">Acción</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {installments.map((installment, index) => {
                              const isOverdue = installment.status === 'pending' &&
                                new Date(installment.due_date) < new Date();

                              return (
                                <TableRow key={installment.id || index} className="hover:bg-primary/5 transition-colors border-border/20">
                                  <TableCell className="font-bold py-4">
                                    {installment.installment_number}
                                  </TableCell>
                                  <TableCell>
                                    <div className={cn(
                                      "text-sm font-semibold tracking-tight",
                                      isOverdue ? "text-red-500" : "text-foreground"
                                    )}>
                                      {formatDate(installment.due_date)}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-black tabular-nums">
                                    {formatCurrency(installment.amount)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {getInstallmentStatusBadge(installment.status, isOverdue)}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {installment.paid_date ? (
                                      <span className="text-xs font-bold text-green-600 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                                        {formatDate(installment.paid_date)}
                                      </span>
                                    ) : (
                                      <span className="text-xs font-bold opacity-20 uppercase tracking-widest">Pendiente</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <Popover
                                      open={detailPopoverId === (installment.id || 0)}
                                      onOpenChange={(open) => {
                                        if (open) {
                                          openInstallmentDetails(installment);
                                        } else {
                                          setDetailPopoverId(null);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary">
                                          <Search className="h-4 w-4" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[300px] p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-background/95 backdrop-blur-md" side="left" align="end">
                                        <div className="bg-primary/10 p-3 border-b border-primary/10">
                                          <div className="text-xs font-black uppercase tracking-widest text-primary">Historial de Pagos</div>
                                          <div className="text-[10px] font-bold opacity-60">Cuota #{detailInstallment?.installment_number} • {formatCurrency(detailInstallment?.amount || 0)}</div>
                                        </div>
                                        <div className="p-3">
                                          {detailTransactions.length === 0 ? (
                                            <div className="flex flex-col items-center py-4 opacity-40">
                                              <Clock className="w-8 h-8 mb-2" />
                                              <span className="text-[10px] font-bold uppercase tracking-widest">Sin transacciones</span>
                                            </div>
                                          ) : (
                                            <div className="space-y-3">
                                              {detailTransactions.map((t, i) => (
                                                <div key={t.id || i} className="p-2 bg-muted/20 rounded-lg border border-border/40 space-y-1 transition-colors hover:bg-muted/40">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black italic text-primary">{getPaymentMethodLabel(t.payment_method)}</span>
                                                    <span className="text-[10px] font-bold opacity-60 tabular-nums">{formatDate(t.transaction_date)}</span>
                                                  </div>
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-xs font-bold tabular-nums">{formatCurrency(t.amount)}</span>
                                                    {t.payment_reference && (
                                                      <span className="text-[9px] font-medium opacity-50 truncate max-w-[120px]" title={t.payment_reference}>{t.payment_reference}</span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-muted/10 rounded-xl border border-border/20 border-dashed">
                        <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground/40">No se encontraron cuotas</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        </ScrollArea>
        {detailOpen && detailInstallment && (
          <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Detalle de pago</DialogTitle>
                <DialogDescription>Cuota #{detailInstallment.installment_number}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {detailTransactions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No hay transacciones registradas para esta cuota.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead>Nota</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailTransactions.map((t, i) => (
                        <TableRow key={t.id || i}>
                          <TableCell>{t.payment_method}</TableCell>
                          <TableCell>{formatDate(t.transaction_date)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(t.amount)}</TableCell>
                          <TableCell>{t.payment_reference || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
