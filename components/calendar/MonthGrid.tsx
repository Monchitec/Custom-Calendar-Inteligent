"use client";

import { CheckSquare2, Plus, Square } from "lucide-react";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  getMonthGridDays,
  getWeekdayHeadersMonday,
  toDateKey,
} from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

interface MonthGridProps {
  anchorDate: Date;
  todayKey: string;
  selectedDateKey: string;
  itemsByDate: Map<string, ProjectedCalendarItem[]>;
  onOpenDayDrawer: (dateKey: string) => void;
  onQuickAddForDate: (dateKey: string) => void;
  onSelectItem: (item: ProjectedCalendarItem) => void;
}

export function MonthGrid({
  anchorDate,
  todayKey,
  selectedDateKey,
  itemsByDate,
  onOpenDayDrawer,
  onQuickAddForDate,
  onSelectItem,
}: MonthGridProps) {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const days = getMonthGridDays(year, month);
  const headers = getWeekdayHeadersMonday();

  return (
    <div className="border-border bg-card flex h-[calc(100dvh-13rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border shadow-xs sm:rounded-3xl md:h-[calc(100dvh-9.25rem)] md:min-h-[470px]">
      {/* Encabezados de días */}
      <div className="border-border bg-surface/65 grid shrink-0 grid-cols-7 border-b">
        {headers.map((dayName, index) => (
          <div
            key={dayName}
            className={cn(
              "px-1 py-1.5 text-center text-[11px] font-extrabold tracking-wider uppercase sm:px-2 sm:py-2 sm:text-xs",
              index >= 5 ? "text-primary" : "text-muted-foreground",
            )}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Cuadrícula autoajustada mostrando únicamente los días del mes actual */}
      <div className="divide-border grid min-h-0 flex-1 auto-rows-fr grid-cols-7 divide-x divide-y">
        {days.map((day) => {
          const key = toDateKey(day);
          const isCurrentMonth = day.getMonth() === month;

          if (!isCurrentMonth) {
            return (
              <div
                key={key}
                aria-hidden="true"
                className="bg-surface/35 min-h-0"
              />
            );
          }

          const isToday = key === todayKey;
          const isSelected = key === selectedDateKey;
          const dayItems = itemsByDate.get(key) ?? [];
          const visibleItems = dayItems.slice(0, 2);
          const overflowCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDayDrawer(key)}
              onDoubleClick={() => onQuickAddForDate(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenDayDrawer(key);
                }
              }}
              aria-label={`Día ${day.getDate()}, ${dayItems.length} registros`}
              className={cn(
                "group bg-card hover:bg-card-hover/80 relative flex min-h-0 cursor-pointer flex-col overflow-hidden p-1 transition-colors sm:p-1.5",
                "focus-visible:ring-primary focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none",
                isToday &&
                  "bg-primary-soft/35 ring-primary/45 ring-2 ring-inset",
                isSelected && !isToday && "ring-primary/35 ring-2 ring-inset",
              )}
            >
              {/* Fila superior: números grandes y legibles */}
              <div className="mb-0.5 flex shrink-0 items-center justify-between gap-0.5 sm:mb-1">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-base leading-none font-extrabold tabular-nums sm:h-8 sm:min-w-8 sm:text-lg",
                      isToday
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {isToday && (
                    <span className="bg-primary-soft text-primary hidden rounded-full px-1.5 py-0.5 text-[10px] leading-none font-extrabold tracking-wide uppercase lg:inline">
                      Hoy
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  {overflowCount > 0 && (
                    <span className="bg-primary-soft text-primary rounded-md px-1 py-0.5 text-[9px] leading-none font-extrabold tabular-nums sm:px-1.5 sm:text-[10px]">
                      +{overflowCount}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAddForDate(key);
                    }}
                    aria-label={`Agregar evento el ${key}`}
                    className="text-muted-foreground hover:bg-primary-soft hover:text-primary hidden h-5 w-5 cursor-pointer items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100 sm:flex"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Estrategia visual sin ruido cromático:
                  1. EVENTOS: únicos con bloque pastel relleno + hora a la IZQUIERDA
                  2. TAREAS: fila minimalista sin fondo de color + casilla cuadrada ☐ + hora a la IZQUIERDA
                  3. PAGOS: ticket neutro con insignia destacada de dinero S/ (verde pagado / ámbar pendiente) */}
              <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden sm:gap-1">
                {visibleItems.map((item) => {
                  const slot = getProfileSlotClasses(item.colorSlot);
                  const isDone = item.completed || item.billPaid;
                  const visual = inferVisualIcon(
                    item.title,
                    item.source,
                    item.visualIcon,
                  );

                  if (item.source === "task") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        title={`Tarea: ${item.title}`}
                        className={cn(
                          "hover:bg-muted/70 flex w-full min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-sm px-1 py-0.5 text-left text-[11px] leading-tight transition-colors sm:rounded-md sm:px-1.5 sm:py-1 sm:text-xs",
                          isDone && "opacity-55",
                        )}
                      >
                        {item.completed ? (
                          <CheckSquare2 className="text-success h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <Square className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                        )}
                        {!item.allDay && item.startTime && (
                          <span className="text-muted-foreground hidden shrink-0 text-[11px] font-bold tabular-nums lg:inline">
                            {item.startTime}
                          </span>
                        )}
                        <span
                          className={cn(
                            "text-foreground min-w-0 flex-1 truncate font-semibold",
                            isDone && "line-through",
                          )}
                        >
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "hidden h-1.5 w-1.5 shrink-0 rounded-full xl:inline-block",
                            slot.dot,
                          )}
                        />
                      </button>
                    );
                  }

                  if (item.source === "bill") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item);
                        }}
                        title={
                          typeof item.amount === "number"
                            ? `Pago: ${item.title} · ${formatCurrency(item.amount, item.currency)}`
                            : item.title
                        }
                        className={cn(
                          "border-border bg-card hover:bg-card-hover flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 overflow-hidden rounded-sm border px-1 py-0.5 text-left text-[11px] leading-tight transition-colors sm:rounded-md sm:px-1.5 sm:py-1 sm:text-xs",
                          isDone && "opacity-60",
                        )}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                          <VisualThumb
                            value={visual}
                            sizeClass="h-4 w-4"
                            textClass="text-xs"
                            className="hidden lg:inline-flex"
                          />
                          <span
                            className={cn(
                              "text-foreground min-w-0 flex-1 truncate font-semibold",
                              isDone && "line-through",
                            )}
                          >
                            {item.title}
                          </span>
                        </span>
                        {typeof item.amount === "number" && (
                          <span
                            className={cn(
                              "hidden shrink-0 rounded px-1 py-px text-[11px] font-extrabold tabular-nums lg:inline",
                              item.billPaid
                                ? "bg-success-soft text-success"
                                : "bg-warning-soft text-warning",
                            )}
                          >
                            {formatCurrency(item.amount, item.currency, true)}
                          </span>
                        )}
                      </button>
                    );
                  }

                  // EVENTO / CITA: hora al inicio (izquierda del ícono) + tipografía más legible
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(item);
                      }}
                      title={item.title}
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-sm border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight transition-all hover:brightness-96 sm:rounded-md sm:px-1.5 sm:py-1 sm:text-xs",
                        slot.block,
                        isDone && "opacity-60",
                      )}
                    >
                      {!item.allDay && item.startTime && (
                        <span className="text-foreground/80 hidden shrink-0 text-[11px] font-extrabold tabular-nums sm:text-xs lg:inline">
                          {item.startTime}
                        </span>
                      )}
                      <VisualThumb
                        value={visual}
                        sizeClass="h-4 w-4"
                        textClass="text-xs"
                        className="hidden lg:inline-flex"
                      />
                      <span
                        className={cn(
                          "text-foreground min-w-0 flex-1 truncate font-bold",
                          isDone && "line-through",
                        )}
                      >
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
