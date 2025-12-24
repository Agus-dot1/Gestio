'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Package, DollarSign, Tag, Hash, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/database-operations';

interface ProductFormProps {
  product?: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (product: Omit<Product, 'id'>) => void;
}

export function ProductForm({ product, open, onOpenChange, onSave }: ProductFormProps) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price?.toString() || '',
    cost_price: product?.cost_price?.toString() || '',
    description: product?.description || '',
    category: product?.category || '',
    stock: product?.stock?.toString() || '',
    is_active: product?.is_active ?? true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExcelLayout, setIsExcelLayout] = useState(false);

  useEffect(() => {
    setFormData({
      name: product?.name || '',
      price: product?.price?.toString() || '',
      cost_price: product?.cost_price?.toString() || '',
      description: product?.description || '',
      category: product?.category || '',
      stock: product?.stock?.toString() || '',
      is_active: product?.is_active ?? true
    });
  }, [product]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('excelFormLayout');
      setIsExcelLayout(saved === 'true');
    } catch { }

    const handler = (e: any) => {
      const detail = e?.detail || {};
      if (Object.prototype.hasOwnProperty.call(detail, 'excelFormLayout')) {
        setIsExcelLayout(Boolean(detail.excelFormLayout));
      }
    };
    window.addEventListener('app:settings-changed', handler);
    return () => window.removeEventListener('app:settings-changed', handler);
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'El precio del producto es obligatorio';
    } else {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        newErrors.price = 'El precio debe ser un número positivo';
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
      await onSave({
        name: formData.name.trim(),
        price: parseFloat(formData.price),
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        stock: formData.stock ? parseInt(formData.stock) : undefined,
        is_active: formData.is_active
      });

      setFormData({
        name: '',
        price: '',
        cost_price: '',
        description: '',
        category: '',
        stock: '',
        is_active: true
      });
      setErrors({});
    } catch (error) {
      console.error('Error añadiendo producto:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Helper to render an input with consistent styling
  const renderInput = (
    id: string,
    label: string,
    value: string,
    icon: React.ReactNode,
    type: string = 'text',
    placeholder: string = '',
    extraProps: any = {}
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
        {label}
      </Label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => handleInputChange(id, e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-10 pl-10 rounded-lg bg-muted/30 border-none font-medium text-xs transition-all focus:ring-2 focus:ring-primary/20",
            errors[id] ? "ring-2 ring-red-500/50 bg-red-50/10" : "hover:bg-muted/50"
          )}
          {...extraProps}
        />
      </div>
      {errors[id] && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-red-500 ml-1">
          <AlertCircle className="h-3 w-3" />
          {errors[id]}
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        'p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-background/95 backdrop-blur-xl',
        isExcelLayout ? 'max-w-[95vw] sm:max-w-[98vw] lg:max-w-[75vw] xl:max-w-[50vw]' : 'max-w-[480px]'
      )}>
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-4">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                {product ? 'Actualizar información del inventario' : 'Añadir item al catálogo'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {isExcelLayout ? (
              <div className="grid gap-4 md:grid-cols-6 p-1">
                <div className="md:col-span-2">
                  {renderInput('name', 'Nombre *', formData.name, <Package className="h-4 w-4" />)}
                </div>
                <div className="md:col-span-1">
                  {renderInput('price', 'Precio *', formData.price, <DollarSign className="h-4 w-4" />, 'number', '0.00', { step: '0.01', min: '0' })}
                </div>
                <div className="md:col-span-1">
                  {renderInput('cost_price', 'Costo', formData.cost_price, <DollarSign className="h-4 w-4" />, 'number', '0.00', { step: '0.01', min: '0' })}
                </div>
                <div className="md:col-span-1 space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-all font-medium text-xs">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Seleccionar" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-xl">
                      <SelectItem value="sin-categoria">Sin categoría</SelectItem>
                      <SelectItem value="Electrónicos">Electrónicos</SelectItem>
                      <SelectItem value="Accesorios">Accesorios</SelectItem>
                      <SelectItem value="Audio">Audio</SelectItem>
                      <SelectItem value="Hogar">Hogar</SelectItem>
                      <SelectItem value="Juguetes">Juguetes</SelectItem>
                      <SelectItem value="Computación">Computación</SelectItem>
                      <SelectItem value="Automóvil">Automóvil</SelectItem>
                      <SelectItem value="Herramientas">Herramientas</SelectItem>
                      <SelectItem value="Otros">Otros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-1">
                  {renderInput('stock', 'Stock', formData.stock, <Hash className="h-4 w-4" />, 'number', '0', { min: '0' })}
                </div>
                <div className="md:col-span-6">
                  <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 hover:bg-card/60 transition-all">
                    <div className="space-y-1">
                      <Label htmlFor="is_active" className="text-[11px] font-bold uppercase tracking-wide cursor-pointer">Estado del Producto</Label>
                      <p className="text-[10px] font-medium text-muted-foreground opacity-80">
                        {formData.is_active ? 'Disponible para venta' : 'No disponible (Archivado)'}
                      </p>
                    </div>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                  </div>
                </div>
                <div className="md:col-span-6 space-y-1.5">
                  <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detalles adicionales..."
                    rows={2}
                    className="rounded-lg bg-muted/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-5">
                {renderInput('name', 'Nombre del Producto *', formData.name, <Package className="h-4 w-4" />)}

                <div className="grid grid-cols-2 gap-4">
                  {renderInput('price', 'Precio de Venta *', formData.price, <DollarSign className="h-4 w-4" />, 'number', '0.00', { step: '0.01', min: '0' })}
                  {renderInput('cost_price', 'Costo Unitario', formData.cost_price, <DollarSign className="h-4 w-4" />, 'number', '0.00', { step: '0.01', min: '0' })}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Categoría</Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="h-10 rounded-lg bg-muted/30 border-none hover:bg-muted/50 transition-all font-medium text-xs">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Seleccionar" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="sin-categoria">Sin categoría</SelectItem>
                        <SelectItem value="Electrónicos">Electrónicos</SelectItem>
                        <SelectItem value="Accesorios">Accesorios</SelectItem>
                        <SelectItem value="Audio">Audio</SelectItem>
                        <SelectItem value="Hogar">Hogar</SelectItem>
                        <SelectItem value="Juguetes">Juguetes</SelectItem>
                        <SelectItem value="Computación">Computación</SelectItem>
                        <SelectItem value="Automóvil">Automóvil</SelectItem>
                        <SelectItem value="Herramientas">Herramientas</SelectItem>
                        <SelectItem value="Otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {renderInput('stock', 'Stock Disponible', formData.stock, <Hash className="h-4 w-4" />, 'number', '0', { min: '0' })}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detalles adicionales del producto..."
                    rows={3}
                    className="rounded-lg bg-muted/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-card/40 backdrop-blur-md rounded-xl border border-border/40 hover:bg-card/60 transition-all shadow-sm">
                  <div className="space-y-1">
                    <Label htmlFor="form-active-switch" className="text-[11px] font-bold uppercase tracking-wide cursor-pointer flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", formData.is_active ? "bg-green-500" : "bg-red-500")} />
                      Estado del Producto
                    </Label>
                    <p className="text-[10px] font-medium text-muted-foreground opacity-80 pl-4">
                      {formData.is_active ? 'Visible y disponible para ventas' : 'Oculto en el catálogo general'}
                    </p>
                  </div>
                  <Switch
                    id="form-active-switch"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-2 bg-background/50 backdrop-blur-sm">
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/10"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {product ? 'Guardar Cambios' : 'Crear Producto'}
                  </span>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-10 rounded-lg font-bold uppercase tracking-tighter text-[10px] opacity-40 hover:opacity-100 transition-opacity"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}