"use client";

import { CheckSquare2, Plus, Square } from "lucide-react";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  getWeekDays,
  getWeekdayHeadersMonday,
  pad2,
  toDateKey,
} from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

interface WeekViewProps {
  anchorDate: Date;
  todayKey: string;
  itemsByDate: Map<string, ProjectedCalendarItem[]>;
  onSelectDate: (dateKey: string) => void;
  onQuickAddForDate: (dateKey: string, startTime?: string) => void;
  onSelectItem: (
    item: ProjectedCalendarItem,
    anchorEl?: HTMLElement | null,
  ) => void;
}

const START_HOUR = 7; // 07:00
const END_HOUR = 21; // 21:00 (cubre hasta 22:00)
const HOUR_HEIGHT_PX = 68;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, i) => START_HOUR + i,
);

function timeToMinutes(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

interface PositionedBlock {
  item: ProjectedCalendarItem;
  topPx: number;
  heightPx: number;
  colIndex: number;
  totalCols: number;
  timeRangeLabel: string;
}

function layoutTimedBlocks(items: ProjectedCalendarItem[]): PositionedBlock[] {
  const minBound = START_HOUR * 60;
  const maxBound = (END_HOUR + 1) * 60;

  const parsed = items
    .map((item) => {
      const rawStart = timeToMinutes(item.startTime) ?? 9 * 60;
      const rawEnd = timeToMinutes(item.endTime) ?? rawStart + 60;
      const clampedStart = Math.max(
        minBound,
        Math.min(maxBound - 30, rawStart),
      );
      const clampedEnd = Math.max(
        clampedStart + 35,
        Math.min(maxBound, rawEnd > rawStart ? rawEnd : rawStart + 60),
      );
      return {
        item,
        startMin: clampedStart,
        endMin: clampedEnd,
        timeRangeLabel: item.endTime
          ? `${item.startTime}–${item.endTime}`
          : `${item.startTime ?? ""}`,
      };
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  // Asignar subcolumnas cuando dos bloques se solapan en horario
  const columnsEnd: number[] = [];
  const temp = parsed.map((entry) => {
    let col = columnsEnd.findIndex((endMin) => endMin <= entry.startMin);
    if (col === -1) {
      col = columnsEnd.length;
      columnsEnd.push(entry.endMin);
    } else {
      columnsEnd[col] = entry.endMin;
    }
    return { ...entry, colIndex: col };
  });

  return temp.map((entry) => {
    // Contar cuántos bloques simultáneos comparten ventana con este
    const overlappingMaxCol = temp
      .filter(
        (other) =>
          other.startMin < entry.endMin && other.endMin > entry.startMin,
      )
      .reduce((max, other) => Math.max(max, other.colIndex), entry.colIndex);

    const topPx = ((entry.startMin - minBound) / 60) * HOUR_HEIGHT_PX;
    const heightPx = Math.max(
      46,
      ((entry.endMin - entry.startMin) / 60) * HOUR_HEIGHT_PX - 3,
    );

    return {
      item: entry.item,
      topPx,
      heightPx,
      colIndex: entry.colIndex,
      totalCols: overlappingMaxCol + 1,
      timeRangeLabel: entry.timeRangeLabel,
    };
  });
}

export function WeekView({
  anchorDate,
  todayKey,
  itemsByDate,
  onSelectDate,
  onQuickAddForDate,
  onSelectItem,
}: WeekViewProps) {
  const weekDays = getWeekDays(anchorDate);
  const weekdayNames = getWeekdayHeadersMonday();
  const totalGridHeight = HOURS.length * HOUR_HEIGHT_PX;

  const hasAnyAllDay = weekDays.some((d) => {
    const list = itemsByDate.get(toDateKey(d)) ?? [];
    return list.some((i) => i.allDay || !i.startTime);
  });

  return (
    <div className="border-border bg-card relative flex flex-col overflow-hidden rounded-3xl border shadow-xs">
      {/* Encabezado de columnas estilo Dragon Touch (Imagen 1: Lun 23, Mar 24...) */}
      <div className="border-border bg-surface/60 grid grid-cols-[56px_repeat(7,minmax(125px,1fr))] border-b sm:grid-cols-[68px_repeat(7,minmax(0,1fr))]">
        <div className="border-border border-r" />
        {weekDays.map((day, idx) => {
          const key = toDateKey(day);
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              onClick={() => onSelectDate(key)}
              className={cn(
                "group border-border hover:bg-card-hover relative flex cursor-pointer items-center justify-center gap-2 border-r px-2 py-3.5 transition-colors last:border-r-0",
                isToday && "bg-primary-soft/45",
              )}
            >
              <span
                className={cn(
                  "text-sm font-bold sm:text-base",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {weekdayNames[idx]}
              </span>
              <span
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-1.5 text-sm font-extrabold tabular-nums sm:text-base",
                  isToday
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddForDate(key);
                }}
                aria-label={`Agregar evento el ${key}`}
                className="text-muted-foreground hover:bg-primary-soft hover:text-primary absolute right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Franja Todo el día / Pagos recurrentes */}
      {hasAnyAllDay && (
        <div className="border-border bg-surface/30 grid grid-cols-[56px_repeat(7,minmax(125px,1fr))] border-b sm:grid-cols-[68px_repeat(7,minmax(0,1fr))]">
          <div className="border-border text-muted-foreground flex items-center justify-end border-r px-2 py-2 text-right text-[10px] font-bold tracking-wide uppercase">
            Día / Pagos
          </div>
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const allDayList = (itemsByDate.get(key) ?? []).filter(
              (i) => i.allDay || !i.startTime,
            );
            return (
              <div
                key={key}
                className="border-border flex flex-col gap-1 border-r p-1.5 last:border-r-0"
              >
                {allDayList.map((item) => {
                  const slot = getProfileSlotClasses(item.colorSlot);
                  const isDone = item.completed || item.billPaid;
                  const sticker = inferVisualIcon(
                    item.title,
                    item.source,
                    item.visualIcon,
                  );
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={(e) => onSelectItem(item, e.currentTarget)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[11px] font-bold transition-all hover:brightness-97",
                        item.source === "task"
                          ? "border-border bg-card text-foreground border"
                          : item.source === "bill"
                            ? item.billPaid
                              ? "border-success/35 border-l-success bg-success-soft/50 text-foreground border border-l-[3px]"
                              : cn("border-l-[3px]", slot.block)
                            : cn("border-l-[3px]", slot.block),
                        isDone && "line-through opacity-60",
                      )}
                    >
                      <VisualThumb
                        value={sticker}
                        sizeClass="h-4 w-4"
                        textClass="text-xs"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {item.title}
                      </span>
                      {item.source === "bill" &&
                        typeof item.amount === "number" && (
                          <span
                            className={cn(
                              "shrink-0 rounded px-1.5 py-px text-[10px] font-extrabold tabular-nums",
                              item.billPaid
                                ? "bg-success-soft text-success"
                                : slot.badge,
                            )}
                          >
                            {formatCurrency(item.amount, item.currency, true)}
                          </span>
                        )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Cuadrícula horaria proporcional (Imagen 1: 07:00 a 21:00 con bloques grandes de color) */}
      <div className="max-h-[calc(100dvh-12.5rem)] min-h-[480px] overflow-x-auto overflow-y-auto">
        <div
          className="grid min-w-[920px] grid-cols-[56px_repeat(7,minmax(0,1fr))] sm:min-w-0 sm:grid-cols-[68px_repeat(7,minmax(0,1fr))]"
          style={{ height: `${totalGridHeight}px` }}
        >
          {/* Eje de horas */}
          <div className="border-border bg-surface/25 relative border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: `${HOUR_HEIGHT_PX}px` }}
                className="text-muted-foreground pt-1.5 pr-2.5 text-right font-mono text-xs font-semibold tabular-nums"
              >
                {pad2(hour)}:00
              </div>
            ))}
          </div>

          {/* 7 columnas con bloques proporcionales a su duración */}
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const timedItems = (itemsByDate.get(key) ?? []).filter(
              (i) => !i.allDay && Boolean(i.startTime),
            );
            const positioned = layoutTimedBlocks(timedItems);

            return (
              <div
                key={key}
                className={cn(
                  "border-border relative border-r last:border-r-0",
                  isToday ? "bg-primary-soft/15" : "bg-card",
                )}
              >
                {/* Líneas horarias divididas cada 30 minutos (doble clic para agendar en esa hora) */}
                {HOURS.map((hour) => {
                  const slot00 = `${pad2(hour)}:00`;
                  const slot30 = `${pad2(hour)}:30`;
                  return (
                    <div
                      key={hour}
                      style={{ height: `${HOUR_HEIGHT_PX}px` }}
                      className="border-border flex flex-col border-b"
                    >
                      <div
                        onDoubleClick={() => onQuickAddForDate(key, slot00)}
                        title={`Doble clic para agendar a las ${slot00}`}
                        className="border-muted-foreground/25 hover:bg-card-hover/70 flex-1 border-b border-dashed transition-colors"
                      />
                      <div
                        onDoubleClick={() => onQuickAddForDate(key, slot30)}
                        title={`Doble clic para agendar a las ${slot30}`}
                        className="hover:bg-card-hover/70 flex-1 transition-colors"
                      />
                    </div>
                  );
                })}

                {/* Bloques de eventos y tareas posicionados según hora y duración (Imagen 1 con stickers visuales) */}
                {positioned.map((block) => {
                  const slot = getProfileSlotClasses(block.item.colorSlot);
                  const isDone = block.item.completed || block.item.billPaid;
                  const sticker = inferVisualIcon(
                    block.item.title,
                    block.item.source,
                    block.item.visualIcon,
                  );
                  const widthPct = 90 / block.totalCols;
                  const leftPct = block.colIndex * widthPct;

                  const blockSurface =
                    block.item.source === "task"
                      ? "bg-card border border-border text-foreground"
                      : cn("border-l-4", slot.block);

                  return (
                    <button
                      key={block.item.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectItem(block.item, e.currentTarget);
                      }}
                      style={{
                        top: `${block.topPx + 1}px`,
                        height: `${block.heightPx}px`,
                        left: `calc(${leftPct}% + 3px)`,
                        width: `calc(${widthPct}% - 5px)`,
                      }}
                      className={cn(
                        "absolute z-10 flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl px-2.5 py-1.5 text-left shadow-2xs transition-all hover:z-20 hover:shadow-md hover:brightness-97",
                        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
                        blockSurface,
                        isDone && "opacity-65",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-start gap-1.5">
                          {block.item.source === "task" &&
                            (isDone ? (
                              <CheckSquare2 className="text-success mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ) : (
                              <Square className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                            ))}
                          <p
                            className={cn(
                              "text-foreground line-clamp-2 flex-1 text-xs leading-snug font-bold",
                              isDone && "line-through",
                            )}
                          >
                            {block.item.title}
                          </p>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold tabular-nums">
                          {block.timeRangeLabel}
                        </p>
                      </div>

                      {block.heightPx >= 56 && (
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-muted-foreground truncate text-[10px] font-semibold">
                            {block.item.source === "task"
                              ? "Tarea"
                              : (block.item.location ??
                                block.item.profileLabel)}
                          </span>
                          <VisualThumb
                            value={sticker}
                            sizeClass="h-5 w-5"
                            textClass="text-base"
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón flotante fijo en la esquina inferior derecha de la pantalla */}
      <button
        type="button"
        onClick={() => onQuickAddForDate(todayKey)}
        aria-label="Nuevo evento"
        title="Agregar nuevo evento"
        className="bg-primary hover:bg-primary-hover text-primary-foreground focus-visible:ring-primary fixed right-6 bottom-6 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full shadow-xl transition-all hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:outline-none"
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
}
