"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid,
  Search,
} from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import {
  addDays,
  addMonths,
  clampDayOfMonth,
  daysInMonth,
  formatMonthYear,
  formatShortDate,
  getMonthGridDays,
  getWeekDays,
  parseDateKey,
  toDateKey,
} from "@/lib/dates";
import { buildProjectedCalendarItems } from "@/lib/recurrence";
import type { CalendarView, ProjectedCalendarItem } from "@/types/calendar";
import { type CalendarFilterState, ProfileStrip } from "./ProfileStrip";
import { DayDrawer } from "./DayDrawer";
import { DayView } from "./DayView";
import { ItemDetailModal } from "./ItemDetailModal";
import {
  ItemQuickPopover,
  type PopoverAnchorRect,
} from "./ItemQuickPopover";
import { MonthGrid } from "./MonthGrid";
import { WeeklyBoardView } from "./WeeklyBoardView";
import { WeekView } from "./WeekView";

const VIEW_TABS: Array<{
  id: CalendarView;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "day", label: "Día", icon: CalendarClock },
  { id: "week", label: "Semana", icon: Columns3 },
  { id: "month", label: "Mes", icon: CalendarDays },
  { id: "agenda", label: "Agenda", icon: LayoutGrid },
];

function matchesCalendarFilter(
  item: ProjectedCalendarItem,
  filter: CalendarFilterState,
): boolean {
  if (filter.mode === "all") return true;
  if (filter.mode === "solo-bills") return item.source === "bill";
  if (filter.mode === "solo-tasks") return item.source === "task";
  if (filter.mode === "solo-profile") {
    return item.source !== "bill" && item.profileId === filter.profileId;
  }
  if (item.source === "bill") return filter.includeBills;
  if (item.source === "task") {
    return filter.includeTasks || filter.profileIds.includes(item.profileId);
  }
  return filter.profileIds.includes(item.profileId);
}

