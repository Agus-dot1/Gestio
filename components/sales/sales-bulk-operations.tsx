'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { FileText, Download, Trash2, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { Sale } from '@/lib/database-operations';
import { formatCurrency } from '@/config/locale';

interface SalesBulkOperationsProps {
  selectedSales: Set<number>;
  sales: Sale[];
  onBulkDelete: (saleIds: number[]) => Promise<void>;
  onBulkStatusUpdate: (saleIds: number[], status: Sale['payment_status']) => Promise<void>;
  onClearSelection: () => void;
  isLoading?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function getPaymentStatusBadge(status: Sale['payment_status']) {
  const statusConfig = {
    paid: { label: 'Pagado', variant: 'default' as const, icon: CheckCircle },
    partial: { label: 'Parcial', variant: 'secondary' as const, icon: Clock },
    unpaid: { label: 'Pendiente', variant: 'outline' as const, icon: XCircle },
    overdue: { label: 'Vencido', variant: 'destructive' as const, icon: XCircle }
  };
  return statusConfig[status] || statusConfig.unpaid;
}

function getPaymentTypeLabel(type: Sale['payment_type']) {
  const types = {
    cash: 'Efectivo',
    installments: 'Cuotas',
  } as const;
  return types[type] || 'N/A';
}

export function SalesBulkOperations({
  selectedSales,
  sales,
  onBulkDelete,
  onBulkStatusUpdate,
  onClearSelection,
  isLoading = false
}: SalesBulkOperationsProps) {
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<Sale['payment_status'] | ''>('');

  const selectedSalesData = sales.filter(sale => sale.id && selectedSales.has(sale.id));

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedSales);
    await onBulkDelete(selectedIds);
    onClearSelection();
    setShowBulkDeleteDialog(false);
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus) return;

    const selectedIds = Array.from(selectedSales);
    await onBulkStatusUpdate(selectedIds, bulkStatus);
    onClearSelection();
    setBulkStatus('');
  };

  const exportToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const now = new Date();
    const currencyTotal = selectedSalesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const unpaidTotal = selectedSalesData.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const paidTotal = selectedSalesData.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const overdueTotal = selectedSalesData.filter(s => s.payment_status === 'overdue').reduce((sum, s) => sum + (s.total_amount || 0), 0);



    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Reporte de Ventas', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Generado: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 14, 22);
    doc.text(`Total de registros: ${selectedSalesData.length}`, 14, 28);



    doc.setFontSize(10);
    doc.text(`Total general: ${formatCurrency(currencyTotal)}`, 120, 16);
    doc.text(`Pendiente: ${formatCurrency(unpaidTotal)}`, 120, 22);
    doc.text(`Pagado: ${formatCurrency(paidTotal)}`, 120, 28);
    doc.text(`Vencido: ${formatCurrency(overdueTotal)}`, 120, 34);



    const tableData = selectedSalesData.map(sale => [
      sale.reference_code || sale.sale_number,
      formatDate(sale.date),
      sale.customer_name || 'N/A',
      getPaymentTypeLabel(sale.payment_type) ?? 'N/A',
      getPaymentStatusBadge(sale.payment_status).label,
      formatCurrency(sale.total_amount),
    ]);

    autoTable(doc, {
      head: [['Referencia', 'Fecha', 'Cliente', 'Método', 'Estado', 'Total']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 24 },
        2: { cellWidth: 45 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24, halign: 'right' }
      },
      didDrawPage: (data: any) => {
        const str = `Página ${(doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc as any).internal?.pages?.length || 1}`;
        doc.setFontSize(9);
        doc.text(str, data.settings.margin.left, (doc as any).internal.pageSize.getHeight() - 8);
      },
      foot: [[
        '', '', '', '', 'Total general', formatCurrency(currencyTotal)
      ]],
      footStyles: { fillColor: [245, 245, 245], textColor: 20, fontStyle: 'bold' }
    });

    doc.save(`ventas_${now.toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Main sales worksheet
    const worksheet = workbook.addWorksheet('Ventas');

    // Define columns
    worksheet.columns = [
      { header: 'N° Venta', key: 'sale_number', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 24 },
      { header: 'Método de Pago', key: 'metodo', width: 16 },
      { header: 'Estado de Pago', key: 'estado', width: 16 },
      { header: 'Subtotal', key: 'subtotal', width: 12 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Cuotas', key: 'cuotas', width: 8 },
      { header: 'Monto Cuota', key: 'monto_cuota', width: 12 },
      { header: 'Notas', key: 'notas', width: 40 },
    ];

    // Add rows
    selectedSalesData.forEach(sale => {
      worksheet.addRow({
        sale_number: sale.sale_number,
        fecha: new Date(sale.date).toISOString().split('T')[0],
        cliente: sale.customer_name || 'N/A',
        metodo: getPaymentTypeLabel(sale.payment_type) ?? 'N/A',
        estado: getPaymentStatusBadge(sale.payment_status).label,
        subtotal: sale.subtotal ?? 0,
        total: sale.total_amount ?? 0,
        cuotas: sale.number_of_installments ?? '',
        monto_cuota: sale.installment_amount ?? '',
        notas: sale.notes ?? ''
      });
    });

    // Add summary worksheet
    const total = selectedSalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const unpaid = selectedSalesData.filter(s => s.payment_status === 'unpaid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const paid = selectedSalesData.filter(s => s.payment_status === 'paid').reduce((sum, s) => sum + (s.total_amount || 0), 0);
    const overdue = selectedSalesData.filter(s => s.payment_status === 'overdue').reduce((sum, s) => sum + (s.total_amount || 0), 0);

    const summarySheet = workbook.addWorksheet('Resumen');
    summarySheet.columns = [
      { header: 'Concepto', key: 'concepto', width: 20 },
      { header: 'Monto', key: 'monto', width: 15 }
    ];

    summarySheet.addRow({ concepto: 'Total general', monto: total });
    summarySheet.addRow({ concepto: 'Pendiente', monto: unpaid });
    summarySheet.addRow({ concepto: 'Pagado', monto: paid });
    summarySheet.addRow({ concepto: 'Vencido', monto: overdue });

    // Save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ventas_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (selectedSales.size === 0) {
    return null;
  }

  return (
    <>
      <div className="flex items-center gap-2 animate-in fade-in">

        <Button
          variant="outline"
          size="sm"
          onClick={exportToPDF}
          className="h-8"
          disabled={isLoading}
        >
          <FileText className="h-4 w-4 mr-1" />
          PDF
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={exportToExcel}
          className="h-8"
          disabled={isLoading}
        >
          <Download className="h-4 w-4 mr-1" />
          Excel
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
          disabled={isLoading}
        >
          Limpiar selección
        </Button>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          {selectedSales.size} seleccionada{selectedSales.size !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ventas seleccionadas?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente {selectedSales.size} venta{selectedSales.size !== 1 ? 's' : ''} seleccionada{selectedSales.size !== 1 ? 's' : ''}.
              También se eliminarán todas las cuotas y elementos relacionados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-slate-50"
              disabled={isLoading}
            >
              Eliminar {selectedSales.size} venta{selectedSales.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}