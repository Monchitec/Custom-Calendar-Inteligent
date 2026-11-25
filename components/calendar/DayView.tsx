"use client";

import { useMemo, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Edit3,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import {
  addMonths,
  formatCurrency,
  formatLongDate,
  formatMonthYear,
  formatTimeDisplay,
  getMonthGridDays,
  getWeekdayHeadersMonday,
  toDateKey,
} from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

interface DayViewProps {
  anchorDate: Date;
  dateKey: string;
  todayKey: string;
  items: ProjectedCalendarItem[];
  itemsByDate: Map<string, ProjectedCalendarItem[]>;
  onSelectDate: (dateKey: string) => void;
  onQuickAddForDate: (dateKey: string) => void;
  onSelectItem: (item: ProjectedCalendarItem) => void;
}

export function DayView({
  anchorDate,
  dateKey,
  todayKey,
  items,
  itemsByDate,
  onSelectDate,
  onQuickAddForDate,
  onSelectItem,
}: DayViewProps) {
  const { profiles, deleteEvent, deleteBill, deleteTask } = useCalendarData();
  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const handleDeleteItem = (item: ProjectedCalendarItem) => {
    if (item.source === "event") {
      deleteEvent(item.sourceId);
    } else if (item.source === "bill") {
      deleteBill(item.sourceId);
    } else {
      deleteTask(item.sourceId);
    }
  };

  // Mes mostrado en el mini calendario derecho (sincronizado con anchorDate al cambiar)
  const anchorMonthKey = `${anchorDate.getFullYear()}-${anchorDate.getMonth()}`;
  const [browsedMonth, setBrowsedMonth] = useState<{
    anchorMonthKey: string;
    date: Date;
  } | null>(null);

  const miniMonthDate = useMemo(
    () =>
      browsedMonth?.anchorMonthKey === anchorMonthKey
        ? browsedMonth.date
        : new Date(
            anchorDate.getFullYear(),
            anchorDate.getMonth(),
            1,
            12,
            0,
            0,
            0,
          ),
    [anchorDate, anchorMonthKey, browsedMonth],
  );

  const miniDays = useMemo(
    () =>
      getMonthGridDays(miniMonthDate.getFullYear(), miniMonthDate.getMonth()),
    [miniMonthDate],
  );
  const weekdayHeaders = getWeekdayHeadersMonday();

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aTimed = !a.allDay && Boolean(a.startTime);
      const bTimed = !b.allDay && Boolean(b.startTime);
      if (aTimed !== bTimed) return aTimed ? 1 : -1;
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.title.localeCompare(b.title);
    });
  }, [items]);

  const handleShiftMiniMonth = (delta: number) => {
    setBrowsedMonth({
      anchorMonthKey,
      date: addMonths(miniMonthDate, delta),
    });
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
      {/* Columna izquierda: Lista directa de eventos del día */}
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-3xl border shadow-xs">
        <div className="border-border bg-surface/70 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <div>
            <h2 className="text-foreground text-lg font-extrabold">
              {formatLongDate(anchorDate)}
            </h2>
            <p className="text-muted-foreground text-xs tabular-nums">
              {items.length === 0
                ? "Día libre, sin registros"
                : `${items.length} ${
                    items.length === 1
                      ? "registro programado"
                      : "registros programados"
                  }`}
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

        <div className="flex-1 p-4 sm:p-5">
          {sortedItems.length === 0 ? (
            <div className="border-border bg-surface/40 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center">
              <div className="bg-primary-soft text-primary mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
                <CalendarPlus className="h-6 w-6" aria-hidden="true" />
              </div>
              <p className="text-foreground text-sm font-bold">
                No tienes eventos programados para este día
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Agrega una cita, actividad o recordatorio para organizar tu
                jornada.
              </p>
              <Button
                variant="soft"
                size="sm"
                onClick={() => onQuickAddForDate(dateKey)}
                className="mt-4"
              >
                <Plus className="h-4 w-4" />
                Agregar evento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item) => {
                const slot = getProfileSlotClasses(item.colorSlot);
                const profile = item.profileId
                  ? profileMap.get(item.profileId)
                  : undefined;
                const isBill = item.source === "bill";
                const isPaid = isBill && Boolean(item.billPaid);
                const visualIcon = inferVisualIcon(
                  item.title,
                  item.source,
                  item.visualIcon,
                );

                const cardClasses = isBill
                  ? isPaid
                    ? "bg-success-soft/75 border-l-success text-foreground"
                    : slot.block
                  : slot.block;

                const timeLabel = isBill
                  ? `Pago · ${formatCurrency(item.amount ?? 0, item.currency)} · ${
                      isPaid ? "Pagado" : "Pendiente"
                    }`
                  : item.allDay || !item.startTime
                    ? "Todo el día"
                    : `${formatTimeDisplay(item.startTime)}${
                        item.endTime
                          ? ` – ${formatTimeDisplay(item.endTime)}`
                          : ""
                      }`;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-2xl border-l-4 px-4 py-3 text-left transition-all hover:brightness-[0.98]",
                      cardClasses,
                      (item.completed || isPaid) && "opacity-75",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <VisualThumb
                        value={visualIcon}
                        sizeClass="h-8 w-8"
                        textClass="text-lg"
                        roundedClass="rounded-xl"
                        className="bg-card/80 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-foreground truncate text-sm font-bold sm:text-base",
                            (item.completed || isPaid) && "line-through",
                          )}
                        >
                          {item.title}
                        </p>
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold tabular-nums">
                          <span>{timeLabel}</span>
                          {item.location && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{item.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Indicador de perfil + botón eliminar directo */}
                    <div className="flex shrink-0 items-center gap-2">
                      {profile ? (
                        <div
                          className="bg-card/85 border-border/60 flex items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-1"
                          title={profile.name}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full",
                              slot.iconBg,
                            )}
                          >
                            {profile.customImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profile.customImage}
                                alt={profile.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ProfileIcon
                                name={profile.icon}
                                className="h-3 w-3"
                              />
                            )}
                          </span>
                          <span className="text-foreground hidden max-w-20 truncate text-[11px] font-bold sm:inline">
                            {profile.name}
                          </span>
                        </div>
                      ) : (
                        <span
                          className={cn(
                            "h-3 w-3 rounded-full",
                            isBill
                              ? isPaid
                                ? "bg-success"
                                : "bg-warning"
                              : slot.dot,
                          )}
                          aria-hidden="true"
                        />
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSelectItem(item)}
                        aria-label={`Editar ${item.title}`}
                        title="Editar"
                        className="text-muted-foreground hover:bg-card/80 hover:text-foreground h-8 w-8 rounded-xl"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteItem(item)}
                        aria-label={`Eliminar ${item.title}`}
                        title="Eliminar"
                        className="text-muted-foreground hover:bg-card/80 hover:text-danger h-8 w-8 rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna derecha: Mini calendario mensual */}
      <aside className="border-border bg-card h-fit rounded-3xl border p-4 shadow-xs sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-foreground text-sm font-extrabold">
            {formatMonthYear(miniMonthDate)}
          </h3>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleShiftMiniMonth(-1)}
              aria-label="Mes anterior"
              className="h-7 w-7 rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleShiftMiniMonth(1)}
              aria-label="Mes siguiente"
              className="h-7 w-7 rounded-lg"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-1.5 grid grid-cols-7 gap-1 text-center">
          {weekdayHeaders.map((dayLabel) => (
            <div
              key={dayLabel}
              className="text-muted-foreground py-1 text-[11px] font-bold"
            >
              {dayLabel}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1 text-center">
          {miniDays.map((day) => {
            const key = toDateKey(day);
            const inCurrentMonth = day.getMonth() === miniMonthDate.getMonth();
            const isSelected = key === dateKey;
            const isToday = key === todayKey;
            const hasItems = (itemsByDate.get(key)?.length ?? 0) > 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectDate(key)}
                aria-label={formatLongDate(day)}
                aria-pressed={isSelected}
                className={cn(
                  "relative mx-auto flex h-9 w-9 cursor-pointer flex-col items-center justify-center rounded-full text-xs font-bold tabular-nums transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : isToday
                      ? "border-primary bg-primary-soft/60 text-primary border"
                      : inCurrentMonth
                        ? "text-foreground hover:bg-surface"
                        : "text-muted-foreground/45 hover:bg-surface/50",
                )}
              >
                <span>{day.getDate()}</span>
                {hasItems && (
                  <span
                    className={cn(
                      "mt-0.5 h-1 w-1 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary",
                    )}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
