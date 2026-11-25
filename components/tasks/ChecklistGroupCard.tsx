"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Pencil,
  Plus,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { Profile } from "@/types/calendar";
import type { Checklist, ChecklistResetSchedule } from "@/types/tasks";

const WEEKDAY_NAMES: Record<string, string> = {
  "0": "domingo",
  "1": "lunes",
  "2": "martes",
  "3": "miércoles",
  "4": "jueves",
  "5": "viernes",
  "6": "sábado",
};

function getResetLabel(schedule: ChecklistResetSchedule): string {
  if (schedule === "none") return "Reinicio manual";
  if (schedule === "daily") return "Reinicio diario";
  const day = schedule.includes(":") ? schedule.split(":")[1] : "1";
  return `Reinicio semanal (${WEEKDAY_NAMES[day] ?? "lunes"})`;
}

interface ChecklistGroupCardProps {
  checklist: Checklist;
  profile?: Profile;
  onEdit?: (checklist: Checklist) => void;
}

export function ChecklistGroupCard({
  checklist,
  profile,
  onEdit,
}: ChecklistGroupCardProps) {
  const {
    toggleChecklistStep,
    addChecklistStep,
    removeChecklistStep,
    deleteChecklist,
  } = useCalendarData();

  const [newStep, setNewStep] = useState("");

  const total = checklist.steps.length;
  const doneCount = checklist.steps.filter((s) => s.done).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isComplete = total > 0 && doneCount === total;
  const slot = getProfileSlotClasses(profile?.colorSlot ?? "cat-6");

  const handleAddStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    addChecklistStep(checklist.id, newStep.trim());
    setNewStep("");
  };

  return (
    <article
      className={cn(
        "bg-card flex flex-col rounded-3xl border p-5 shadow-xs transition-all",
        isComplete ? "border-success/45 bg-success-soft/15" : "border-border",
      )}
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
              slot.iconBg,
            )}
          >
            {profile?.customImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.customImage}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ProfileIcon
                name={profile?.icon ?? "check-square"}
                className="h-5 w-5"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  slot.badge,
                )}
              >
                {profile?.name ?? "General"}
              </span>
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-semibold">
                {getResetLabel(checklist.resetSchedule)}
              </span>
            </div>
            <h3 className="text-foreground mt-1.5 text-base font-extrabold">
              {checklist.title}
            </h3>
            {checklist.description && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                {checklist.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(checklist)}
              aria-label={`Editar ${checklist.title}`}
              title="Editar tarea rutinaria"
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteChecklist(checklist.id)}
            aria-label={`Eliminar ${checklist.title}`}
            className="hover:text-danger h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progreso */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
          <span
            className={cn(
              "flex items-center gap-1.5",
              isComplete ? "text-success" : "text-muted-foreground",
            )}
          >
            {isComplete && <Trophy className="h-3.5 w-3.5" />}
            {isComplete ? "¡Rutina completada!" : "Progreso"}
          </span>
          <span className="text-foreground tabular-nums">
            {doneCount}/{total} · {percent}%
          </span>
        </div>
        <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isComplete ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Pasos con ícono visual en 2 columnas compactas */}
      <ul className="mt-3 grid flex-1 grid-cols-1 gap-1 sm:grid-cols-2">
        {checklist.steps.map((step) => {
          const stepIcon = inferVisualIcon(step.label, "task", step.visualIcon);
          return (
            <li
              key={step.id}
              className="group hover:border-border hover:bg-surface/60 flex items-center gap-1.5 rounded-xl border border-transparent px-1.5 py-0.5 transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleChecklistStep(checklist.id, step.id)}
                className="flex min-h-8 flex-1 cursor-pointer items-center gap-2 text-left"
              >
                {step.done ? (
                  <CheckCircle2 className="text-success h-5 w-5 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" />
                )}
                <span className="bg-surface border-border flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                  <VisualThumb
                    value={stepIcon}
                    alt={step.label}
                    sizeClass="h-8 w-8"
                    textClass="text-base"
                    roundedClass="rounded-xl"
                  />
                </span>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors",
                    step.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {step.label}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeChecklistStep(checklist.id, step.id)}
                aria-label={`Quitar paso ${step.label}`}
                className="text-muted-foreground hover:bg-danger-soft hover:text-danger flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Agregar nuevo paso inline */}
      <form
        onSubmit={handleAddStep}
        className="border-border mt-4 flex items-center gap-2 border-t pt-3.5"
      >
        <input
          type="text"
          value={newStep}
          onChange={(e) => setNewStep(e.target.value)}
          placeholder="Agregar paso a esta rutina..."
          aria-label={`Nuevo paso para ${checklist.title}`}
          className="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/25 min-h-10 flex-1 rounded-xl border px-3 py-1.5 text-sm focus:ring-2 focus:outline-none"
        />
        <Button
          type="submit"
          variant="soft"
          size="icon"
          aria-label="Añadir paso"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </article>
  );
}
