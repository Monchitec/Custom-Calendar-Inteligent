"use client";

import { useState } from "react";
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
  itemsByDate: Map<string, ProjectedCalendarItem[]>;
  onOpenDayDrawer: (dateKey: string) => void;
  onQuickAddForDate: (dateKey: string) => void;
  onSelectItem: (
    item: ProjectedCalendarItem,
    anchorEl?: HTMLElement | null,
  ) => void;
}

export function MonthGrid({
  anchorDate,
  todayKey,
  itemsByDate,
  onOpenDayDrawer,
  onQuickAddForDate,
  onSelectItem,
}: MonthGridProps) {
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const days = getMonthGridDays(year, month);
  const headers = getWeekdayHeadersMonday();

  return (
    <div className="border-border bg-card flex h-[calc(100dvh-12.5rem)] min-h-[460px] flex-col overflow-hidden rounded-2xl border shadow-xs sm:rounded-3xl md:h-[calc(100dvh-8.25rem)] md:min-h-[540px]">
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
          const isSelected = key === selectedDayKey;
          const dayItems = itemsByDate.get(key) ?? [];
          const visibleItems = dayItems.slice(0, 3);
          const overflowCount = dayItems.length - visibleItems.length;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedDayKey(key)}
              onDoubleClick={() => onOpenDayDrawer(key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenDayDrawer(key);
                }
              }}
              aria-label={`Día ${day.getDate()}, ${dayItems.length} registros. Doble clic para abrir el día`}
              className={cn(
                "group bg-card hover:bg-card-hover/80 relative flex min-h-0 cursor-pointer flex-col overflow-hidden p-1 transition-colors sm:p-1.5",
                "focus-visible:ring-primary focus-visible:z-10 focus-visible:ring-2 focus-visible:outline-none",
                isToday &&
                  "bg-primary-soft/35 ring-primary/45 ring-2 ring-inset",
                !isToday &&
                  isSelected &&
                  "bg-primary-soft/20 ring-primary/40 ring-1 ring-inset",
              )}
            >
              {/* Fila superior: números compactos y legibles sin traslapar eventos */}
              <div className="mb-1 flex shrink-0 items-center justify-between gap-0.5">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs leading-none font-extrabold tabular-nums sm:h-6 sm:min-w-6 sm:text-sm",
                      isToday
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {isToday && (
                    <span className="bg-primary-soft text-primary hidden rounded-full px-1.5 py-0.5 text-[9px] leading-none font-extrabold tracking-wide uppercase lg:inline">
                      Hoy
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-0.5">
                  {overflowCount > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDayDrawer(key);
                      }}
                      title={`Ver los ${dayItems.length} registros de este día`}
                      className="bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer rounded-md px-1 py-0.5 text-[9px] leading-none font-extrabold tabular-nums transition-colors sm:px-1.5 sm:text-[10px]"
                    >
                      +{overflowCount}
                    </button>
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
                          onSelectItem(item, e.currentTarget);
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
                          onSelectItem(item, e.currentTarget);
                        }}
                        title={
                          typeof item.amount === "number"
                            ? `Pago: ${item.title} · ${formatCurrency(item.amount, item.currency)}`
                            : item.title
                        }
                        className={cn(
                          "flex w-full min-w-0 cursor-pointer items-center justify-between gap-1 overflow-hidden rounded-sm border border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight transition-all hover:brightness-97 sm:rounded-md sm:px-1.5",
                          item.billPaid
                            ? "border-success/35 border-l-success bg-success-soft/50 opacity-80"
                            : slot.block,
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
                        onSelectItem(item, e.currentTarget);
                      }}
                      title={item.title}
                      className={cn(
                        "flex w-full min-w-0 cursor-pointer items-center gap-1 overflow-hidden rounded-sm border-l-[3px] px-1 py-0.5 text-left text-[11px] leading-tight transition-all hover:brightness-96 sm:rounded-md sm:px-1.5",
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
