"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlarmClock,
  CalendarDays,
  CheckSquare,
  CreditCard,
  Moon,
  Plus,
  Settings,
  Sparkles,
  Sun,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { useTheme } from "@/components/shared/providers/ThemeProvider";
import { Button } from "@/components/shared/ui/Button";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import { clampDayOfMonth, formatShortDate, toMonthKey } from "@/lib/dates";
import { getBillOccurrenceKey, getBillStatus } from "@/lib/recurrence";
import { ActiveReminderToast } from "./ActiveReminderToast";
import { NotificationPopover } from "./NotificationPopover";
import { QuickAddModal } from "./QuickAddModal";
import { RingingAlarmBanner } from "./RingingAlarmBanner";

const NAV_ITEMS = [
  { href: "/", label: "Calendario", icon: CalendarDays },
  { href: "/tareas", label: "Mis Tareas", icon: CheckSquare },
  { href: "/pagos", label: "Pagos", icon: CreditCard },
  { href: "/alarmas", label: "Alarmas", icon: AlarmClock },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clock = useClock();
  const { config, toggleMode } = useTheme();
  const { tasks, bills, alarms, openQuickAdd } = useCalendarData();

  const isCalendarRoot = pathname === "/";
  const hideTopHeader =
    isCalendarRoot ||
    pathname.startsWith("/tareas") ||
    pathname.startsWith("/pagos") ||
    pathname.startsWith("/alarmas") ||
    pathname.startsWith("/configuracion");

  const pendingTasksCount = useMemo(
    () => tasks.filter((t) => !t.completed).length,
    [tasks],
  );

  const urgentBillsCount = useMemo(() => {
    if (!clock.ready) return 0;
    const year = clock.now.getFullYear();
    const month = clock.now.getMonth();
    const monthKey = toMonthKey(clock.now);
    let count = 0;
    for (const bill of bills) {
      if (bill.kind === "income") continue;
      const dueDate = clampDayOfMonth(year, month, bill.dueDay);
      const occKey =
        bill.frequency === "monthly"
          ? monthKey
          : getBillOccurrenceKey(bill, dueDate);
      const isPaid = bill.paidOccurrences.includes(occKey);
      const status = getBillStatus(
        isPaid,
        dueDate,
        clock.todayKey,
        bill.reminderDaysBefore,
      );
      if (status === "overdue" || status === "due-soon") count += 1;
    }
    return count;
  }, [bills, clock.now, clock.ready, clock.todayKey]);

  const activeAlarmsCount = useMemo(
    () => alarms.filter((a) => a.enabled).length,
    [alarms],
  );

  const getBadgeCount = (href: string): number => {
    if (href === "/tareas") return pendingTasksCount;
    if (href === "/pagos") return urgentBillsCount;
    if (href === "/alarmas") return activeAlarmsCount;
    return 0;
  };

  return (
    <div className="bg-background text-foreground flex min-h-screen w-full">
      {/* Sidebar Rail compacto estilo Dragon Touch (como en Imagen 2: ícono + etiqueta limpia, sin robar ancho) */}
      <aside
        aria-label="Navegación principal"
        className="border-border bg-surface sticky top-0 hidden h-screen w-22 shrink-0 flex-col items-center border-r px-2 py-4 md:flex"
      >
        <Link
          href="/"
          title="Mi Calendario"
          className="bg-primary text-primary-foreground flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-transform hover:scale-105"
        >
          <Sparkles className="h-5 w-5" />
        </Link>

        {/* Secciones tipo Rail Dragon Touch */}
        <nav className="mt-5 flex w-full flex-1 flex-col items-center gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const count = getBadgeCount(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full flex-col items-center justify-center gap-1 rounded-2xl py-2.5 text-[11px] transition-all",
                  active
                    ? "border-l-primary bg-card text-primary border-l-[3px] font-extrabold shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground font-semibold",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="leading-none">{item.label}</span>
                {count > 0 && item.href !== "/" && (
                  <span
                    className={cn(
                      "absolute top-1.5 right-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums",
                      item.href === "/pagos"
                        ? "bg-warning text-primary-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Botón rápido Modo Claro / Oscuro */}
        <button
          type="button"
          onClick={toggleMode}
          aria-label="Cambiar modo claro u oscuro"
          title={
            config.mode === "dark"
              ? "Cambiar a modo claro"
              : "Cambiar a modo oscuro"
          }
          className="border-border bg-card text-foreground hover:bg-card-hover mt-auto flex h-11 w-14 cursor-pointer flex-col items-center justify-center rounded-2xl border transition-colors"
        >
          {config.mode === "dark" ? (
            <Sun className="text-warning h-4 w-4" />
          ) : (
            <Moon className="text-primary h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Área principal */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* Cabecera de fecha/hora oculta en Calendario (usa su cabecera unificada), Mis Tareas y Pagos para ganar espacio */}
        {!hideTopHeader && (
          <header className="border-border bg-card/90 sticky top-0 z-30 flex items-center justify-between gap-3 border-b px-4 py-2.5 backdrop-blur-md sm:px-6">
            <div className="flex items-baseline gap-2.5">
              <span className="text-foreground text-base font-extrabold tracking-tight sm:text-lg">
                {clock.ready ? formatShortDate(clock.todayKey) : "Hoy"}
              </span>
              <span className="text-primary font-mono text-base font-extrabold tabular-nums sm:text-lg">
                {clock.ready ? `${clock.timeShort} ${clock.period}` : "--:--"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => openQuickAdd("event")}
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={toggleMode}
                aria-label="Alternar modo claro u oscuro"
                className="md:hidden"
              >
                {config.mode === "dark" ? (
                  <Sun className="text-warning h-4 w-4" />
                ) : (
                  <Moon className="text-primary h-4 w-4" />
                )}
              </Button>
              <NotificationPopover />
            </div>
          </header>
        )}

        <main
          className={cn(
            "mx-auto flex w-full flex-1 flex-col",
            isCalendarRoot ? "max-w-none" : "max-w-[1600px] px-4 py-5 sm:px-6",
          )}
        >
          {children}
        </main>
      </div>

      {/* Navegación inferior móvil */}
      <nav
        aria-label="Navegación móvil"
        className="border-border bg-surface/95 fixed right-0 bottom-0 left-0 z-30 grid grid-cols-5 border-t px-1.5 py-1.5 backdrop-blur-md md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const count = getBadgeCount(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {count > 0 && item.href !== "/" && (
                <span className="bg-primary text-primary-foreground absolute top-1.5 right-3 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <QuickAddModal />
      <RingingAlarmBanner />
      <ActiveReminderToast />
    </div>
  );
}
