'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Plus, Trash2, ShoppingCart, User, CreditCard, Calculator, Search, Users, List, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseSaleDateInputToISO, formatISOToDDMMYYYY } from '@/lib/date-utils';
import { formatCurrency } from '@/config/locale';
import type { Sale, SaleFormData } from '@/lib/database-operations';

// Keep Customer/Product as any to preserve current flexibility
type Customer = any;
type Product = any;

interface SaleFormProps {
  sale?: Sale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (sale: SaleFormData) => void;
}

interface SaleItem {
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export function SaleForm({ sale, open, onOpenChange, onSave }: SaleFormProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [formData, setFormData] = useState({
    customer_id: 0,
    payment_type: 'cash' as 'cash' | 'installments',
    payment_method: 'cash' as 'cash' | 'bank_transfer',
    period_type: 'monthly' as 'monthly' | 'weekly' | 'biweekly',
    number_of_installments: 6,
    notes: '',
    discount_amount: 0
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [saleDateInput, setSaleDateInput] = useState<string>('');
  const [saleDateError, setSaleDateError] = useState<string>('');

  const [installmentsBuffer, setInstallmentsBuffer] = useState<string | undefined>(undefined);
  const [priceBuffers, setPriceBuffers] = useState<Record<number, string | undefined>>({});

  useEffect(() => {
    if (open && typeof window !== 'undefined' && window.electronAPI) {
      loadCustomers();
      loadProducts();
    }
  }, [open]);

  useEffect(() => {
    if (sale) {
      setFormData({
        customer_id: sale.customer_id,
        payment_type: sale.payment_type,
        payment_method: (sale as any).payment_method || 'cash',
        period_type: sale.period_type || 'monthly',
        number_of_installments: sale.number_of_installments || 6,
        notes: sale.notes || '',
        discount_amount: sale.discount_amount || 0
      });
      loadSaleItems(sale.id!);
      setSaleDateInput(formatISOToDDMMYYYY(sale.date));
    } else {
      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_method: 'cash',
        period_type: 'monthly',
        number_of_installments: 6,
        notes: '',
        discount_amount: 0
      });
      setItems([]);
      setSaleDateInput('');
      setSaleDateError('');
    }
  }, [sale]);

  const loadCustomers = async () => {
    try {
      if (!window.electronAPI) return;
      const allCustomers = await window.electronAPI.database.customers.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error cargando clientes:', error);
    }
  };

  const loadProducts = async () => {
    try {
      if (!window.electronAPI) return;
      const activeProducts = await window.electronAPI.database.products.getActive();
      setProducts(activeProducts);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  const loadSaleItems = async (saleId: number) => {
    try {
      if (!window.electronAPI) return;
      const saleItems = await window.electronAPI.database.saleItems.getBySale(saleId);
      const formattedItems: SaleItem[] = saleItems.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total
      }));
      setItems(formattedItems);
    } catch (error) {
      console.error('Error cargando items de la venta:', error);
    }
  };

  const openProductDialog = () => {
    setProductQuery('');
    setProductDialogOpen(true);
  };

  const addItemFromProduct = (product: Product) => {
    const newItem: SaleItem = {
      product_id: product.id ?? null,
      product_name: product.name,
      quantity: 1,
      unit_price: product.price,
      line_total: product.price
    };
    setItems(prev => [...prev, newItem]);
    setProductDialogOpen(false);
  };

  const addCustomProductByName = (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newItem: SaleItem = {
      product_id: null,
      product_name: cleanName,
      quantity: 1,
      unit_price: 0,
      line_total: 0
    };
    setItems(prev => [...prev, newItem]);
    setProductDialogOpen(false);
  };

