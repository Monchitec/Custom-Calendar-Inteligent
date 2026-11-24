"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { formatLongDate, pad2 } from "@/lib/dates";
import type { ProjectedCalendarItem } from "@/types/calendar";
import { EventPill } from "./EventPill";

interface DayViewProps {
  anchorDate: Date;
  dateKey: string;
  items: ProjectedCalendarItem[];
  onQuickAddForDate: (dateKey: string) => void;
  onSelectItem: (item: ProjectedCalendarItem) => void;
}

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 .. 22:00

export function DayView({
  anchorDate,
  dateKey,
  items,
  onQuickAddForDate,
  onSelectItem,
}: DayViewProps) {
  const allDayItems = items.filter((i) => i.allDay || !i.startTime);
  const timedItems = items.filter((i) => !i.allDay && Boolean(i.startTime));

  return (
    <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-xs">
      <div className="border-border bg-surface/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="text-foreground text-lg font-extrabold">
            {formatLongDate(anchorDate)}
          </h2>
          <p className="text-muted-foreground text-xs tabular-nums">
            {items.length}{" "}
            {items.length === 1
              ? "registro programado"
              : "registros programados"}
          </p>
        </div>
        <Button
          variant="soft"
          size="sm"
          onClick={() => onQuickAddForDate(dateKey)}
        >
          <Plus className="h-4 w-4" />
          Agendar en este día
        </Button>
      </div>

      {/* Franja Todo el día / Pagos */}
      {allDayItems.length > 0 && (
        <div className="border-border bg-primary-soft/25 border-b px-5 py-3">
          <p className="text-muted-foreground mb-2 text-[11px] font-bold tracking-wider uppercase">
            Todo el día y Pagos
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {allDayItems.map((item) => (
              <EventPill key={item.id} item={item} onClick={onSelectItem} />
            ))}
          </div>
        </div>
      )}

      {/* Línea de tiempo por hora */}
      <div className="divide-border divide-y">
        {HOURS.map((hour) => {
          const hourPrefix = `${pad2(hour)}:`;
          const hourItems = timedItems.filter((i) =>
            i.startTime?.startsWith(hourPrefix),
          );

          return (
            <div
              key={hour}
              className="hover:bg-card-hover/60 grid grid-cols-[72px_1fr] items-stretch transition-colors sm:grid-cols-[88px_1fr]"
            >
              <div className="border-border text-muted-foreground border-r px-3 py-3 text-right font-mono text-xs font-semibold tabular-nums">
                {pad2(hour)}:00
              </div>
              <div className="flex min-h-13 flex-col justify-center gap-1.5 px-3 py-2">
                {hourItems.map((item) => (
                  <EventPill key={item.id} item={item} onClick={onSelectItem} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
