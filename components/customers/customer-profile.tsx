'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  FileText,
  Check,
  Package,
  Clock,
  Ban,
  Archive,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import type { Customer, Sale, Installment, SaleItem } from '@/lib/database-operations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatCurrency } from '@/config/locale';

interface CustomerProfileProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onClose: () => void;
}

interface CustomerStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  lastPurchaseDate: string | null;
  firstPurchaseDate: string | null;
}



export function CustomerProfile({ customer, onClose }: CustomerProfileProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeInstallments, setActiveInstallments] = useState<Array<Installment & { sale_number?: string, reference_code?: string }>>([]);
  const [saleItemsBySale, setSaleItemsBySale] = useState<Record<number, SaleItem[]>>({});
  const [salesStatusById, setSalesStatusById] = useState<Record<number, string>>({});
  // If customer.is_active is undefined, assume true (1)
  const [isActive, setIsActive] = useState<boolean>(customer.is_active !== false);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success("Copiado al portapapeles", {
        icon: <Check className="h-4 w-4 text-green-500" />
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleDeactivate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.database && window.electronAPI.database.customers) {
        await window.electronAPI.database.customers.update(customer.id!, { is_active: false });
        setIsActive(false);
        toast.success("Cliente desactivado correctamente");
        onClose();
      } else {
        toast.error("Error de conexión con la base de datos");
      }
    } catch (error) {
      console.error("Error deactivating customer:", error);
      toast.error("Error al desactivar el cliente");
    }
  };

  const handleActivate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.database && window.electronAPI.database.customers) {
        await window.electronAPI.database.customers.update(customer.id!, { is_active: true });
        setIsActive(true);
        toast.success("Cliente reactivado correctamente");
        // No need to close, just update UI state to active
      } else {
        toast.error("Error de conexión con la base de datos");
      }
    } catch (error) {
      console.error("Error activating customer:", error);
      toast.error("Error al activar el cliente");
    }
  };

  useEffect(() => {
    const fetchCustomerData = async () => {
      setIsLoading(true);
      try {
        const allSales = await window.electronAPI.database.sales.getAll();
        const customerSales = allSales.filter(sale => sale.customer_id === customer.id);
        setSales(customerSales);

        if (customerSales.length > 0) {
          const totalRevenue = customerSales.reduce((sum, sale) => sum + sale.total_amount, 0);
          const averageOrderValue = totalRevenue / customerSales.length;
          const sortedSales = customerSales.sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());

          setStats({
            totalSales: customerSales.length,
            totalRevenue,
            averageOrderValue,
            firstPurchaseDate: sortedSales[0]?.created_at || null,
            lastPurchaseDate: sortedSales[sortedSales.length - 1]?.created_at || null
          });
        } else {
          setStats({
            totalSales: 0,
            totalRevenue: 0,
            averageOrderValue: 0,
            firstPurchaseDate: null,
            lastPurchaseDate: null
          });
        }

        const installmentPromises = customerSales
          .filter(sale => sale.payment_type === 'installments')
          .map(sale => window.electronAPI.database.installments.getBySale(sale.id!));
        const installmentsBySale = await Promise.all(installmentPromises);
        const allInstallments = installmentsBySale.flat();
        const detailedInstallments = allInstallments.map(inst => {
          const sale = customerSales.find(s => s.id === inst.sale_id);
          return {
            ...inst,
            sale_number: sale?.sale_number,
            reference_code: sale?.reference_code
          };
        });

        const active = detailedInstallments
          .filter(inst => inst.status === 'pending' || inst.status === 'partial')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
        setActiveInstallments(active);

        const now = new Date();
        const statusMap: Record<number, string> = {};
        for (const sale of customerSales) {
          if (sale.payment_type === 'cash') {
            statusMap[sale.id!] = 'Completada';
            continue;
          }
          const saleInsts = allInstallments.filter(inst => inst.sale_id === sale.id);
          const hasOverdue = saleInsts.some(inst => inst.status === 'overdue' || (new Date(inst.due_date) < now && inst.status !== 'paid'));
          const hasActive = saleInsts.some(inst => inst.status === 'pending' || (inst as any).status === 'partial');
          statusMap[sale.id!] = hasOverdue ? 'Vencida' : (hasActive ? 'Cuotas activas' : 'Completada');
        }
        setSalesStatusById(statusMap);

        if (customerSales.length > 0) {
          const saleItemsPromises = customerSales.map(sale => window.electronAPI.database.saleItems.getBySale(sale.id!));
          const saleItemsResults = await Promise.all(saleItemsPromises);
          const itemsMap: Record<number, SaleItem[]> = {};
          customerSales.forEach((sale, idx) => {
            itemsMap[sale.id!] = (saleItemsResults[idx] || []) as SaleItem[];
          });
          setSaleItemsBySale(itemsMap);
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomerData();
  }, [customer.id]);

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 rounded-xl bg-background/95 backdrop-blur-xl border-none shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Cargando perfil del cliente</DialogTitle>
            <DialogDescription>Espere mientras se obtienen los datos del cliente.</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 rounded-xl bg-background/95 backdrop-blur-xl border-none shadow-2xl">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-8 pb-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-sm">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5">
                <div className={cn("w-4 h-4 rounded-full border-2 border-background", isActive ? "bg-green-500" : "bg-gray-400")} />
              </div>
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold tracking-tight text-foreground">
                {customer.name}
              </DialogTitle>
              <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-2">
                <span>Cliente #{customer.id}</span>
                <span>•</span>
                <span>Registrado: {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}</span>
                {!isActive && <span className="text-red-500 ml-2">• INACTIVO</span>}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-4 md:mt-0 flex gap-2">
            {isActive ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="rounded-lg text-xs font-bold uppercase tracking-wide opacity-80 hover:opacity-100">
                    <Ban className="w-3.5 h-3.5 mr-2" /> Desactivar Cliente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desactivar este cliente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción marcará al cliente como inactivo. No se eliminarán sus datos ni su historial, pero no aparecerá en las búsquedas principales.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-lg">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeactivate} className="rounded-lg bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={handleActivate} variant="default" size="sm" className="rounded-lg text-xs font-bold uppercase tracking-wide bg-green-600 hover:bg-green-700 text-white">
                <RotateCcw className="w-3.5 h-3.5 mr-2" /> Reactivar Cliente
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-140px)]">
          <div className="p-8 space-y-10">

            {/* Quick Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Ventas', value: stats.totalSales, icon: ShoppingCart, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Ingresos', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'Ticket Promedio', value: formatCurrency(stats.averageOrderValue), icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { label: 'Última Compra', value: stats.lastPurchaseDate ? new Date(stats.lastPurchaseDate).toLocaleDateString() : '-', icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn("p-1.5 rounded-md", stat.bg)}>
                        <stat.icon className={cn("h-4 w-4", stat.color)} />
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{stat.label}</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">{stat.value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Left Column: Contact & Info */}
              <div className="lg:col-span-1 space-y-8">

                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                    <User className="h-4 w-4" /> Información de Contacto
                  </h4>

                  <div className="space-y-3">
                    {[
                      { icon: Phone, label: 'Teléfono', value: customer.phone, key: 'phone' },
                      { icon: Phone, label: 'Secundario', value: customer.secondary_phone, key: 'secondary_phone' },
                      { icon: Mail, label: 'Email', value: customer.email, key: 'email' },
                      { icon: MapPin, label: 'Dirección', value: customer.address, key: 'address' },
                    ].map((item, i) => (
                      item.value ? (
                        <div
                          key={i}
                          onClick={() => copyToClipboard(item.value!, item.key)}
                          className="group flex items-start gap-4 p-3 rounded-xl border border-border/40 bg-card/40 hover:bg-card/80 hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
                        >
                          <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/10 transition-colors shrink-0">
                            <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-0.5">{item.label}</p>
                            <p className="text-sm font-medium truncate">{item.value}</p>
                          </div>
                          {copiedField === item.key && (
                            <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Copiado
                              </span>
                            </div>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>

                {customer.notes && (
                  <div className="space-y-4">
                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                      <FileText className="h-4 w-4" /> Notas
                    </h4>
                    <div
                      onClick={() => copyToClipboard(customer.notes!, 'notes')}
                      className="p-4 rounded-xl border border-border/40 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors cursor-pointer"
                    >
                      <p className="text-sm text-yellow-700/80 dark:text-yellow-400/80 italic font-medium leading-relaxed">
                        "{customer.notes}"
                      </p>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Activity Tabs */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full h-12 p-1 bg-muted/40 rounded-xl mb-6">
                    <TabsTrigger value="active" className="flex-1 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wide">
                      <Clock className="w-4 h-4 mr-2" /> Cuotas Activas
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-1 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-wide">
                      <Package className="w-4 h-4 mr-2" /> Historial de Ventas
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active" className="space-y-4 outline-none">
                    {activeInstallments.length > 0 ? (
                      <div className="space-y-4">
                        {/* Group by Sale */}
                        {Object.entries(
                          activeInstallments.reduce((acc, inst) => {
                            (acc[inst.sale_id] = acc[inst.sale_id] || []).push(inst);
                            return acc;
                          }, {} as Record<number, typeof activeInstallments>)
                        ).map(([saleIdStr, insts]) => {
                          const saleId = Number(saleIdStr);
                          const firstItem = saleItemsBySale[saleId]?.[0];
                          const sale = sales.find(s => s.id === saleId);
                          const title = firstItem ? firstItem.product_name : `Venta #${sale?.sale_number || saleId}`;
                          const refCode = sale?.reference_code;

                          return (
                            <Collapsible key={saleId} className="border border-border/50 rounded-xl bg-card/30 overflow-hidden">
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <Package className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="text-left">
                                    <div className="font-bold text-sm flex items-center gap-2">
                                      {title}
                                      {refCode && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] h-5 px-1.5 cursor-pointer hover:bg-primary/10"
                                          onClick={(e) => {
                                            e.stopPropagation(); // Stop collapsible from toggling
                                            copyToClipboard(refCode, `ref-${saleId}`);
                                          }}
                                        >
                                          {refCode}
                                          {copiedField === `ref-${saleId}` && <Check className="ml-1 h-3 w-3 text-green-500" />}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {sale?.created_at ? new Date(sale.created_at).toLocaleDateString() : 'N/A'} • {insts.length} cuota(s) pendiente(s)
                                    </p>
                                  </div>
                                </div>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <div className="p-0">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent border-border/50">
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-9">Cuota #</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-9">Vencimiento</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-9 text-right">Monto</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-9 text-right">Saldo</TableHead>
                                        <TableHead className="text-[10px] uppercase font-bold tracking-wider h-9 text-center">Estado</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {insts.map((inst) => {
                                        const isOverdue = new Date(inst.due_date) < new Date();
                                        return (
                                          <TableRow key={inst.id} className="hover:bg-muted/20 border-border/40">
                                            <TableCell className="font-medium text-xs py-3">{inst.installment_number}</TableCell>
                                            <TableCell className="text-xs py-3">
                                              <span className={cn(isOverdue && "text-red-500 font-bold")}>
                                                {new Date(inst.due_date).toLocaleDateString()}
                                              </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-right py-3">{formatCurrency(inst.amount)}</TableCell>
                                            <TableCell className="text-xs font-medium text-right py-3 text-muted-foreground">{formatCurrency(inst.balance)}</TableCell>
                                            <TableCell className="text-center py-3">
                                              <Badge
                                                variant={isOverdue ? "destructive" : "outline"}
                                                className={cn("text-[10px] px-2 h-5", !isOverdue && "border-primary/30 text-primary bg-primary/5")}
                                              >
                                                {isOverdue ? 'Vencida' : 'Pendiente'}
                                              </Badge>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
                        <Check className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-muted-foreground">Al día</p>
                        <p className="text-xs text-muted-foreground/70">No hay cuotas pendientes de pago.</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="outline-none">
                    {sales.length > 0 ? (
                      <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/50">
                              <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10 w-[80px]">Ref.</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10 w-[30%]">Producto / Venta</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10">Fecha</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10 text-right">Total</TableHead>
                              <TableHead className="text-[10px] uppercase font-bold tracking-wider h-10 text-right">Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sales.map((sale) => {
                              const status = salesStatusById[sale.id!] || 'Completada';
                              const variant = status === 'Vencida' ? 'destructive' : (status === 'Completada' ? 'secondary' : 'default');
                              const items = saleItemsBySale[sale.id!] || [];
                              const title = items.length > 0 ? items[0].product_name : `#${sale.sale_number}`;
                              const refCode = sale.reference_code;

                              return (
                                <TableRow key={sale.id} className="hover:bg-muted/30 border-border/40 transition-colors">
                                  <TableCell className="py-4">
                                    {refCode ? (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1 font-mono text-muted-foreground">{refCode}</Badge>
                                    ) : <span className="text-muted-foreground text-xs">-</span>}
                                  </TableCell>
                                  <TableCell className="py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="p-1.5 bg-muted rounded-md shrink-0">
                                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-bold text-sm truncate max-w-[180px]">{title}</span>
                                        {items.length > 1 && <span className="text-[10px] text-muted-foreground">+{items.length - 1} más</span>}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs py-4 text-muted-foreground">
                                    {sale.created_at ? new Date(sale.created_at).toLocaleDateString() : '-'}
                                  </TableCell>
                                  <TableCell className="text-sm font-bold text-right py-4">
                                    {formatCurrency(sale.total_amount)}
                                  </TableCell>
                                  <TableCell className="text-right py-4">
                                    <Badge variant={variant as any} className="text-[10px] h-5 px-2">
                                      {status}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
                        <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p className="font-bold text-muted-foreground">Sin Historial</p>
                        <p className="text-xs text-muted-foreground/70">Este cliente aún no ha realizado compras.</p>
                      </div>
                    )}
                  </TabsContent>

                </Tabs>
              </div>

            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}