  const openCustomerDialog = () => {
    setCustomerQuery('');
    setCustomerDialogOpen(true);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customer_id: customer.id! }));
    setCustomerDialogOpen(false);
  };

  const createCustomerQuick = async (name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const existing = customers.find(c => c.name.toLowerCase() === clean.toLowerCase());
    if (existing) {
      selectCustomer(existing);
      return;
    }
    try {
      if (!window.electronAPI) return;
      const id = await window.electronAPI.database.customers.create({ name: clean });
      const newCustomer: Customer = { id, name: clean } as Customer;
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customer_id: id }));
    } catch (e) {
      console.error('Error creando cliente rápido:', e);
    } finally {
      setCustomerDialogOpen(false);
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        updatedItems[index].product_name = product.name;
        updatedItems[index].unit_price = product.price;
      }
    }

    const item = updatedItems[index];
    item.line_total = (item.quantity * item.unit_price);

    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const discount = formData.discount_amount || 0;
    const total = Math.max(0, subtotal - discount);
    return { subtotal, total, discount };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_id) {
      newErrors.customer_id = 'Selecciona un cliente';
    }

    if (items.length === 0) {
      newErrors.items = 'Agrega al menos un producto a la venta';
    }

    items.forEach((item, index) => {
      if (item.quantity <= 0) {
        newErrors[`item_${index}_quantity`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.unit_price < 0) {
        newErrors[`item_${index}_price`] = 'El precio unitario no puede ser negativo';
      }
    });

    if (formData.payment_type === 'installments') {
      if (!formData.number_of_installments || formData.number_of_installments < 2) {
        newErrors.number_of_installments = 'El número de cuotas debe ser al menos 2';
      }
    }

    if (saleDateInput.trim()) {
      const parsed = parseSaleDateInputToISO(saleDateInput);
      if (!parsed.valid) {
        newErrors.sale_date = typeof parsed.error === 'string' ? parsed.error : 'Fecha inválida';
      }
    }

    setErrors(newErrors);
    setSaleDateError(newErrors.sale_date || '');
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      let dateISO: string;
      const raw = saleDateInput.trim();
      if (!raw) {
        dateISO = new Date().toISOString();
      } else {
        const parsed = parseSaleDateInputToISO(raw);
        if (!parsed.valid || !parsed.iso) {
          setSaleDateError(parsed.error || 'Fecha inválida');
          setIsSubmitting(false);
          return;
        }
        dateISO = parsed.iso;
      }

      const payment_type = formData.payment_type;
      const saleData: SaleFormData = {
        customer_id: formData.customer_id,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          product_name: item.product_name
        })),
        payment_type,
        payment_method: formData.payment_method,
        period_type: payment_type === 'installments' ? formData.period_type : undefined,
        number_of_installments: payment_type === 'installments' ? formData.number_of_installments : undefined,
        notes: formData.notes,
        discount_amount: formData.discount_amount,
        date: dateISO
      };

      await onSave(saleData);

      setFormData({
        customer_id: 0,
        payment_type: 'cash',
        payment_method: 'cash',
        period_type: 'monthly',
        number_of_installments: 6,
        notes: '',
        discount_amount: 0
      });
      setItems([]);
      setErrors({});
      setSaleDateInput('');
      setSaleDateError('');
    } catch (error) {
      console.error('Error al registrar venta:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, total, discount } = calculateTotals();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl antialiased w-[95vw] lg:w-full h-[90vh] lg:h-auto lg:max-h-[85vh] overflow-hidden p-0 rounded-xl border-none shadow-2xl bg-background/90 backdrop-blur-xl"
      >
        <div className="flex flex-col h-full max-h-[90vh] lg:max-h-[85vh]">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-4">
              <ShoppingCart className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">
                  {sale ? 'Editar Venta' : 'Nueva Venta'}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                  {sale ? 'Actualizar registro' : 'Completar datos de transacción'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Sections Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cliente Section */}
                  <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Cliente</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        {formData.customer_id ? (
                          <div className="group relative flex items-center justify-between p-2.5 bg-muted/40 border border-border/40 rounded-lg hover:bg-muted/60 transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {customers.find(c => c.id === formData.customer_id)?.name?.charAt(0).toUpperCase() || '?'}
                                </span>
                              </div>
                              <span className="text-sm font-semibold truncate">
                                {customers.find(c => c.id === formData.customer_id)?.name || `ID ${formData.customer_id}`}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-all hover:bg-background rounded-md"
                              onClick={openCustomerDialog}
                            >
                              Cambiar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={openCustomerDialog}
                            className={cn(
                              "w-full h-12 justify-between border-dashed border-2 rounded-lg px-4 hover:border-primary/40 hover:bg-primary/5 transition-all group",
                              errors.customer_id ? 'border-red-500/50 bg-red-50/10' : ''
                            )}
                          >
                            <span className="flex items-center gap-3 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                              <Plus className="h-4 w-4" />
                              Elegir Cliente
                            </span>
                            <Search className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {errors.customer_id && (
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-500 mt-2 ml-1">
                            <AlertCircle className="h-3 w-3" />
                            {errors.customer_id}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pago Section */}
                  <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-2 mb-4">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Pago</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Modalidad</Label>
                        <Select
                          value={formData.payment_type}
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_type: value }))}
                        >
                          <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-all font-medium text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border-none shadow-xl">
                            <SelectItem value="cash">Al contado</SelectItem>
                            <SelectItem value="installments">Cuotas</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cobro</Label>
                        <Select
                          value={formData.payment_method}
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, payment_method: value }))}
                        >
                          <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-all font-medium text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border-none shadow-xl">
                            <SelectItem value="cash">Efectivo</SelectItem>
                            <SelectItem value="bank_transfer">Transferencia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.payment_type === 'installments' && (
                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/20 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Cuotas</Label>
                          <Input
                            type="number"
                            min="2"
                            max="60"
                            value={installmentsBuffer ?? formData.number_of_installments.toString()}
                            onChange={(e) => setInstallmentsBuffer(e.target.value)}
                            onBlur={() => {
                              if (installmentsBuffer === undefined) return;
                              const v = (installmentsBuffer ?? '').trim();
                              if (v === '') { setInstallmentsBuffer(undefined); return; }
                              const num = parseInt(v, 10);
                              if (Number.isFinite(num)) {
                                const clamped = Math.max(2, Math.min(60, num));
                                setFormData(prev => ({ ...prev, number_of_installments: clamped }));
                              }
                              setInstallmentsBuffer(undefined);
                            }}
                            className="h-10 rounded-lg bg-muted/30 border-none font-bold text-center text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Frecuencia</Label>
                          <Select
                            value={formData.period_type}
                            onValueChange={(value: any) => setFormData(prev => ({ ...prev, period_type: value }))}
                          >
                            <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-all font-medium text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-none shadow-xl">
                              <SelectItem value="monthly">Mensual</SelectItem>
                              <SelectItem value="biweekly">Quincenal</SelectItem>
                              <SelectItem value="weekly">Semanal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Productos Section */}
                <div className="bg-card/40 backdrop-blur-md rounded-xl border border-border/40 shadow-sm overflow-hidden transition-all duration-300">
                  <div className="p-4 pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Carrito</h3>
                    </div>
                    <Button
                      type="button"
                      onClick={openProductDialog}
                      className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 transition-all font-bold text-xs flex items-center gap-2"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Añadir producto
                    </Button>
                  </div>

                  <div className="p-4">
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg border-2 border-dashed border-border/40">
                        <ShoppingCart className="h-8 w-8 opacity-20 mb-2" />
                        <p className="text-xs font-bold uppercase tracking-widest opacity-40">El carrito está vacío</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item, index) => (
                          <div
                            key={index}
                            className="group grid grid-cols-1 sm:grid-cols-12 items-end gap-3 p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/40 transition-all animate-in fade-in slide-in-from-right-2 duration-300"
                          >
                            <div className="sm:col-span-5 space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Producto</Label>
                              {item.product_id != null ? (
                                <Select
                                  value={item.product_id.toString()}
                                  onValueChange={(value) => updateItem(index, 'product_id', parseInt(value))}
                                >
                                  <SelectTrigger className="h-10 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-lg border-none shadow-xl">
                                    {products.map((product) => (
                                      <SelectItem key={product.id} value={product.id!.toString()}>
                                        {product.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  value={item.product_name}
                                  onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                                  className="h-10 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50"
                                  placeholder="Nombre personalizado"
                                />
                              )}
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block text-center">Cant.</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-10 rounded-lg bg-background/50 border-none font-bold text-xs text-center ring-1 ring-border/50"
                              />
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Precio</Label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                                <Input
                                  type="number"
                                  value={priceBuffers[index] ?? String(item.unit_price)}
                                  onChange={(e) => setPriceBuffers(prev => ({ ...prev, [index]: e.target.value }))}
                                  onBlur={() => {
                                    const bufferValue = priceBuffers[index];
                                    if (bufferValue === undefined) return;
                                    const v = bufferValue.trim();
                                    if (v === '') {
                                      updateItem(index, 'unit_price', 0);
                                    } else {
                                      const num = parseFloat(v.replace(',', '.'));
                                      updateItem(index, 'unit_price', Number.isFinite(num) ? Math.max(0, num) : 0);
                                    }
                                    setPriceBuffers(prev => ({ ...prev, [index]: undefined }));
                                  }}
                                  className="h-10 pl-7 pr-2 rounded-lg bg-background/50 border-none font-bold text-xs ring-1 ring-border/50"
                                />
                              </div>
                            </div>

                            <div className="sm:col-span-2 space-y-1.5">
                              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground text-right mr-1">Total</Label>
                              <div className="h-10 flex items-center justify-end px-3 rounded-lg bg-primary/10 text-primary font-bold text-xs border border-primary/20">
                                {formatCurrency(item.line_total)}
                              </div>
                            </div>

                            <div className="sm:col-span-1 flex justify-center pb-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="h-9 w-9 text-red-500 hover:bg-red-500/10 hover:text-red-600 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {errors.items && (
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-red-500 mt-4 ml-2">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {errors.items}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar: Summary & Extras */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-primary/5 dark:bg-primary/10 backdrop-blur-md p-6 rounded-xl border border-primary/10 shadow-inner sticky top-0">
                  <div className="flex items-center gap-2 mb-6">
                    <Calculator className="h-5 w-5 text-primary" />
                    <h3 className="text-base font-bold tracking-tight">Resumen</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-muted-foreground uppercase tracking-widest text-xs">Subtotal</span>
                      <span className="font-bold">{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="flex justify-between items-center group">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-muted-foreground uppercase tracking-widest text-xs">Descuento</span>
                        <span className="text-[10px] opacity-40 italic">Monto fijo</span>
                      </div>
                      <div className="relative w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-[10px]">$</span>
                        <Input
                          type="number"
                          min="0"
                          value={formData.discount_amount || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setFormData(prev => ({ ...prev, discount_amount: isNaN(val) ? 0 : val }));
                          }}
                          className="h-8 pl-5 pr-2 rounded-lg bg-background/50 border-none font-bold text-right text-xs ring-1 ring-border/50"
                        />
                      </div>
                    </div>

                    <div className="h-px bg-primary/10" />

                    <div className="flex justify-between items-end">
                      <span className="text-muted-foreground uppercase tracking-widest text-xs pb-1 font-bold">Total a Cobrar</span>
                      <span className="text-2xl font-black text-primary tracking-tighter tabular-nums">
                        {formatCurrency(total)}
                      </span>
                    </div>

                    {formData.payment_type === 'installments' && formData.number_of_installments > 0 && (
                      <div className="pt-4 mt-4 border-t border-primary/10 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col gap-3 p-4 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            <span className="text-xs font-black uppercase tracking-tighter text-primary">Detalle de Cuotas</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold opacity-70">Pago {formData.period_type === 'monthly' ? 'Mensual' : formData.period_type === 'biweekly' ? 'Quincenal' : 'Semanal'}</span>
                            <span className="text-base font-black text-primary tabular-nums">
                              {formatCurrency(total / formData.number_of_installments)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center opacity-70">
                            <span className="text-xs font-bold uppercase tracking-wide">Plazo Final</span>
                            <span className="text-xs font-bold">{formData.number_of_installments} Pagos</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-4 pt-4 mt-4 border-t border-primary/10">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Fecha de Venta</Label>
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <CircleAlert className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-primary transition-colors cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="rounded-xl border-none shadow-xl bg-background/95 backdrop-blur-md p-3 text-xs">
                                Formato: dd/mm o dd/mm/aaaa<br />Vacío = Fecha actual
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <Input
                          value={saleDateInput}
                          onChange={(e) => {
                            setSaleDateInput(e.target.value);
                            if (saleDateError) setSaleDateError('');
                          }}
                          placeholder="dd/mm/aaaa"
                          className={cn(
                            "h-10 rounded-lg bg-background/50 border-none font-bold text-center placeholder:font-medium placeholder:opacity-30 transition-all focus:ring-2 focus:ring-primary/20",
                            saleDateError ? 'ring-2 ring-red-500/50' : ''
                          )}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Notas Internas</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Click para añadir notas..."
                          rows={3}
                          className="rounded-lg bg-background/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-black uppercase tracking-widest text-xs group"
                    >
                      {isSubmitting ? (
                        <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <span className="flex items-center gap-3">
                          <ShoppingCart className="h-4 w-4 group-hover:scale-110 transition-transform" />
                          {sale ? 'Confirmar Cambios' : 'Finalizar Venta'}
                        </span>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => onOpenChange(false)}
                      className="w-full h-10 rounded-lg font-bold uppercase tracking-tighter text-xs opacity-40 hover:opacity-100 transition-opacity"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Dialogs for search */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-xl border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <Search className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">Buscar Producto</DialogTitle>
                  <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                    Selecciona un item del catálogo
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input
                  placeholder="Escribe el nombre del producto..."
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  className="h-11 pl-11 rounded-lg bg-muted/40 border-none transition-all focus:ring-2 focus:ring-primary/20 font-medium"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {products
                  .filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase()))
                  .map(p => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground transition-all rounded-lg border border-transparent hover:border-border/40 flex items-center justify-between group"
                      onClick={() => addItemFromProduct(p)}
                    >
                      <span className="font-bold text-sm tracking-tight">{p.name}</span>
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-black tabular-nums">
                        {formatCurrency(p.price)}
                      </span>
                    </button>
                  ))}
                {products.filter(p => p.name.toLowerCase().includes(productQuery.toLowerCase())).length === 0 && (
                  <div className="py-8 text-center">
                    <List className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">No hay resultados</p>
                  </div>
                )}
              </div>
              {productQuery.trim() && (
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-between gap-4">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">¿No está en el catálogo?</p>
                  <Button
                    type="button"
                    variant="link"
                    className="text-xs font-black uppercase tracking-widest h-auto p-0 text-primary"
                    onClick={() => addCustomProductByName(productQuery)}
                  >
                    Usar &quot;{productQuery}&quot;
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-xl border-none shadow-2xl p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2">
              <div className="flex items-center gap-4">
                <Users className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight">Buscar Cliente</DialogTitle>
                  <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                    Selecciona un cliente de la base de datos
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                <Input
                  placeholder="Escribe el nombre del cliente..."
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="h-11 pl-11 rounded-lg bg-muted/40 border-none transition-all focus:ring-2 focus:ring-primary/20 font-medium"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {customers
                  .filter(c => c.name.toLowerCase().includes(customerQuery.toLowerCase()))
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left p-3 hover:bg-accent hover:text-accent-foreground transition-all rounded-lg border border-transparent hover:border-border/40 flex items-center justify-between group"
                      onClick={() => selectCustomer(c)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">{c.name}</span>
                          {c.dni && <span className="text-xs font-medium opacity-50">{c.dni}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                {customers.filter(c => c.name.toLowerCase().includes(customerQuery.toLowerCase())).length === 0 && customerQuery.trim() && (
                  <div className="py-8 text-center">
                    <User className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-4">Cliente no encontrado</p>
                    <Button
                      type="button"
                      onClick={() => createCustomerQuick(customerQuery)}
                      className="h-9 rounded-lg bg-primary/10 text-primary hover:bg-muted/90 hover:text-white transition-all font-bold text-xs"
                    >
                      Crear &quot;{customerQuery}&quot; rápido
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
