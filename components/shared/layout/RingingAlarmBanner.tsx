"use client";

import { AlarmClock, BellOff, Clock } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { formatTimeDisplay } from "@/lib/dates";

export function RingingAlarmBanner() {
  const { ringingAlarm, dismissRingingAlarm, snoozeRingingAlarm } =
    useCalendarData();

  if (!ringingAlarm) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border-primary bg-card fixed right-4 bottom-20 left-4 z-50 mx-auto max-w-lg rounded-3xl border-2 p-5 shadow-2xl md:right-6 md:bottom-6 md:left-auto"
    >
      <div className="flex items-start gap-4">
        <div className="bg-primary text-primary-foreground flex h-12 w-12 shrink-0 animate-bounce items-center justify-center rounded-2xl shadow-md">
          <AlarmClock className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-primary text-xs font-bold tracking-wider uppercase">
            Alarma sonando
          </p>
          <h3 className="text-foreground mt-0.5 text-lg font-extrabold">
            {ringingAlarm.alarm.label}
          </h3>
          <p className="text-muted-foreground mt-0.5 text-sm font-semibold tabular-nums">
            {formatTimeDisplay(ringingAlarm.triggeredAt)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="soft" size="sm" onClick={snoozeRingingAlarm}>
              <Clock className="h-4 w-4" />
              Posponer {ringingAlarm.alarm.snoozeMinutes} min
            </Button>
            <Button variant="primary" size="sm" onClick={dismissRingingAlarm}>
              <BellOff className="h-4 w-4" />
              Detener
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
