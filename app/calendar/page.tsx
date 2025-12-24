'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { CalendarComponent } from '@/components/calendar/calendar-component';
import { EventDialog } from '@/components/calendar/event-dialog';
import { EventList } from '@/components/calendar/event-list';
import { CalendarSkeleton } from '@/components/skeletons/calendar-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataCache } from '@/hooks/use-data-cache';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Users,
  CreditCard,
  TrendingUp,
  RefreshCw,
  TrendingDown,
  Search,
  X
} from 'lucide-react';
import type { CalendarEvent, EventType, EventStatus } from '@/lib/calendar-types';
import type { Sale } from '@/lib/database-operations';


export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to start of day
    return now;
  });
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    now.setDate(1); // Set to first day of month
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isElectron, setIsElectron] = useState(false);
  const [loading, setLoading] = useState(false); // Start with false for optimistic navigation
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<EventStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);



  const dataCache = useDataCache();



  useEffect(() => {
    setIsElectron(typeof window !== 'undefined' && !!window.electronAPI);
  }, []);

  const loadCalendarEvents = useCallback(async (forceRefresh = false) => {
    if (!isElectron) {
      setLoading(false);
      return;
    }

    try {


      const cachedSales = dataCache.getCachedSales(1, 1000, '');
      const shouldShowLoading = (!cachedSales || forceRefresh) && events.length === 0;

      if (shouldShowLoading) {
        setLoading(true);
      }

      const calendarEvents: CalendarEvent[] = [];
      const errors: string[] = [];



      let sales: Sale[];
      if (cachedSales && !forceRefresh && !dataCache.isSalesCacheExpired(1, 1000, '')) {
        sales = cachedSales.items;
      } else {
        try {
          sales = await window.electronAPI.database.sales.getAll();


          if (!Array.isArray(sales)) {
            throw new Error('Invalid sales data format received');
          }



          if (sales.length > 0) {
            dataCache.setCachedSales(1, 1000, '', {
              items: sales,
              total: sales.length,
              totalPages: 1,
              currentPage: 1,
              pageSize: 1000,
              searchTerm: '',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('Error loading sales data:', error);
          errors.push('Failed to load sales data');
          sales = [];
        }
      }



      sales.forEach((sale, index) => {
        try {


          if (!sale.id || !sale.customer_name || !sale.date || !sale.total_amount) {
            console.warn(`Skipping invalid sale at index ${index}:`, sale);
            return;
          }

          const saleDate = new Date(sale.date);
          if (isNaN(saleDate.getTime())) {
            console.warn(`Invalid date for sale ${sale.id}:`, sale.date);
            return;
          }

          calendarEvents.push({
            id: `sale-${sale.id}`,
            title: `Venta: ${sale.customer_name}`,
            date: saleDate,
            type: 'sale',
            description: `Venta #${sale.sale_number || sale.id} - ${formatCurrency(sale.total_amount)}`,
            customerId: sale.customer_id,
            saleId: sale.id,
            amount: sale.total_amount,
            status: sale.payment_status === 'paid' ? 'completed' : 'pending'
          });
        } catch (error) {
          console.error(`Error processing sale ${sale.id}:`, error);
          errors.push(`Failed to process sale ${sale.id}`);
        }
      });



      const installmentPromises = sales
        .filter(sale => sale.payment_type === 'installments' && sale.id)
        .map(async (sale) => {
          try {
            const installments = await window.electronAPI.database.installments.getBySale(sale.id!);

            if (!Array.isArray(installments)) {
              console.warn(`Invalid installments data for sale ${sale.id}`);
              return [];
            }

            return installments
              .filter(installment => installment.id && installment.due_date && installment.amount)
              .map(installment => {
                try {
                  const dueDate = new Date(installment.due_date);
                  if (isNaN(dueDate.getTime())) {
                    console.warn(`Invalid due date for installment ${installment.id}:`, installment.due_date);
                    return null;
                  }

                  const isOverdue = dueDate < new Date() && installment.status !== 'paid';
                  const eventStatus: EventStatus = installment.status === 'paid' ? 'completed' : isOverdue ? 'overdue' : 'pending';
                  return {
                    id: `installment-${installment.id}`,
                    title: `Pago: ${sale.customer_name}`,
                    date: dueDate,
                    type: 'installment' as EventType,
                    description: `Cuota #${installment.installment_number || 'N/A'} - ${formatCurrency(installment.amount)}`,
                    customerId: sale.customer_id,
                    saleId: sale.id,
                    installmentId: installment.id,
                    amount: installment.amount,
                    status: eventStatus,
                    installmentNumber: installment.installment_number,
                    balance: installment.balance || 0
                  } as CalendarEvent;
                } catch (error) {
                  console.error(`Error processing installment ${installment.id}:`, error);
                  return null;
                }
              })
              .filter((item): item is CalendarEvent => item !== null); // Remove null entries
          } catch (error) {
            console.error(`Error loading installments for sale ${sale.id}:`, error);
            errors.push(`Failed to load installments for sale ${sale.id}`);
            return [];
          }
        });

      const installmentResults = await Promise.all(installmentPromises);
      const allInstallments = installmentResults.flat();
      calendarEvents.push(...allInstallments);

      // 4. Load Custom Events
      try {
        const customEvents = await window.electronAPI.database.calendar.getAll();
        if (Array.isArray(customEvents)) {
          calendarEvents.push(...customEvents);
        }
      } catch (error) {
        console.error('Error loading custom events:', error);
        errors.push('Failed to load custom events');
      }



      calendarEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

      setEvents(calendarEvents);
      setLastRefresh(Date.now());



      if (errors.length > 0) {
        console.warn('Calendar data synchronization completed with errors:', errors);
      }
    } catch (error) {
      console.error('Critical error loading calendar events:', error);


    } finally {
      setLoading(false);
    }
  }, [isElectron, dataCache]);



  useEffect(() => {
    if (isElectron) {
      loadCalendarEvents();
    } else {
      setLoading(false);
    }
  }, [isElectron, loadCalendarEvents]);



  useEffect(() => {
    if (!isElectron) return;

    const interval = setInterval(() => {


      if (!document.hidden && !loading) {
        loadCalendarEvents();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isElectron, loading, loadCalendarEvents]);



  useEffect(() => {
    if (!isElectron) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && !loading) {


        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > 2 * 60 * 1000) {
          loadCalendarEvents();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isElectron, loading, lastRefresh, loadCalendarEvents]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2
    }).format(amount).replace('ARS', '$');
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsEventDialogOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setIsEventDialogOpen(true);
  };



  const handleSelectEvent = (eventId: string) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event.id));
    }
  };

  const handleEventSave = async (eventData: Partial<CalendarEvent>) => {




    console.log('Saving event:', eventData);



    if (eventData.type === 'custom' || eventData.type === 'reminder') {
      try {
        if (eventData.id?.startsWith('custom-')) {
          const id = parseInt(eventData.id.replace('custom-', ''));
          await window.electronAPI.database.calendar.update(id, eventData);
        } else {
          await window.electronAPI.database.calendar.create(eventData as any);
        }
      } catch (error) {
        console.error('Error saving custom event:', error);
      }
    }



    dataCache.invalidateCache('sales');
    await loadCalendarEvents(true);
    setIsEventDialogOpen(false);
  };

  const handleEventDelete = async (eventId: string) => {




    console.log('Deleting event:', eventId);



    if (eventId.startsWith('custom-')) {
      try {
        const id = parseInt(eventId.replace('custom-', ''));
        await window.electronAPI.database.calendar.delete(id);
      } catch (error) {
        console.error('Error deleting custom event:', error);
      }
    }



    dataCache.invalidateCache('sales');
    await loadCalendarEvents(true);
    setIsEventDialogOpen(false);
  };

  const handleBulkExport = () => {
    const selectedEventData = filteredEvents.filter(event => selectedEvents.includes(event.id));
    const csvContent = [
      'Title,Date,Type,Status,Amount,Description',
      ...selectedEventData.map(event =>
        `"${event.title}","${event.date.toISOString().split('T')[0]}","${event.type}","${event.status}","${event.amount || 0}","${event.description || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    console.log(`Exported ${selectedEvents.length} events to CSV`);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {


      if (filterType !== 'all' && event.type !== filterType) return false;



      if (filterStatus !== 'all' && event.status !== filterStatus) return false;



      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !event.description?.toLowerCase().includes(searchQuery.toLowerCase())) return false;



      if (dateRange.start && event.date < dateRange.start) return false;
      if (dateRange.end && event.date > dateRange.end) return false;

      return true;
    });
  }, [events, filterType, filterStatus, searchQuery, dateRange]);

  const selectedDateEvents = useMemo(() => {
    return filteredEvents.filter(event =>
      event.date.toDateString() === selectedDate.toDateString()
    );
  }, [filteredEvents, selectedDate]);

  const monthEvents = useMemo(() => {
    return filteredEvents.filter(event => {
      const eventMonth = event.date.getMonth();
      const eventYear = event.date.getFullYear();
      const currentMonthValue = currentMonth.getMonth();
      const currentYear = currentMonth.getFullYear();
      return eventMonth === currentMonthValue && eventYear === currentYear;
    });
  }, [filteredEvents, currentMonth]);



  const stats = useMemo(() => {
    return {
      totalEvents: filteredEvents.length,
      salesEvents: filteredEvents.filter(e => e.type === 'sale').length,
      installmentEvents: filteredEvents.filter(e => e.type === 'installment').length,
      overdueEvents: filteredEvents.filter(e => e.status === 'overdue').length,
      completedEvents: filteredEvents.filter(e => e.status === 'completed').length,
      pendingEvents: filteredEvents.filter(e => e.status === 'pending').length,
      totalAmount: filteredEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
      overdueAmount: filteredEvents.filter(e => e.status === 'overdue').reduce((sum, e) => sum + (e.amount || 0), 0)
    };
  }, [filteredEvents]);



  if (loading && events.length === 0) {
    return <CalendarSkeleton />;
  }

  return (
    <DashboardLayout>
      <div className="p-8 pb-12">
        {/* Toolbar & Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="BUSCAR EVENTOS, CLIENTES O VENTAS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 bg-card border-border/40 rounded-2xl text-[11px] font-bold tracking-widest uppercase outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40 shadow-sm"
            />
          </div>

          <div className="flex items-center gap-3 lg:col-span-2">
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as EventStatus | 'all')}>
              <SelectTrigger className="h-14 bg-card border-border/40 rounded-2xl text-[11px] font-bold tracking-widest uppercase px-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <Filter className="w-3.5 h-3.5 text-primary" />
                  <SelectValue placeholder="ESTADO" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl p-2 bg-background/95 backdrop-blur-xl">
                <SelectItem value="all" className="rounded-xl text-[10px] font-bold uppercase tracking-widest py-3">TODOS LOS EVENTOS</SelectItem>
                <SelectItem value="pending" className="rounded-xl text-[10px] font-bold uppercase tracking-widest py-3">PENDIENTES</SelectItem>
                <SelectItem value="completed" className="rounded-xl text-[10px] font-bold uppercase tracking-widest py-3">COMPLETADOS</SelectItem>
                <SelectItem value="overdue" className="rounded-xl text-[10px] font-bold uppercase tracking-widest py-3 text-red-500">VENCIDOS</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="h-14 rounded-2xl bg-primary text-primary-foreground font-bold tracking-widest uppercase text-[11px] px-8 shadow-lg shadow-primary/20 transition-all flex items-center gap-3"
              onClick={handleNewEvent}
            >
              <Plus className="w-4 h-4" />
              Nuevo Evento
            </Button>

            <Button
              variant="outline"
              className="h-14 w-14 rounded-2xl border-border/40 hover:bg-muted/50 p-0 shadow-sm"
              onClick={handleBulkExport}
              title="Exportar CSV"
            >
              <Download className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {isElectron ? (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            <div className="xl:col-span-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center bg-muted/30 p-1 rounded-xl border border-border/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-background shadow-none"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() - 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="px-4 text-sm font-bold min-w-[140px] text-center uppercase tracking-widest text-primary">
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-lg hover:bg-background shadow-none"
                    onClick={() => {
                      const newMonth = new Date(currentMonth);
                      newMonth.setMonth(newMonth.getMonth() + 1);
                      setCurrentMonth(newMonth);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-xl font-bold uppercase tracking-wider text-[10px] px-5 border-border/40 hover:bg-primary/5 hover:text-primary transition-all duration-300"
                  onClick={() => {
                    const today = new Date();
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(today);
                  }}
                >
                  Hoy
                </Button>
              </div>
              <div className="bg-card rounded-3xl p-6 border border-border/40 shadow-xl shadow-foreground/5 relative overflow-hidden group">
                <CalendarComponent
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  currentMonth={currentMonth}
                  onDateSelect={handleDateSelect}
                  onEventClick={handleEventClick}
                  onMonthChange={setCurrentMonth}
                />
              </div>
            </div>

            <div className="xl:col-span-1 space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Detalles del día
                  </h3>
                </div>
                <Badge variant="outline" className="rounded-lg text-[10px] font-mono border-border/50 font-bold bg-muted/30">
                  {selectedDate.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </Badge>
              </div>

              <div className="bg-transparent min-h-[400px]">
                <EventList
                  events={selectedDateEvents}
                  onEventClick={handleEventClick}
                  selectedEvents={selectedEvents}
                  onSelectEvent={handleSelectEvent}
                />
              </div>

              {/* Quick Actions Card */}
              <div className="bg-muted/30 rounded-3xl p-6 border border-border/10 border-dashed">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">Acciones rápidas</h4>
                <div className="grid grid-cols-1 gap-2">
                  <Button variant="ghost" className="justify-start h-10 text-[10px] font-bold uppercase tracking-widest gap-3 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                    <CreditCard className="w-4 h-4" />
                    Registrar Cobro
                  </Button>
                  <Button variant="ghost" className="justify-start h-10 text-[10px] font-bold uppercase tracking-widest gap-3 rounded-xl hover:bg-orange-500/10 hover:text-orange-600 transition-all">
                    <Clock className="w-4 h-4" />
                    Posponer Cuota
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center group">
            <div className="relative mb-10">
              <div className="relative w-28 h-28 bg-card rounded-[2.5rem] border border-border/50 flex items-center justify-center shadow-2xl">
                <CalendarIcon className="h-12 w-12 text-primary group-hover:scale-105 transition-transform duration-500" />
              </div>
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-4">Calendario No Disponible</h3>
            <p className="text-muted-foreground max-w-sm mx-auto leading-relaxed text-sm font-medium">
              El motor de base de datos local y la sincronización en tiempo real requieren la aplicación de escritorio.
            </p>
            <Button
              variant="outline"
              className="mt-8 h-12 rounded-2xl px-10 border-border/40 font-bold uppercase tracking-widest text-[10px] hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-3" />
              Actualizar Interfaz
            </Button>
          </div>
        )}

        <EventDialog
          event={selectedEvent}
          open={isEventDialogOpen}
          onOpenChange={setIsEventDialogOpen}
          onSave={handleEventSave}
          onDelete={handleEventDelete}
        />
      </div>
    </DashboardLayout>
  );
}
