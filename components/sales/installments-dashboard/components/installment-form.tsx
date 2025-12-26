'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertCircle, Calendar as CalendarIcon, CreditCard, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Installment, Sale, Customer } from '@/lib/database-operations';
import { toast } from 'sonner';
import { parseSaleDateInputToISO, formatISOToDDMMYYYY } from '@/lib/date-utils';
import { Separator } from '@/components/ui/separator';
import { Search, User as UserIcon } from 'lucide-react';
import { usePersistedState } from '@/hooks/use-persisted-state';

interface InstallmentFormProps {
  installment?: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
}

export function InstallmentForm({ installment, open, onOpenChange, onSave }: InstallmentFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isExcelLayout] = usePersistedState<boolean>('excelFormLayout', false);
  const [formData, setFormData] = useState({
    sale_id: 0,
    installment_number: 1,
    due_date: new Date(),
    amount: 0,
    notes: ''
  });
  const [dateInput, setDateInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.electronAPI) {
      loadData();
    }
  }, [open]);




  useEffect(() => {
    if (installment) {
      setFormData({
        sale_id: installment.sale_id,
        installment_number: installment.installment_number,
        due_date: new Date(installment.due_date),
        amount: installment.amount,
        notes: installment.notes || ''
      });
      setDateInput(formatISOToDDMMYYYY(installment.due_date));
    } else {
      setFormData({
        sale_id: 0,
        installment_number: 1,
        due_date: new Date(),
        amount: 0,
        notes: ''
      });
      setDateInput(formatISOToDDMMYYYY(new Date().toISOString()));
    }
  }, [installment]);

  const loadData = async () => {
    try {
      const [customersData, salesData] = await Promise.all([
        window.electronAPI.database.customers.getAll(),
        window.electronAPI.database.sales.getAll()
      ]);

      setCustomers(customersData);
      setSales(salesData.filter(sale => sale.payment_type === 'installments'));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSaleSelect = (saleId: number) => {
    setFormData(prev => ({ ...prev, sale_id: saleId }));

    const selectedSale = sales.find(sale => sale.id === saleId);
    if (selectedSale && !installment) {
      const installmentAmount = Math.round(selectedSale.installment_amount || 0);
      setFormData(prev => ({ ...prev, amount: installmentAmount }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.sale_id) {
      newErrors.sale_id = 'Selecciona una venta';
    }

    if (formData.installment_number < 1) {
      newErrors.installment_number = 'El número de cuota debe ser mayor a 0';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'El monto debe ser mayor a 0';
    }

    if (isExcelLayout) {
      const parsed = parseSaleDateInputToISO(dateInput);
      if (!parsed.valid) {
        newErrors.due_date = parsed.error || 'Fecha inválida';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let finalDueDate: string;
      if (isExcelLayout) {
        const parsed = parseSaleDateInputToISO(dateInput);
        if (!parsed.valid || !parsed.iso) {
          toast.error(parsed.error || 'Fecha inválida');
          setIsSubmitting(false);
          return;
        }
        finalDueDate = parsed.iso.split('T')[0];
      } else {
        finalDueDate = formData.due_date.toISOString().split('T')[0];
      }

      const roundedAmount = Math.round(formData.amount);

      if (installment?.id) {
        // Update existing installment
        const updateData: Partial<Installment> = {
          installment_number: formData.installment_number,
          due_date: finalDueDate,
          amount: roundedAmount,
          balance: Math.max(0, roundedAmount - (installment.paid_amount || 0)),
          notes: formData.notes
        };
        await window.electronAPI.database.installments.update(installment.id, updateData);
        toast.success('Cuota actualizada correctamente');
      } else {
        // Create new installment
        const installmentData = {
          sale_id: formData.sale_id,
          installment_number: formData.installment_number,
          due_date: finalDueDate,
          amount: roundedAmount,
          paid_amount: 0,
          balance: roundedAmount,
          status: 'pending' as const,
          days_overdue: 0,
          late_fee: 0,
          late_fee_applied: false,
          notes: formData.notes
        };
        await window.electronAPI.database.installments.create(installmentData);
        toast.success('Cuota creada correctamente');
      }

      await onSave();
      onOpenChange(false);

      if (!installment) {
        setFormData({
          sale_id: 0,
          installment_number: 1,
          due_date: new Date(),
          amount: 0,
          notes: ''
        });
        setDateInput(formatISOToDDMMYYYY(new Date().toISOString()));
      }
      setErrors({});
    } catch (error) {
      console.error('Error saving installment:', error);
      toast.error('Error al guardar la cuota');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedSale = sales.find(sale => sale.id === formData.sale_id);
  const selectedCustomer = customers.find(customer => customer.id === selectedSale?.customer_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl antialiased w-[95vw] lg:w-full max-h-[90vh] lg:h-auto overflow-hidden p-0 rounded-xl border-none shadow-2xl bg-background/90 backdrop-blur-xl"
      >
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-4">
            <CreditCard className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {installment ? 'Editar Cuota' : 'Nueva Cuota'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                {installment ? 'Actualizar registro de cuota' : 'Completar datos del plan de pagos'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 gap-6">
            {/* Venta y Cliente Section */}
            <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Venta y Cliente</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Buscar Venta</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Nº Venta o Cliente..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-10 rounded-lg bg-background/50 border-none font-medium text-xs ring-1 ring-border/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Seleccionar Referencia *</Label>
                  <Select
                    value={formData.sale_id.toString()}
                    onValueChange={(value) => handleSaleSelect(parseInt(value))}
                    disabled={!!installment}
                  >
                    <SelectTrigger className={cn("h-10 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50", errors.sale_id ? 'ring-red-500/50' : '')}>
                      <SelectValue placeholder="Selecciona una venta" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      {sales
                        .filter(sale => {
                          const customer = customers.find(c => c.id === sale.customer_id);
                          const search = customerSearch.toLowerCase();
                          return (
                            sale.sale_number.toLowerCase().includes(search) ||
                            customer?.name.toLowerCase().includes(search)
                          );
                        })
                        .slice(0, 50)
                        .map((sale) => {
                          const customer = customers.find(c => c.id === sale.customer_id);
                          return (
                            <SelectItem key={sale.id} value={sale.id!.toString()} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded italic">{sale.sale_number}</span>
                                <span className="text-muted-foreground font-medium">-</span>
                                <span className="font-semibold">{customer?.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  {errors.sale_id && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500 mt-1 ml-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.sale_id}
                    </div>
                  )}
                </div>
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-bold tracking-tight">{selectedCustomer.name}</div>
                    <div className="flex items-center gap-2 opacity-60">
                      {selectedCustomer.phone && (
                        <span className="text-xs font-medium">{selectedCustomer.phone}</span>
                      )}
                      {selectedCustomer.dni && (
                        <>
                          <span className="text-xs opacity-30">•</span>
                          <span className="text-xs font-medium">DNI: {selectedCustomer.dni}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Detalles de Cuota Section */}
            <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Detalles de Cuota</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Nº Cuota *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.installment_number}
                    onChange={(e) => handleInputChange('installment_number', parseInt(e.target.value) || 1)}
                    className={cn("h-10 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50", errors.installment_number ? 'ring-red-500/50' : '')}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Monto *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', Math.round(parseFloat(e.target.value) || 0))}
                      className={cn("h-10 pl-7 pr-2 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50", errors.amount ? 'ring-red-500/50' : '')}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Vencimiento *</Label>
                  {isExcelLayout ? (
                    <Input
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      placeholder="dd/mm/aaaa"
                      className={cn("h-10 rounded-lg bg-background/50 border-none font-bold text-center text-xs ring-1 ring-border/50", errors.due_date ? 'ring-red-500/50' : '')}
                    />
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full h-10 justify-start text-left font-bold text-xs rounded-lg bg-background/50 border-none ring-1 ring-border/50',
                            !formData.due_date && 'text-muted-foreground',
                            errors.due_date && 'ring-red-500/50'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary" />
                          {formData.due_date ? (
                            format(formData.due_date, 'PPP', { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl border-none shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={(date) => date && handleInputChange('due_date', date)}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                  {errors.due_date && (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-500 mt-1 ml-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.due_date}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Observaciones Section */}
            <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Observaciones</h3>
              </div>
              <div className="space-y-1.5">
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Añadir notas internas sobre esta cuota..."
                  rows={3}
                  className="rounded-lg bg-background/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-black uppercase tracking-widest text-xs group"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  {installment ? 'Actualizar Cuota' : 'Crear Cuota'}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-12 px-6 rounded-lg font-bold uppercase tracking-tighter text-xs opacity-40 hover:opacity-100 transition-opacity"
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
