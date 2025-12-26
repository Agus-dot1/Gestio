'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertCircle, Users, Phone, Mail, MapPin, User, Building, Tag, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Customer } from '@/lib/database-operations';
import { usePersistedState } from '@/hooks/use-persisted-state';

interface CustomerFormState {
  name: string;
  dni: string;
  email: string;
  phone: string;
  secondary_phone: string;
  address: string;
  notes: string;
}

interface CustomerFormProps {
  customer?: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => void;
}

export function CustomerForm({ customer, open, onOpenChange, onSave }: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormState>({
    name: customer?.name || '',
    dni: customer?.dni || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    secondary_phone: customer?.secondary_phone || '',
    address: customer?.address || '',
    notes: customer?.notes || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExcelLayout] = usePersistedState<boolean>('excelFormLayout', false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        dni: customer.dni || '',
        email: customer.email || '',
        phone: customer.phone || '',
        secondary_phone: customer.secondary_phone || '',
        address: customer.address || '',
        notes: customer.notes || ''
      });
    } else {
      setFormData({
        name: '',
        dni: '',
        email: '',
        phone: '',
        secondary_phone: '',
        address: '',
        notes: ''
      });
    }
  }, [customer]);


  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    }

    if (formData.dni.trim()) {
      const dniRegex = /^\d{7,8}$/; // 7 or 8 digits for Argentine DNI
      if (!dniRegex.test(formData.dni.trim())) {
        newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
      }
    }

    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@gmail\.com$/i;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Debe ser un correo Gmail válido';
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
        dni: formData.dni.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        secondary_phone: formData.secondary_phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        notes: formData.notes.trim() || undefined
      });

      setFormData({
        name: '',
        dni: '',
        email: '',
        phone: '',
        secondary_phone: '',
        address: '',
        notes: ''
      });
      setErrors({});
    } catch (error) {
      console.error('Error guardando cambios:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    id: string,
    label: string,
    value: string,
    icon: React.ReactNode,
    placeholder: string = '',
    extraProps: any = {},
    showLabel: boolean = true
  ) => (
    <div className="space-y-1.5 w-full">
      {showLabel && (
        <Label htmlFor={id} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
          {label}
        </Label>
      )}
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {icon}
        </div>
        <Input
          id={id}
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
        isExcelLayout ? 'max-w-[95vw] sm:max-w-[98vw] lg:max-w-[80vw] xl:max-w-[70vw]' : 'max-w-[500px]'
      )}>
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-4">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-widest opacity-60">
                {customer ? 'Actualizar perfil del cliente' : 'Registrar nuevo contacto'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {isExcelLayout ? (
              <div className="grid gap-4 md:grid-cols-6 p-1">
                {/* DNI */}
                <div className="md:col-span-1">
                  {renderInput('dni', 'DNI', formData.dni, <CreditCard className="h-4 w-4" />, '12345678', { maxLength: 8 })}
                </div>

                {/* Email */}
                <div className="md:col-span-2">
                  {renderInput('email', 'Gmail', formData.email, <Mail className="h-4 w-4" />, 'email@gmail.com')}
                </div>

                {/* Name */}
                <div className="md:col-span-3">
                  {renderInput('name', 'Nombre *', formData.name, <User className="h-4 w-4" />)}
                </div>

                {/* Phone */}
                <div className="md:col-span-2">
                  {renderInput('phone', 'Teléfono', formData.phone, <Phone className="h-4 w-4" />)}
                </div>

                {/* Secondary Phone */}
                <div className="md:col-span-2">
                  {renderInput('secondary_phone', 'Tel. Secundario', formData.secondary_phone, <Phone className="h-4 w-4" />)}
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  {renderInput('address', 'Dirección', formData.address, <MapPin className="h-4 w-4" />)}
                </div>

                {/* Notes */}
                <div className="md:col-span-6 space-y-1.5">
                  <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Información adicional..."
                    rows={2}
                    className="rounded-lg bg-muted/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-5">
                {/* Main Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    {renderInput('dni', 'DNI', formData.dni, <CreditCard className="h-4 w-4" />, '########', { maxLength: 8 })}
                  </div>
                  <div className="col-span-2">
                    {renderInput('name', 'Nombre Completo *', formData.name, <User className="h-4 w-4" />)}
                  </div>
                </div>

                {/* Contact Card */}
                <div className="bg-card/40 backdrop-blur-md p-4 rounded-xl border border-border/40 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-70">Contacto</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {renderInput('phone', 'Teléfono', formData.phone, <Phone className="h-4 w-4" />, '', {}, false)}
                    {renderInput('secondary_phone', 'Secundario', formData.secondary_phone, <Phone className="h-4 w-4" />, '', {}, false)}
                  </div>
                  {renderInput('email', 'Correo Gmail', formData.email, <Mail className="h-4 w-4" />, 'usuario@gmail.com')}
                </div>

                {/* Address */}
                {renderInput('address', 'Dirección Física', formData.address, <MapPin className="h-4 w-4" />)}

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Detalles importantes..."
                    rows={3}
                    className="rounded-lg bg-muted/30 border-none resize-none text-xs font-medium placeholder:opacity-40 focus:ring-2 focus:ring-primary/20 p-3 transition-all"
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
                    <Users className="h-4 w-4" />
                    {customer ? 'Guardar Cambios' : 'Registrar Cliente'}
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