export function CalendarBoard() {
  const clock = useClock();
  const {
    hydrated,
    profiles,
    events,
    bills,
    tasks,
    checklists,
    quickAdd,
    openQuickAdd,
  } = useCalendarData();

  const [view, setView] = useState<CalendarView>("day");
  const [filter, setFilter] = useState<CalendarFilterState>({ mode: "all" });
  const [anchorKeyOverride, setAnchorKeyOverride] = useState<string | null>(
    null,
  );
  const [selectedDateOverride, setSelectedDateOverride] = useState<
    string | null
  >(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevQuickAddOpen, setPrevQuickAddOpen] = useState(quickAdd.open);
  if (quickAdd.open !== prevQuickAddOpen) {
    setPrevQuickAddOpen(quickAdd.open);
    if (quickAdd.open) {
      setDrawerOpen(false);
    }
  }
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<ProjectedCalendarItem | null>(
    null,
  );
  const [modalInitialEditing, setModalInitialEditing] = useState(false);
  const [popoverState, setPopoverState] = useState<{
    item: ProjectedCalendarItem;
    rect: PopoverAnchorRect;
  } | null>(null);

  const handleSelectItem = (
    item: ProjectedCalendarItem,
    anchorEl?: HTMLElement | null,
  ) => {
    if (anchorEl) {
      const r = anchorEl.getBoundingClientRect();
      setPopoverState({
        item,
        rect: {
          top: r.top,
          left: r.left,
          right: r.right,
          bottom: r.bottom,
          width: r.width,
          height: r.height,
        },
      });
      return;
    }
    setPopoverState(null);
    setModalInitialEditing(false);
    setActiveItem(item);
  };

  const todayKey = clock.todayKey;
  const anchorKey = anchorKeyOverride ?? todayKey;
  const selectedDateKey = selectedDateOverride ?? todayKey;
  const anchorDate = useMemo(() => parseDateKey(anchorKey), [anchorKey]);

  // Calcular rango exacto: en Mes solo días 1..último día del mes
  const {
    rangeStartKey,
    rangeEndKey,
    nextWeekStartKey,
    nextWeekEndKey,
    periodLabel,
  } = useMemo(() => {
    if (view === "month") {
      const y = anchorDate.getFullYear();
      const m = anchorDate.getMonth();
      const first = clampDayOfMonth(y, m, 1);
      const last = clampDayOfMonth(y, m, daysInMonth(y, m));
      return {
        rangeStartKey: first,
        rangeEndKey: last,
        nextWeekStartKey: first,
        nextWeekEndKey: first,
        periodLabel: formatMonthYear(anchorDate),
      };
    }
    if (view === "week") {
      const start = toDateKey(anchorDate);
      const end = toDateKey(addDays(anchorDate, 6));
      const nwStart = toDateKey(addDays(anchorDate, 7));
      const nwEnd = toDateKey(addDays(anchorDate, 13));
      return {
        rangeStartKey: start,
        rangeEndKey: end,
        nextWeekStartKey: nwStart,
        nextWeekEndKey: nwEnd,
        periodLabel: `${formatShortDate(start)} – ${formatShortDate(end)}`,
      };
    }
    if (view === "agenda") {
      const days = getWeekDays(anchorDate);
      const start = toDateKey(days[0]);
      const end = toDateKey(days[6]);
      const nwStart = toDateKey(addDays(days[0], 7));
      const nwEnd = toDateKey(addDays(days[0], 13));
      return {
        rangeStartKey: start,
        rangeEndKey: end,
        nextWeekStartKey: nwStart,
        nextWeekEndKey: nwEnd,
        periodLabel: `${formatShortDate(start)} – ${formatShortDate(end)}`,
      };
    }
    const days = getMonthGridDays(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
    );
    return {
      rangeStartKey: toDateKey(days[0]),
      rangeEndKey: toDateKey(days[days.length - 1]),
      nextWeekStartKey: anchorKey,
      nextWeekEndKey: anchorKey,
      periodLabel: formatShortDate(anchorKey),
    };
  }, [anchorDate, anchorKey, view]);

  const allProjectedItems = useMemo(() => {
    if (!hydrated) return [];
    const effectiveStart = [rangeStartKey, selectedDateKey].sort()[0];
    const effectiveEnd = [
      rangeEndKey,
      nextWeekEndKey,
      selectedDateKey,
    ].sort()[2];
    const visibleAllProfiles = profiles.map((p) => ({
      ...p,
      visible: true,
    }));

    return buildProjectedCalendarItems({
      events,
      bills,
      tasks,
      checklists,
      todayKey,
      profiles: visibleAllProfiles,
      rangeStartKey: effectiveStart,
      rangeEndKey: effectiveEnd,
      includeBills: true,
      includeTasks: true,
    });
  }, [
    hydrated,
    events,
    bills,
    tasks,
    checklists,
    todayKey,
    profiles,
    rangeStartKey,
    rangeEndKey,
    nextWeekEndKey,
    selectedDateKey,
  ]);

  const unfilteredRangeItems = useMemo(
    () =>
      allProjectedItems.filter(
        (i) => i.date >= rangeStartKey && i.date <= rangeEndKey,
      ),
    [allProjectedItems, rangeStartKey, rangeEndKey],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allProjectedItems.filter((item) => {
      if (!matchesCalendarFilter(item, filter)) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.profileLabel.toLowerCase().includes(q) ||
        (item.location?.toLowerCase().includes(q) ?? false) ||
        (item.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allProjectedItems, filter, searchQuery]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ProjectedCalendarItem[]>();
    for (const item of filteredItems) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [filteredItems]);

  const nextWeekItems = useMemo(
    () =>
      filteredItems.filter(
        (i) => i.date >= nextWeekStartKey && i.date <= nextWeekEndKey,
      ),
    [filteredItems, nextWeekStartKey, nextWeekEndKey],
  );

  const selectedDayItems = itemsByDate.get(selectedDateKey) ?? [];

  const handleNavigate = (direction: -1 | 1) => {
    let nextDate: Date;
    if (view === "month") {
      nextDate = addMonths(anchorDate, direction);
    } else if (view === "week" || view === "agenda") {
      nextDate = addDays(anchorDate, direction * 7);
    } else {
      nextDate = addDays(anchorDate, direction);
    }
    const nextKey = toDateKey(nextDate);
    setAnchorKeyOverride(nextKey);
    if (view === "day") setSelectedDateOverride(nextKey);
  };

  const handleGoToday = () => {
    setAnchorKeyOverride(null);
    setSelectedDateOverride(null);
  };

  const handleOpenDayDrawer = (dateKey: string) => {
    setSelectedDateOverride(dateKey);
    setAnchorKeyOverride(dateKey);
    setView("day");
    setDrawerOpen(false);
  };

  const isAwayFromToday =
    view === "month"
      ? anchorKey.slice(0, 7) !== todayKey.slice(0, 7)
      : view === "week" || view === "agenda"
        ? todayKey < rangeStartKey || todayKey > rangeEndKey
        : anchorKey !== todayKey;

  return (
    <div className="flex flex-1 flex-col">
      {/* Cabecera responsiva en 1 sola fila tanto en móvil como en escritorio */}
      <header className="border-border bg-card/95 sticky top-0 z-30 border-b px-2 py-2 backdrop-blur-md sm:px-6 sm:py-2.5">
        <div className="flex items-center justify-between gap-1.5 md:gap-3">
          {/* Bloque izquierdo: Hora (en sm+) + navegación de periodo */}
          <div className="flex min-w-0 items-center gap-1 sm:gap-2.5">
            <button
              type="button"
              onClick={handleGoToday}
              title="Ir a hoy"
              className="hidden cursor-pointer items-center text-left transition-opacity hover:opacity-80 sm:flex"
            >
              <span className="text-primary font-mono text-base font-extrabold whitespace-nowrap tabular-nums lg:text-xl">
                {clock.ready ? `${clock.timeShort} ${clock.period}` : "--:--"}
              </span>
            </button>

            <span
              className="bg-border hidden h-5 w-px sm:inline-block"
              aria-hidden="true"
            />

            {/* Navegación de periodo */}
            <div className="flex min-w-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(-1)}
                aria-label="Periodo anterior"
                className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8 sm:rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-foreground truncate px-0.5 text-center text-xs font-extrabold whitespace-nowrap sm:min-w-28 sm:px-1 sm:text-sm md:text-base">
                {periodLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(1)}
                aria-label="Periodo siguiente"
                className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8 sm:rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {isAwayFromToday && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={handleGoToday}
                  title="Volver a la fecha de hoy"
                  className="ml-0.5 min-h-7 shrink-0 px-2 py-0.5 text-[11px] whitespace-nowrap sm:ml-1 sm:min-h-8 sm:px-2.5 sm:py-1 sm:text-xs"
                >
                  Volver Hoy
                </Button>
              )}
            </div>

            <div
              role="tablist"
              aria-label="Vista del calendario"
              className="border-border bg-surface hidden rounded-xl border p-0.5 sm:flex sm:rounded-2xl sm:p-1"
            >
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Vista ${tab.label}`}
                    title={tab.label}
                    onClick={() => {
                      setView(tab.id);
                    }}
                    className={cn(
                      "flex h-7 w-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all sm:h-8 sm:w-8 md:w-auto md:rounded-xl md:px-2.5 lg:px-3",
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:hidden"
                      aria-hidden="true"
                    />
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque derecho: Vistas (en móvil) + Buscador + Nuevo registro (+ en móvil) + Campana */}
          <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
            <div
              role="tablist"
              aria-label="Vista del calendario"
              className="border-border bg-surface flex rounded-xl border p-0.5 sm:hidden"
            >
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = view === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={`Vista ${tab.label}`}
                    title={tab.label}
                    onClick={() => {
                      setView(tab.id);
                    }}
                    className={cn(
                      "flex h-7 w-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <div className="relative hidden xl:block">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                aria-label="Buscar en el calendario"
                className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/25 h-9 w-32 rounded-xl border pr-3 pl-8 text-xs transition-all focus:w-44 focus:ring-2 focus:outline-none"
              />
            </div>

            <NotificationPopover />
          </div>
        </div>
      </header>

      {/* Barra inteligente de filtros */}
      <ProfileStrip
        profiles={profiles}
        unfilteredItems={unfilteredRangeItems}
        filter={filter}
        onChangeFilter={setFilter}
      />

      {/* Lienzo principal: casi borde a borde en móvil (más ancho para las 7 cajas) y aireado en desktop */}
      <div className="flex-1 px-1.5 pb-2 sm:px-6 sm:pb-4">
        {view === "month" && (
          <MonthGrid
            anchorDate={anchorDate}
            todayKey={todayKey}
            itemsByDate={itemsByDate}
            onOpenDayDrawer={handleOpenDayDrawer}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={handleSelectItem}
          />
        )}

        {view === "week" && (
          <WeeklyBoardView
            anchorDate={anchorDate}
            todayKey={todayKey}
            itemsByDate={itemsByDate}
            nextWeekItems={nextWeekItems}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={handleSelectItem}
            onGoNextWeek={() => handleNavigate(1)}
          />
        )}

        {view === "agenda" && (
          <WeekView
            anchorDate={anchorDate}
            todayKey={todayKey}
            itemsByDate={itemsByDate}
            onSelectDate={handleOpenDayDrawer}
            onQuickAddForDate={(key, startTime) =>
              openQuickAdd("event", key, startTime)
            }
            onSelectItem={handleSelectItem}
          />
        )}

        {view === "day" && (
          <DayView
            anchorDate={anchorDate}
            dateKey={anchorKey}
            todayKey={todayKey}
            items={itemsByDate.get(anchorKey) ?? []}
            itemsByDate={itemsByDate}
            onSelectDate={(key) => {
              setAnchorKeyOverride(key);
              setSelectedDateOverride(key);
            }}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={handleSelectItem}
          />
        )}
      </div>

      <DayDrawer
        open={drawerOpen}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        dayItems={selectedDayItems}
        onClose={() => setDrawerOpen(false)}
        onOpenDayView={() => {
          setAnchorKeyOverride(selectedDateKey);
          setView("day");
          setDrawerOpen(false);
        }}
        onSelectItem={(it) => handleSelectItem(it)}
      />

      <ItemQuickPopover
        item={popoverState?.item ?? null}
        anchorRect={popoverState?.rect ?? null}
        onClose={() => setPopoverState(null)}
        onOpenFullModal={(it, startEditing) => {
          setPopoverState(null);
          setModalInitialEditing(startEditing);
          setActiveItem(it);
        }}
      />

      <ItemDetailModal
        item={activeItem}
        initialEditing={modalInitialEditing}
        onClose={() => {
          setActiveItem(null);
          setModalInitialEditing(false);
        }}
      />
    </div>
  );
}
