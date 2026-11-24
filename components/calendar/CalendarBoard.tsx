"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Columns3,
  LayoutGrid,
  Moon,
  Plus,
  Search,
  Sun,
} from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { useTheme } from "@/components/shared/providers/ThemeProvider";
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
  getWeekDays,
  parseDateKey,
  toDateKey,
} from "@/lib/dates";
import { buildProjectedCalendarItems } from "@/lib/recurrence";
import type { CalendarView, ProjectedCalendarItem } from "@/types/calendar";
import { type CalendarFilterState, ProfileStrip } from "./ProfileStrip";
import { DayDrawer } from "./DayDrawer";
import { DaySidePanel } from "./DaySidePanel";
import { DayView } from "./DayView";
import { ItemDetailModal } from "./ItemDetailModal";
import { MonthGrid } from "./MonthGrid";
import { WeeklyBoardView } from "./WeeklyBoardView";
import { WeekView } from "./WeekView";

const VIEW_TABS: Array<{
  id: CalendarView;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "agenda", label: "Mi Agenda", icon: LayoutGrid },
  { id: "month", label: "Mes", icon: CalendarDays },
  { id: "week", label: "Semana", icon: Columns3 },
  { id: "day", label: "Día", icon: CalendarClock },
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
  const { config, toggleMode } = useTheme();
  const { hydrated, profiles, events, bills, tasks, checklists, openQuickAdd } =
    useCalendarData();

  const [view, setView] = useState<CalendarView>("month");
  const [filter, setFilter] = useState<CalendarFilterState>({ mode: "all" });
  const [anchorKeyOverride, setAnchorKeyOverride] = useState<string | null>(
    null,
  );
  const [selectedDateOverride, setSelectedDateOverride] = useState<
    string | null
  >(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeItem, setActiveItem] = useState<ProjectedCalendarItem | null>(
    null,
  );

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
    if (view === "week" || view === "agenda") {
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
    return {
      rangeStartKey: anchorKey,
      rangeEndKey: anchorKey,
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
    setAnchorKeyOverride(todayKey);
    setSelectedDateOverride(todayKey);
  };

  const handleOpenDayDrawer = (dateKey: string) => {
    setSelectedDateOverride(dateKey);
    setDrawerOpen(true);
  };

  const isAwayFromToday = anchorKey !== todayKey;

  return (
    <div className="flex flex-1 flex-col">
      {/* Cabecera responsiva: 3 zonas en escritorio (Nuevo registro + periodo izq | Fecha/Hora centro | Vistas + buscar + campana der) */}
      <header className="border-border bg-card/95 sticky top-0 z-30 border-b px-2.5 py-2 backdrop-blur-md sm:px-6 sm:py-2.5">
        <div className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-3">
          {/* Bloque izquierdo desktop: Nuevo registro + navegación de periodo / Fila 1 móvil */}
          <div className="flex items-center justify-between gap-2 md:justify-start md:gap-2.5">
            <Button
              variant="primary"
              size="sm"
              onClick={() => openQuickAdd("event", selectedDateKey)}
              className="min-h-8 shrink-0 px-2.5 py-1 text-xs md:min-h-9 md:px-3.5"
            >
              <Plus className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="md:hidden">Nuevo</span>
              <span className="hidden md:inline">Nuevo registro</span>
            </Button>

            {/* Fecha y hora centrada en Fila 1 móvil (< md) */}
            <button
              type="button"
              onClick={handleGoToday}
              title="Ir a hoy"
              className="flex cursor-pointer items-baseline justify-center gap-1.5 text-center transition-opacity hover:opacity-80 md:hidden"
            >
              <span className="text-foreground text-base font-extrabold tracking-tight">
                {clock.ready ? formatShortDate(todayKey) : "Calendario"}
              </span>
              <span className="text-primary font-mono text-sm font-extrabold tabular-nums">
                {clock.ready ? `${clock.timeShort} ${clock.period}` : ""}
              </span>
            </button>

            <span
              className="bg-border hidden h-5 w-px lg:inline-block"
              aria-hidden="true"
            />

            {/* Navegación de periodo en escritorio (md+) */}
            <div className="hidden items-center gap-0.5 md:flex">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(-1)}
                aria-label="Periodo anterior"
                className="h-8 w-8 rounded-xl"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-foreground min-w-28 px-1 text-center text-sm font-extrabold whitespace-nowrap sm:text-base">
                {periodLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(1)}
                aria-label="Periodo siguiente"
                className="h-8 w-8 rounded-xl"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {isAwayFromToday && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={handleGoToday}
                  className="ml-1 min-h-8 px-2.5 py-1 text-xs"
                >
                  Hoy
                </Button>
              )}
            </div>

            {/* Acciones rápidas móvil en Fila 1 (< md) */}
            <div className="flex items-center gap-1.5 md:hidden">
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleMode}
                aria-label="Alternar modo claro u oscuro"
                className="h-8 w-8"
              >
                {config.mode === "dark" ? (
                  <Sun className="text-warning h-4 w-4" />
                ) : (
                  <Moon className="text-primary h-4 w-4" />
                )}
              </Button>
              <NotificationPopover />
            </div>
          </div>

          {/* Bloque central desktop (md+): Fecha y Hora centradas en la cabecera */}
          <div className="hidden justify-center md:flex">
            <button
              type="button"
              onClick={handleGoToday}
              title="Ir a hoy"
              className="flex cursor-pointer items-baseline gap-2.5 text-center transition-opacity hover:opacity-80"
            >
              <span className="text-foreground text-xl font-extrabold tracking-tight whitespace-nowrap lg:text-2xl">
                {clock.ready ? formatShortDate(todayKey) : "Calendario"}
              </span>
              <span className="text-primary font-mono text-lg font-extrabold whitespace-nowrap tabular-nums lg:text-xl">
                {clock.ready ? `${clock.timeShort} ${clock.period}` : ""}
              </span>
            </button>
          </div>

          {/* Fila 2 móvil (< md) / Bloque derecho desktop (md+) */}
          <div className="flex items-center justify-between gap-2 md:justify-end">
            {/* Navegación de periodo en móvil (< md) */}
            <div className="flex items-center gap-0.5 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(-1)}
                aria-label="Periodo anterior"
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-foreground px-1 text-sm font-extrabold">
                {periodLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate(1)}
                aria-label="Periodo siguiente"
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {isAwayFromToday && (
                <Button
                  variant="soft"
                  size="sm"
                  onClick={handleGoToday}
                  className="ml-0.5 min-h-7 px-2 py-0.5 text-[11px]"
                >
                  Hoy
                </Button>
              )}
            </div>

            {/* Selector de vistas */}
            <div className="flex items-center gap-1.5">
              <div
                role="tablist"
                aria-label="Vista del calendario"
                className="border-border bg-surface flex rounded-xl border p-0.5 sm:rounded-2xl sm:p-1"
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
                      onClick={() => setView(tab.id)}
                      className={cn(
                        "flex h-8 min-w-8 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold whitespace-nowrap transition-all md:min-w-0 md:rounded-xl md:px-2.5 lg:px-3",
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 md:hidden" aria-hidden="true" />
                      <span className="hidden md:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Buscador + Campana (Desktop md+) */}
            <div className="hidden items-center gap-2 md:flex">
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
            selectedDateKey={selectedDateKey}
            itemsByDate={itemsByDate}
            onOpenDayDrawer={handleOpenDayDrawer}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={setActiveItem}
          />
        )}

        {view === "week" && (
          <WeekView
            anchorDate={anchorDate}
            todayKey={todayKey}
            selectedDateKey={selectedDateKey}
            itemsByDate={itemsByDate}
            onSelectDate={(key) => setSelectedDateOverride(key)}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={setActiveItem}
          />
        )}

        {view === "agenda" && (
          <WeeklyBoardView
            anchorDate={anchorDate}
            todayKey={todayKey}
            itemsByDate={itemsByDate}
            nextWeekItems={nextWeekItems}
            onQuickAddForDate={(key) => openQuickAdd("event", key)}
            onSelectItem={setActiveItem}
            onGoNextWeek={() => handleNavigate(1)}
          />
        )}

        {view === "day" && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_340px]">
            <DayView
              anchorDate={anchorDate}
              dateKey={anchorKey}
              items={itemsByDate.get(anchorKey) ?? []}
              onQuickAddForDate={(key) => openQuickAdd("event", key)}
              onSelectItem={setActiveItem}
            />
            <DaySidePanel
              selectedDateKey={anchorKey}
              todayKey={todayKey}
              dayItems={itemsByDate.get(anchorKey) ?? []}
              onSelectItem={setActiveItem}
            />
          </div>
        )}
      </div>

      <DayDrawer
        open={drawerOpen}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        dayItems={selectedDayItems}
        onClose={() => setDrawerOpen(false)}
        onSelectItem={setActiveItem}
      />

      <ItemDetailModal item={activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
