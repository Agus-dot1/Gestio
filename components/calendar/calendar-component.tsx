'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MoreHorizontal, Plus, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarDay, CalendarWeek } from '@/lib/calendar-types';
import { isSameDay, isSameMonth, isToday, getEventTypeColor, getEventStatusColor } from '@/lib/calendar-types';

interface CalendarComponentProps {
  events: CalendarEvent[];
  selectedDate: Date;
  currentMonth: Date;
  timeZone?: string;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export function CalendarComponent({
  events,
  selectedDate,
  currentMonth,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  onDateSelect,
  onMonthChange,
  onEventClick
}: CalendarComponentProps) {
  const [calendarDays, setCalendarDays] = useState<CalendarWeek[]>([]);


  const spanishShortWeekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];



  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();



    const firstDay = new Date(year, month, 1);


    const lastDay = new Date(year, month + 1, 0);



    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());



    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const weeks: CalendarWeek[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const week: CalendarDay[] = [];

      for (let i = 0; i < 7; i++) {
        const dayEvents = events.filter(event => isSameDay(event.date, currentDate, timeZone));

        week.push({
          date: new Date(currentDate),
          isCurrentMonth: isSameMonth(currentDate, currentMonth, timeZone),
          isToday: isToday(currentDate, timeZone),
          isSelected: isSameDay(currentDate, selectedDate, timeZone),
          events: dayEvents
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push({ days: week });
    }

    setCalendarDays(weeks);
  }, [currentMonth, events, selectedDate, timeZone]);

  useEffect(() => {
    generateCalendarDays();
  }, [generateCalendarDays]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    onMonthChange(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    onMonthChange(today);
    onDateSelect(today);
  };

  const handleDateClick = (date: Date) => {
    onDateSelect(date);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick(event);
  };



  const gridRef = useRef<HTMLDivElement>(null);



  const handleKeyDown = (e: React.KeyboardEvent, date: Date, weekIndex: number, dayIndex: number) => {


    if (['Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
    }



    if (e.key === 'Enter' || e.key === ' ') {
      handleDateClick(date);
      return;
    }



    if (!gridRef.current) return;

    const totalWeeks = calendarDays.length;
    const totalDays = 7;

    let newWeekIndex = weekIndex;
    let newDayIndex = dayIndex;

    switch (e.key) {
      case 'ArrowUp':


        newWeekIndex = Math.max(0, weekIndex - 1);
        break;
      case 'ArrowDown':


        newWeekIndex = Math.min(totalWeeks - 1, weekIndex + 1);
        break;
      case 'ArrowLeft':


        if (dayIndex > 0) {
          newDayIndex = dayIndex - 1;
        } else if (weekIndex > 0) {


          newWeekIndex = weekIndex - 1;
          newDayIndex = totalDays - 1;
        }
        break;
      case 'ArrowRight':


        if (dayIndex < totalDays - 1) {
          newDayIndex = dayIndex + 1;
        } else if (weekIndex < totalWeeks - 1) {


          newWeekIndex = weekIndex + 1;
          newDayIndex = 0;
        }
        break;
      case 'Home':


        newDayIndex = 0;
        break;
      case 'End':


        newDayIndex = totalDays - 1;
        break;
      default:
        return; // Do nothing for other keys
    }



    const newDateCell = gridRef.current.querySelector(`[data-week="${newWeekIndex}"][data-day="${newDayIndex}"]`) as HTMLElement | null;
    if (newDateCell) {
      newDateCell.focus();
    }
  };

  return (
    <Card className="w-full border-none shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="grid grid-cols-7 gap-px mb-4 bg-border/20 rounded-xl overflow-hidden border border-border/40">
          {/* Encabezados de días */}
          {[0, 1, 2, 3, 4, 5, 6].map(day => (
            <div
              key={day}
              className="p-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/30"
            >
              {spanishShortWeekdays[day]}
            </div>
          ))}
        </div>

        <div ref={gridRef} className="grid grid-cols-7 gap-px bg-border/20 rounded-2xl overflow-hidden border border-border/40">
          {calendarDays.map((week, weekIndex) =>
            week.days.map((day, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                data-week={weekIndex}
                data-day={dayIndex}
                className={cn(
                  'min-h-[100px] sm:min-h-[140px] p-2 transition-all duration-200 cursor-pointer overflow-hidden',
                  'hover:bg-muted/30 focus:outline-none focus:bg-muted/40 relative group',
                  day.isCurrentMonth ? 'bg-card' : 'bg-muted/10',
                  {
                    'ring-inset ring-2 ring-primary bg-primary/5': day.isSelected,
                  }
                )}
                onClick={() => handleDateClick(day.date)}
                onKeyDown={(e) => handleKeyDown(e, day.date, weekIndex, dayIndex)}
                tabIndex={0}
                role="button"
                aria-label={`${day.date.toLocaleDateString('es-ES')}, ${day.events.length} eventos`}
              >
                <div className="flex flex-col h-full relative z-10">
                  {/* Número de día */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      'text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors',
                      day.isToday && !day.isSelected ? 'bg-primary text-primary-foreground shadow-sm' :
                        day.isSelected ? 'text-primary' :
                          day.isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/50'
                    )}>
                      {day.date.getDate()}
                    </span>
                    {day.events.length > 0 && !day.isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    )}
                  </div>

                  {/* Events */}
                  <div className="flex-1 space-y-1.5 overflow-hidden">
                    {day.events.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          'text-[10px] p-1.5 rounded-lg border leading-tight transition-all duration-200',
                          'backdrop-blur-sm shadow-sm',
                          getEventTypeColor(event.type).replace('bg-', 'bg-').replace('text-', 'text-'),
                          'border-white/10 dark:border-black/10'
                        )}
                        onClick={(e) => handleEventClick(event, e)}
                        title={`${event.title} - ${event.description}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <div className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            getEventStatusColor(event.status).startsWith('bg-')
                              ? getEventStatusColor(event.status)
                              : `bg-${getEventStatusColor(event.status).split('-')[1]}-500`
                          )} />
                          <span className="truncate font-bold tracking-tight uppercase opacity-90">
                            {event.title.split(':')[1]?.trim() || event.title}
                          </span>
                        </div>
                        {event.amount && (
                          <div className="text-[9px] font-medium opacity-80 mt-0.5 ml-3 font-mono">
                            ${event.amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Show more indicator with popover */}
                    {day.events.length > 3 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <div className="text-[10px] font-bold text-muted-foreground bg-muted/50 rounded-lg py-1 px-2 cursor-pointer hover:bg-muted transition-colors flex items-center justify-center gap-1 mt-1">
                            <Plus className="w-3 h-3" />
                            {day.events.length - 3} más
                          </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-0 border-none shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl bg-background/90" align="center">
                          <div className="p-4 border-b border-border/10">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                              <CalendarIcon className="w-3 h-3" />
                              Eventos del {day.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </h4>
                          </div>
                          <div className="max-h-60 overflow-y-auto p-2 space-y-2">
                            {day.events.map((event) => (
                              <div
                                key={event.id}
                                className={cn(
                                  'text-[10px] p-2.5 rounded-xl border cursor-pointer transition-all duration-200',
                                  getEventTypeColor(event.type),
                                  'border-white/5 shadow-sm'
                                )}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEventClick(event, e);
                                }}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn(
                                      'w-2 h-2 rounded-full flex-shrink-0',
                                      getEventStatusColor(event.status).startsWith('bg-')
                                        ? getEventStatusColor(event.status)
                                        : `bg-${getEventStatusColor(event.status).split('-')[1]}-500`
                                    )} />
                                    <span className="font-bold truncate uppercase tracking-tight">
                                      {event.title}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className={cn('text-[9px] px-1.5 h-4 border-white/20 uppercase tracking-widest font-bold', getEventStatusColor(event.status))}>
                                    {event.status === 'completed' ? 'PAGADO' : event.status === 'pending' ? 'PENDIENTE' : 'VENCIDO'}
                                  </Badge>
                                </div>
                                {event.amount && (
                                  <div className="text-[10px] items-center flex gap-1 font-mono font-bold mt-1 opacity-80">
                                    <DollarSign className="w-3 h-3" />
                                    {event.amount.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="mt-8 p-6 bg-muted/20 rounded-2xl border border-border/40 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/40" />
              <span>Ventas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" />
              <span>Cuotas</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/40" />
              <span>Recordatorios</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/40" />
              <span>Vencido</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

  );
}
