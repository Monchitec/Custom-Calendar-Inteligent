"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlarmClock,
  Bell,
  Calendar,
  CheckCheck,
  CheckSquare,
  CreditCard,
  Settings,
  Trash2,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { cn } from "@/lib/cn";
import { formatTimeDisplay } from "@/lib/dates";
import type { NotificationItem } from "@/types/alarms";

function NotificationKindIcon({ kind }: { kind: NotificationItem["kind"] }) {
  switch (kind) {
    case "alarm":
      return <AlarmClock className="text-primary h-4 w-4" />;
    case "bill":
      return <CreditCard className="text-cat-bills h-4 w-4" />;
    case "task":
      return <CheckSquare className="text-secondary h-4 w-4" />;
    case "event":
      return <Calendar className="text-accent h-4 w-4" />;
    default:
      return <Bell className="text-muted-foreground h-4 w-4" />;
  }
}

export function NotificationPopover() {
  const {
    notifications,
    alarms,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
  } = useCalendarData();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const activeAlarms = alarms.filter((a) => a.enabled);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="secondary"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir notificaciones y alarmas"
        aria-expanded={open}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadNotificationsCount > 0 && (
          <span className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums shadow-xs">
            {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="border-border bg-card absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-3xl border shadow-2xl sm:w-96">
          <div className="border-border bg-surface/70 flex items-center justify-between border-b px-4 py-3">
            <div>
              <h3 className="text-foreground text-sm font-bold">
                Notificaciones y Alarmas
              </h3>
              <p className="text-muted-foreground text-xs tabular-nums">
                {activeAlarms.length} alarmas activas ·{" "}
                {unreadNotificationsCount} sin leer
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadNotificationsCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={markAllNotificationsRead}
                  aria-label="Marcar todas como leídas"
                  className="h-8 w-8"
                >
                  <CheckCheck className="h-4 w-4" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearNotifications}
                  aria-label="Limpiar bandeja"
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {activeAlarms.length > 0 && (
            <div className="border-border bg-primary-soft/35 border-b px-4 py-2.5">
              <p className="text-primary mb-1.5 text-[11px] font-semibold tracking-wide uppercase">
                Próximas alarmas activas
              </p>
              <div className="flex flex-wrap gap-1.5">
                {activeAlarms.slice(0, 3).map((alarm) => (
                  <span
                    key={alarm.id}
                    className="border-primary/25 bg-card text-foreground inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-medium"
                  >
                    <AlarmClock className="text-primary h-3.5 w-3.5" />
                    <span className="font-bold tabular-nums">
                      {formatTimeDisplay(alarm.time)}
                    </span>
                    <span className="text-muted-foreground max-w-28 truncate">
                      {alarm.label}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="divide-border max-h-80 divide-y overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <Bell className="text-muted-foreground/50 mx-auto h-8 w-8" />
                <p className="text-foreground mt-2 text-sm font-medium">
                  Todo al día
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Aquí verás avisos de pagos, citas y alarmas.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markNotificationRead(item.id)}
                  className={cn(
                    "hover:bg-card-hover flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors",
                    !item.read && "bg-primary-soft/25",
                  )}
                >
                  <div className="bg-muted mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                    <NotificationKindIcon kind={item.kind} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-foreground truncate text-xs font-bold">
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {item.body}
                    </p>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={() => setOpen(false)}
                        className="text-primary mt-1 inline-block text-xs font-semibold hover:underline"
                      >
                        Ver detalle →
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-border bg-surface/60 border-t px-4 py-2.5">
            <Link
              href="/alarmas"
              onClick={() => setOpen(false)}
              className="text-primary hover:bg-primary-soft flex items-center justify-center gap-2 rounded-xl py-1.5 text-xs font-semibold transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Configurar alarmas, sonidos y recordatorios
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
