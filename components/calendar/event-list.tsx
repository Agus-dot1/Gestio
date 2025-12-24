'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Calendar,
  DollarSign,
  User,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShoppingCart,
  ArrowUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/lib/calendar-types';
import { getEventTypeColor, getEventStatusColor, formatEventTime } from '@/lib/calendar-types';

interface EventListProps {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  bulkActionMode?: boolean;
  selectedEvents?: string[];
  onSelectEvent?: (eventId: string) => void;
}

export function EventList({
  events,
  onEventClick,
  bulkActionMode = false,
  selectedEvents = [],
  onSelectEvent
}: EventListProps) {


  const [sortConfig, setSortConfig] = useState<{ key: keyof CalendarEvent; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'asc'
  });

  const sortedEvents = [...events].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];



    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    if (bValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;



    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof CalendarEvent) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount).replace('ARS', '$');
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'sale':
        return <ShoppingCart className="w-4 h-4" />;
      case 'installment':
        return <CreditCard className="w-4 h-4" />;
      case 'reminder':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-600" />;
      default:
        return <Clock className="w-3 h-3 text-gray-600" />;
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No hay eventos en esta fecha</p>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => requestSort('date')}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider h-8 rounded-xl px-3 transition-all",
              sortConfig.key === 'date' ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "hover:bg-muted"
            )}
          >
            Fecha
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => requestSort('title')}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider h-8 rounded-xl px-3 transition-all",
              sortConfig.key === 'title' ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "hover:bg-muted"
            )}
          >
            Título
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => requestSort('status')}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider h-8 rounded-xl px-3 transition-all",
              sortConfig.key === 'status' ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "hover:bg-muted"
            )}
          >
            Estado
          </Button>
        </div>
      </div>

      {sortedEvents.map((event) => {
        const isSelected = selectedEvents.includes(event.id);

        return (
          <div
            key={event.id}
            className={cn(
              'group relative flex items-center gap-4 p-4 rounded-2xl bg-card border hover:border-primary/30 hover:shadow-lg transition-all duration-300',
              bulkActionMode && isSelected && 'ring-2 ring-primary bg-primary/5'
            )}
            onClick={(e) => {
              if (bulkActionMode && onSelectEvent) {
                e.preventDefault();
                onSelectEvent(event.id);
              } else {
                onEventClick(event);
              }
            }}
            role={bulkActionMode ? "checkbox" : "button"}
            aria-checked={bulkActionMode ? isSelected : undefined}
            aria-label={bulkActionMode
              ? `${isSelected ? 'Deseleccionar' : 'Seleccionar'} evento: ${event.title}`
              : `Ver detalles del evento: ${event.title}`
            }
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (bulkActionMode && onSelectEvent) {
                  onSelectEvent(event.id);
                } else {
                  onEventClick(event);
                }
              }
            }}
          >
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm",
              event.type === 'sale' ? "bg-green-500/10 text-green-600 group-hover:bg-green-500 group-hover:text-white" :
                event.type === 'installment' ? "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white" :
                  "bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white"
            )}>
              {getEventIcon(event.type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                  {event.title.includes(':') ? event.title.split(':')[1].trim() : event.title}
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-bold tracking-wider uppercase px-1.5 h-4 border-none bg-muted/50 transition-colors group-hover:bg-primary/10 group-hover:text-primary',
                    getEventStatusColor(event.status)
                  )}
                >
                  {event.status === 'completed' ? 'PAGADO' : event.status === 'pending' ? 'PENDIENTE' : event.status === 'overdue' ? 'VENCIDO' : event.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatEventTime(event.date)}
                </span>
                {event.customerName && (
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <User className="w-3 h-3" />
                    {event.customerName}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right">
              {event.amount && (
                <p className="text-sm font-bold tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
                  {formatCurrency(event.amount)}
                </p>
              )}
              {event.type === 'installment' && event.installmentNumber && (
                <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                  Cuota #{event.installmentNumber}
                </p>
              )}
              {event.balance && event.balance > 0 && (
                <p className="text-[10px] font-bold text-red-500/80 uppercase">
                  Saldo {formatCurrency(event.balance)}
                </p>
              )}
            </div>

            <div className={cn(
              "w-1.5 h-8 rounded-full ml-2 opacity-20 group-hover:opacity-100 transition-opacity",
              event.type === 'sale' ? "bg-green-500" :
                event.type === 'installment' ? "bg-blue-500" :
                  "bg-orange-500"
            )} />
          </div>
        );
      })}
    </div>
  );
}