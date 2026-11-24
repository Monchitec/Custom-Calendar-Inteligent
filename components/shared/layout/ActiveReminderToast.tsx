"use client";

import Link from "next/link";
import { BellRing, X } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";

export function ActiveReminderToast() {
  const { activeReminder, dismissActiveReminder } = useCalendarData();

  if (!activeReminder) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-primary/50 bg-card fixed top-16 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-3xl border-2 p-4 shadow-2xl sm:right-6"
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary-soft flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl leading-none select-none">
          <span aria-hidden="true">{activeReminder.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-primary flex items-center gap-1.5 text-[11px] font-extrabold tracking-wider uppercase">
            <BellRing className="h-3.5 w-3.5" />
            <span>Recordatorio</span>
          </div>
          <h3 className="text-foreground mt-0.5 text-sm font-extrabold">
            {activeReminder.title}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {activeReminder.body}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {activeReminder.link && (
              <Link
                href={activeReminder.link}
                onClick={dismissActiveReminder}
                className="bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground rounded-xl px-3 py-1.5 text-xs font-bold transition-colors"
              >
                Ver ahora
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissActiveReminder}
              className="min-h-8 px-2.5 py-1 text-xs"
            >
              Entendido
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={dismissActiveReminder}
          aria-label="Cerrar recordatorio"
          className="h-7 w-7 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
