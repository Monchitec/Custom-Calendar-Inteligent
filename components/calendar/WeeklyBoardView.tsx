"use client";

import { ArrowRight, Check, Plus } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import {
  addDays,
  formatCurrency,
  formatShortDate,
  formatTimeDisplay,
  getWeekDays,
  getWeekdayHeadersMonday,
  toDateKey,
} from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

interface WeeklyBoardViewProps {
  anchorDate: Date;
  todayKey: string;
  itemsByDate: Map<string, ProjectedCalendarItem[]>;
  nextWeekItems: ProjectedCalendarItem[];
  onQuickAddForDate: (dateKey: string) => void;
  onSelectItem: (item: ProjectedCalendarItem) => void;
  onGoNextWeek: () => void;
}

export function WeeklyBoardView({
  anchorDate,
  todayKey,
  itemsByDate,
  nextWeekItems,
  onQuickAddForDate,
  onSelectItem,
  onGoNextWeek,
}: WeeklyBoardViewProps) {
  const { toggleTask } = useCalendarData();
  const weekDays = getWeekDays(anchorDate);
  const weekdayNames = getWeekdayHeadersMonday();
  const nextWeekStart = addDays(weekDays[0], 7);
  const nextWeekEnd = addDays(nextWeekStart, 6);

  return (
    <div className="divide-border border-border bg-card grid grid-cols-1 divide-y overflow-hidden rounded-3xl border shadow-xs sm:grid-cols-2 sm:divide-x lg:min-h-[calc(100dvh-9.75rem)] lg:grid-cols-4 lg:grid-rows-2">
      {weekDays.map((day, idx) => {
        const key = toDateKey(day);
        const isToday = key === todayKey;
        const dayItems = itemsByDate.get(key) ?? [];

        return (
          <section
            key={key}
            className={cn(
              "flex min-h-56 flex-col p-4 transition-colors",
              isToday
                ? "bg-primary-soft/20 ring-primary/45 ring-2 ring-inset"
                : "bg-card",
            )}
          >
            {/* Cabecera centrada estilo Dragon Touch */}
            <div className="mb-3 text-center">
              <div className="inline-flex items-center justify-center gap-1.5">
                <span className="text-foreground text-base font-extrabold sm:text-lg">
                  {weekdayNames[idx]}
                </span>
                <span
                  className={cn(
                    "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-base font-extrabold tabular-nums sm:text-lg",
                    isToday
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 text-xs font-medium tabular-nums">
                {dayItems.length === 0
                  ? "Sin registros"
                  : dayItems.length === 1
                    ? isToday
                      ? "1 registro hoy"
                      : "1 registro"
                    : isToday
                      ? `${dayItems.length} registros hoy`
                      : `${dayItems.length} registros`}
              </p>
            </div>

            {/* Tarjetas con superficies diferenciadas y táctiles:
                - Evento: relleno pastel de categoría
                - Tarea: superficie especial tipo nota/checklist con casilla cuadrada interactiva + 📝
                - Pago: superficie especial tipo recibo/ticket cálido (o verde si pagado) + 💳 + S/ */}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
              {dayItems.map((item) => {
                const slot = getProfileSlotClasses(item.colorSlot);
                const isDone = item.completed || item.billPaid;
                const visual = inferVisualIcon(
                  item.title,
                  item.source,
                  item.visualIcon,
                );

                // 1. TARJETA DE TAREA (Superficie especial tipo Checklist + cuadro interactivo mejorado)
                if (item.source === "task") {
                  const taskSubtitle = item.startTime
                    ? `${formatTimeDisplay(item.startTime)} · ${item.profileLabel}`
                    : `Tarea · ${item.profileLabel}`;

                  return (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectItem(item);
                        }
                      }}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-l-4 px-3 py-2.5 text-left transition-all hover:shadow-xs",
                        item.completed
                          ? "border-success/30 border-l-success bg-success-soft/40 opacity-75"
                          : "border-secondary/25 border-l-secondary bg-surface/90 hover:bg-surface",
                      )}
                    >
                      {/* Cuadro de checklist interactivo y táctil */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTask(item.sourceId);
                        }}
                        aria-label={
                          item.completed
                            ? `Reabrir tarea ${item.title}`
                            : `Completar tarea ${item.title}`
                        }
                        className={cn(
                          "flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-all",
                          item.completed
                            ? "border-success bg-success text-primary-foreground shadow-2xs"
                            : "border-secondary/60 bg-card hover:border-secondary hover:bg-secondary-soft text-transparent",
                        )}
                      >
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-foreground truncate text-xs leading-snug font-bold sm:text-[13px]",
                            item.completed &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {item.title}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              slot.dot,
                            )}
                          />
                          <span className="text-muted-foreground truncate text-[11px] font-semibold tabular-nums">
                            {taskSubtitle}
                          </span>
                        </div>
                      </div>

                      <span className="bg-card/85 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-2xs">
                        <VisualThumb
                          value={visual}
                          alt={item.title}
                          sizeClass="h-5 w-5"
                          textClass="text-sm"
                        />
                      </span>
                    </div>
                  );
                }

                // 2. TARJETA DE PAGO (Superficie especial tipo Recibo/Ticket financiero)
                if (item.source === "bill") {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className={cn(
                        "group flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-l-4 px-3 py-2.5 text-left transition-all hover:shadow-xs hover:brightness-98",
                        item.billPaid
                          ? "border-success/35 border-l-success bg-success-soft/45 opacity-80"
                          : "border-warning/35 border-l-cat-bills bg-warning-soft/55",
                      )}
                    >
                      <span className="bg-card/90 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-2xs">
                        <VisualThumb
                          value={visual}
                          alt={item.title}
                          sizeClass="h-5 w-5"
                          textClass="text-base"
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-foreground truncate text-xs leading-snug font-bold sm:text-[13px]",
                            item.billPaid && "line-through",
                          )}
                        >
                          {item.title}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "text-[11px] font-bold",
                              item.billPaid ? "text-success" : "text-warning",
                            )}
                          >
                            {item.billPaid ? "Pagado ✓" : "Pendiente"}
                          </span>
                          {typeof item.amount === "number" && (
                            <span
                              className={cn(
                                "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums",
                                item.billPaid
                                  ? "bg-card/85 text-success"
                                  : "bg-card/90 text-cat-bills shadow-2xs",
                              )}
                            >
                              {formatCurrency(item.amount, item.currency, true)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                }

                // 3. TARJETA DE EVENTO / CITA (Bloque pastel de categoría)
                const eventSubtitle =
                  item.allDay || !item.startTime
                    ? item.profileLabel
                    : item.endTime
                      ? `${formatTimeDisplay(item.startTime)} – ${formatTimeDisplay(item.endTime)}`
                      : formatTimeDisplay(item.startTime);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectItem(item)}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-start gap-2.5 rounded-xl border-l-4 px-3 py-2.5 text-left transition-all hover:shadow-xs hover:brightness-97",
                      slot.block,
                      isDone && "opacity-65",
                    )}
                  >
                    <VisualThumb
                      value={visual}
                      alt={item.title}
                      sizeClass="mt-0.5 h-6 w-6"
                      textClass="mt-0.5 text-lg"
                      roundedClass="rounded-lg"
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-foreground truncate text-xs leading-snug font-bold sm:text-[13px]",
                          isDone && "line-through",
                        )}
                      >
                        {item.title}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="text-muted-foreground text-[11px] font-semibold tabular-nums">
                          {eventSubtitle}
                        </span>
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            slot.dot,
                          )}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => onQuickAddForDate(key)}
                aria-label={`Agregar evento el ${key}`}
                title="Agregar evento"
                className="border-border/70 text-muted-foreground hover:border-primary/40 hover:bg-primary-soft hover:text-primary focus-visible:ring-primary mt-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center self-center rounded-full border border-dashed transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>
        );
      })}

      {/* Octava celda: Próxima semana */}
      <section className="bg-surface/40 flex min-h-56 flex-col p-4">
        <div className="mb-3 text-center">
          <h3 className="text-foreground text-base font-extrabold sm:text-lg">
            Próxima semana
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs font-medium tabular-nums">
            {formatShortDate(toDateKey(nextWeekStart))} —{" "}
            {formatShortDate(toDateKey(nextWeekEnd))}
          </p>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {nextWeekItems.slice(0, 3).map((item) => {
            const slot = getProfileSlotClasses(item.colorSlot);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectItem(item)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-l-4 px-3 py-2 text-left text-xs transition-all hover:brightness-97",
                  slot.block,
                )}
              >
                <span className="truncate font-bold">{item.title}</span>
                <span className="text-muted-foreground shrink-0 text-[11px] font-semibold tabular-nums">
                  {formatShortDate(item.date)}
                </span>
              </button>
            );
          })}

          {nextWeekItems.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-xs">
              Sin compromisos programados aún
            </p>
          )}

          <button
            type="button"
            onClick={onGoNextWeek}
            className="bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground mt-auto inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors"
          >
            Ir a la próxima semana
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </section>
    </div>
  );
}
