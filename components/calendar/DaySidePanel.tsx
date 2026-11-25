"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ListChecks, Plus } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import { formatDateWithWeekday } from "@/lib/dates";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";
import { EventPill } from "./EventPill";

interface DaySidePanelProps {
  selectedDateKey: string;
  todayKey: string;
  dayItems: ProjectedCalendarItem[];
  onSelectItem: (item: ProjectedCalendarItem) => void;
}

export function DaySidePanel({
  selectedDateKey,
  todayKey,
  dayItems,
  onSelectItem,
}: DaySidePanelProps) {
  const {
    checklists,
    toggleChecklistStep,
    openQuickAdd,
    deleteEvent,
    deleteTask,
    deleteBill,
  } = useCalendarData();

  const handleDeleteItem = (item: ProjectedCalendarItem) => {
    if (item.source === "event") {
      deleteEvent(item.sourceId);
    } else if (item.source === "task") {
      if (!item.id.startsWith("checklist:")) {
        deleteTask(item.sourceId);
      }
    } else if (item.source === "bill") {
      deleteBill(item.sourceId);
    }
  };
  const isToday = selectedDateKey === todayKey;

  const featuredChecklist = checklists[0];
  const completedSteps = featuredChecklist
    ? featuredChecklist.steps.filter((s) => s.done).length
    : 0;
  const totalSteps = featuredChecklist?.steps.length ?? 0;
  const pct =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <aside className="flex min-h-0 flex-col gap-3 xl:h-full xl:overflow-y-auto xl:pr-1">
      {/* Resumen del día seleccionado (sin botones duplicados de +Pendiente/+Pago) */}
      <div className="border-border bg-card rounded-3xl border p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="bg-primary-soft text-primary inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase">
              {isToday ? "Agenda de hoy" : "Día seleccionado"}
            </span>
            <h2 className="text-foreground mt-1.5 text-lg font-extrabold">
              {formatDateWithWeekday(selectedDateKey)}
            </h2>
          </div>
          <Button
            variant="soft"
            size="icon"
            onClick={() => openQuickAdd("event", selectedDateKey)}
            aria-label="Agendar en este día"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {dayItems.length === 0 ? (
            <div className="border-border bg-surface/40 rounded-2xl border border-dashed px-4 py-6 text-center">
              <p className="text-foreground text-sm font-semibold">
                Sin actividades programadas
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Usa el botón + arriba para agendar un evento, tarea o pago.
              </p>
            </div>
          ) : (
            dayItems.map((item) => (
              <EventPill
                key={item.id}
                item={item}
                showActions
                onClick={onSelectItem}
                onDelete={
                  item.id.startsWith("checklist:")
                    ? undefined
                    : handleDeleteItem
                }
              />
            ))
          )}
        </div>
      </div>

      {/* Widget Chore Chart / Checklist en vivo con stickers visuales */}
      {featuredChecklist && (
        <div className="border-border bg-card rounded-3xl border p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-secondary-soft text-secondary flex h-8 w-8 items-center justify-center rounded-xl">
                <ListChecks className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-foreground truncate text-sm font-extrabold">
                  {featuredChecklist.title}
                </h3>
                <p className="text-muted-foreground text-[11px] font-medium tabular-nums">
                  {completedSteps} de {totalSteps} pasos ({pct}%)
                </p>
              </div>
            </div>
            <Link
              href="/tareas"
              className="text-primary text-xs font-bold hover:underline"
            >
              Ver todo
            </Link>
          </div>

          <div className="bg-muted mt-3 h-2 w-full overflow-hidden rounded-full">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                pct === 100 ? "bg-success" : "bg-primary",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="mt-3 space-y-1.5">
            {featuredChecklist.steps.map((step) => {
              const stepIcon = inferVisualIcon(
                step.label,
                "task",
                step.visualIcon,
              );
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() =>
                      toggleChecklistStep(featuredChecklist.id, step.id)
                    }
                    className="hover:bg-muted/70 flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors"
                  >
                    {step.done ? (
                      <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                    ) : (
                      <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                    )}
                    <VisualThumb
                      value={stepIcon}
                      alt={step.label}
                      sizeClass="h-4 w-4"
                      textClass="text-sm"
                    />
                    <span
                      className={cn(
                        "flex-1 font-medium",
                        step.done
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </aside>
  );
}
