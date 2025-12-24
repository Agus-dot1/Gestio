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

interface InstallmentFormProps {
  installment?: Installment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => Promise<void>;
}

export function InstallmentForm({ installment, open, onOpenChange, onSave }: InstallmentFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isExcelLayout, setIsExcelLayout] = useState(false);
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
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('excelFormLayout');
      setIsExcelLayout(stored === 'true');
    } catch { }

    const handler = (e: Event) => {
      try {
        const stored = localStorage.getItem('excelFormLayout');
        setIsExcelLayout(stored === 'true');
      } catch { }
    };
    window.addEventListener('app:settings-changed', handler as EventListener);
    return () => {
      window.removeEventListener('app:settings-changed', handler as EventListener);
    };
  }, []);

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
        className={cn(
          'max-w-[95vw] max-h-[80vh] overflow-y-auto',
          isExcelLayout ? 'sm:max-w-[98vw] lg:max-w-[75vw] xl:max-w-[50vw]' : 'sm:max-w-[480px]'
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {installment ? 'Editar Cuota' : 'Nueva Cuota'}
          </DialogTitle>
          <DialogDescription>
            {installment ? 'Modificar los detalles de la cuota.' : 'Crear una nueva cuota para un plan de pagos.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4">
            {/* Form Fields Component to avoid duplication */}
            <div className={cn(
              "grid gap-4",
              isExcelLayout ? "md:grid-cols-6" : "grid-cols-1"
            )}>
              {/* Sale Selection */}
              <div className={cn(
                "space-y-2",
                isExcelLayout ? "md:col-span-3" : ""
              )}>
                <Label htmlFor="sale">Venta *</Label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente o venta..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <Select
                    value={formData.sale_id.toString()}
                    onValueChange={(value) => handleSaleSelect(parseInt(value))}
                    disabled={!!installment}
                  >
                    <SelectTrigger className={cn("h-10", errors.sale_id ? 'border-red-500' : '')}>
                      <SelectValue placeholder="Selecciona una venta" />
                    </SelectTrigger>
                    <SelectContent>
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
                            <SelectItem key={sale.id} value={sale.id!.toString()}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">{sale.sale_number}</span>
                                <span className="text-muted-foreground">-</span>
                                <span>{customer?.name}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
                {errors.sale_id && (
                  <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.sale_id}
                  </div>
                )}
                {selectedCustomer && (
                  <div className="p-2 bg-muted/50 rounded-md border flex items-center gap-2">
                    <div className="bg-primary/10 p-1.5 rounded-full">
                      <UserIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{selectedCustomer.name}</div>
                      {selectedCustomer.phone && (
                        <div className="text-xs text-muted-foreground">{selectedCustomer.phone}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Installment Number */}
              <div className={cn(
                "space-y-2",
                isExcelLayout ? "md:col-span-1" : "grid grid-cols-2 gap-4"
              )}>
                {/* Wrap in another div for grid layout if not excel */}
                {!isExcelLayout ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="installment_number">Nº Cuota *</Label>
                      <Input
                        id="installment_number"
                        type="number"
                        min="1"
                        value={formData.installment_number}
                        onChange={(e) => handleInputChange('installment_number', parseInt(e.target.value) || 1)}
                        className={errors.installment_number ? 'border-red-500' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Monto *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.amount}
                          onChange={(e) => handleInputChange('amount', Math.round(parseFloat(e.target.value) || 0))}
                          className={`pl-10 font-medium text-foreground ${errors.amount ? 'border-red-500' : ''}`}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Label htmlFor="installment_number">Nº Cuota *</Label>
                    <Input
                      id="installment_number"
                      type="number"
                      min="1"
                      value={formData.installment_number}
                      onChange={(e) => handleInputChange('installment_number', parseInt(e.target.value) || 1)}
                      className={errors.installment_number ? 'border-red-500' : ''}
                    />
                  </>
                )}
              </div>

              {/* Amount for Excel Layout */}
              {isExcelLayout && (
                <div className="md:col-span-1 space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', Math.round(parseFloat(e.target.value) || 0))}
                      className={`pl-10 font-medium text-foreground ${errors.amount ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>
              )}

              {/* Due Date */}
              <div className={cn(
                "space-y-2",
                isExcelLayout ? "md:col-span-1" : ""
              )}>
                <Label>{isExcelLayout ? 'Vence *' : 'Fecha de Vencimiento *'}</Label>
                {isExcelLayout ? (
                  <Input
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className={errors.due_date ? 'border-red-500' : ''}
                  />
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.due_date && 'text-muted-foreground',
                          errors.due_date && 'border-red-500'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? (
                          format(formData.due_date, 'PPP', { locale: es })
                        ) : (
                          <span>Seleccionar fecha</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={(date) => date && handleInputChange('due_date', date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                {errors.due_date && (
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {errors.due_date}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className={cn(
                "space-y-2",
                isExcelLayout ? "md:col-span-6" : ""
              )}>
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Notas adicionales sobre esta cuota..."
                  rows={isExcelLayout ? 2 : 3}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : installment ? 'Actualizar Cuota' : 'Crear Cuota'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
