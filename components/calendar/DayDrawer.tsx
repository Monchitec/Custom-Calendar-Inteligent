"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import type { ProjectedCalendarItem } from "@/types/calendar";
import { DaySidePanel } from "./DaySidePanel";

interface DayDrawerProps {
  open: boolean;
  selectedDateKey: string;
  todayKey: string;
  dayItems: ProjectedCalendarItem[];
  onClose: () => void;
  onSelectItem: (item: ProjectedCalendarItem) => void;
}

export function DayDrawer({
  open,
  selectedDateKey,
  todayKey,
  dayItems,
  onClose,
  onSelectItem,
}: DayDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del día"
    >
      <div
        className="bg-foreground/25 backdrop-blur-2xs fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="border-border bg-background relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-bold tracking-wider uppercase">
            Resumen y Rutinas del Día
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar panel del día"
            className="h-9 w-9"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <DaySidePanel
          selectedDateKey={selectedDateKey}
          todayKey={todayKey}
          dayItems={dayItems}
          onSelectItem={(item) => {
            onSelectItem(item);
          }}
        />
      </div>
    </div>
  );
}
