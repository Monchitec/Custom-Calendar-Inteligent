"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Circle,
  Flag,
  Plus,
  Trash2,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import { formatShortDate } from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { TaskPriority } from "@/types/tasks";

const PRIORITY_META: Record<
  TaskPriority,
  { label: string; badgeClass: string }
> = {
  high: { label: "Alta", badgeClass: "bg-danger-soft text-danger" },
  medium: { label: "Media", badgeClass: "bg-warning-soft text-warning" },
  low: { label: "Baja", badgeClass: "bg-secondary-soft text-secondary" },
};

export function PendingList() {
  const { profiles, tasks, addTask, toggleTask, deleteTask } =
    useCalendarData();
  const clock = useClock();

  const [title, setTitle] = useState("");
  const [profileId, setProfileId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "completed"
  >("all");
  const [profileFilter, setProfileFilter] = useState<string>("all");

  const effectiveProfileId = profileId || profiles[0]?.id || "";
  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === "pending" && t.completed) return false;
      if (statusFilter === "completed" && !t.completed) return false;
      if (profileFilter !== "all" && t.profileId !== profileFilter) {
        return false;
      }
      return true;
    });
  }, [tasks, statusFilter, profileFilter]);

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({
      title: title.trim(),
      completed: false,
      profileId: effectiveProfileId,
      priority,
      dueDate: dueDate || undefined,
      showOnCalendar: Boolean(dueDate),
    });
    setTitle("");
    setDueDate("");
  };

  const todayKey = clock.ready ? clock.todayKey : "";

  return (
    <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-lg font-extrabold">
            Tareas puntuales
          </h2>
          <p className="text-muted-foreground text-xs">
            Las tareas con fecha aparecen automáticamente en tu calendario
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "pending", "completed"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                "min-h-8 cursor-pointer rounded-xl px-3 text-xs font-bold transition-colors",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {status === "all"
                ? "Todos"
                : status === "pending"
                  ? "Pendientes"
                  : "Completados"}
            </button>
          ))}
        </div>
      </div>

      {/* Formulario rápido inline */}
      <form
        onSubmit={handleQuickCreate}
        className="border-border bg-surface/70 mt-4 grid grid-cols-1 gap-2 rounded-2xl border p-3 sm:grid-cols-12"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Escribir una nueva tarea puntual..."
          aria-label="Título de la nueva tarea puntual"
          className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/25 min-h-10 rounded-xl border px-3.5 text-sm focus:ring-2 focus:outline-none sm:col-span-5"
        />
        <select
          value={effectiveProfileId}
          onChange={(e) => setProfileId(e.target.value)}
          aria-label="Perfil del pendiente"
          className="border-border bg-card text-foreground focus:border-primary min-h-10 rounded-xl border px-3 text-xs font-semibold focus:outline-none sm:col-span-2"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          aria-label="Prioridad"
          className="border-border bg-card text-foreground focus:border-primary min-h-10 rounded-xl border px-3 text-xs font-semibold focus:outline-none sm:col-span-2"
        >
          <option value="high">Prioridad Alta</option>
          <option value="medium">Prioridad Media</option>
          <option value="low">Prioridad Baja</option>
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Fecha límite opcional"
          className="border-border bg-card text-foreground focus:border-primary min-h-10 rounded-xl border px-2.5 text-xs tabular-nums focus:outline-none sm:col-span-2"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="sm:col-span-1"
        >
          <Plus className="h-4 w-4" />
          <span className="sm:hidden">Agregar</span>
        </Button>
      </form>

      {/* Filtro rápido por perfil */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setProfileFilter("all")}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
            profileFilter === "all"
              ? "border-primary/35 bg-primary-soft text-primary"
              : "border-border bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          Todos los perfiles
        </button>
        {profiles.map((p) => {
          const slot = getProfileSlotClasses(p.colorSlot);
          const active = profileFilter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfileFilter(active ? "all" : p.id)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                active
                  ? slot.activeChip
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <ul className="divide-border mt-4 divide-y">
        {filteredTasks.length === 0 ? (
          <li className="text-muted-foreground py-10 text-center text-sm">
            No hay tareas puntuales en esta vista. ¡Buen trabajo!
          </li>
        ) : (
          filteredTasks.map((task) => {
            const prof = profileMap.get(task.profileId);
            const slot = getProfileSlotClasses(prof?.colorSlot ?? "cat-6");
            const pri = PRIORITY_META[task.priority];
            const isOverdue =
              !task.completed && task.dueDate && task.dueDate < todayKey;

            return (
              <li
                key={task.id}
                className="group flex items-start gap-3 py-3 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={
                    task.completed
                      ? `Reabrir ${task.title}`
                      : `Completar ${task.title}`
                  }
                  className="text-muted-foreground hover:text-primary mt-0.5 cursor-pointer transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="text-success h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-surface border-border flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                      <VisualThumb
                        value={inferVisualIcon(
                          task.title,
                          "task",
                          task.visualIcon,
                        )}
                        alt={task.title}
                        sizeClass="h-7 w-7"
                        textClass="text-sm"
                        roundedClass="rounded-xl"
                      />
                    </span>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        task.completed
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {task.title}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {prof && (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-bold",
                          slot.badge,
                        )}
                      >
                        {prof.name}
                      </span>
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
                        pri.badgeClass,
                      )}
                    >
                      <Flag className="h-3 w-3" />
                      {pri.label}
                    </span>
                    {task.dueDate && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          isOverdue
                            ? "bg-danger-soft text-danger"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <Calendar className="h-3 w-3" />
                        {formatShortDate(task.dueDate)}
                        {task.dueTime ? ` · ${task.dueTime}` : ""}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(task.id)}
                  aria-label={`Eliminar ${task.title}`}
                  className="hover:text-danger h-8 w-8 shrink-0 opacity-60 hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
