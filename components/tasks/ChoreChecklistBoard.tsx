"use client";

import { useMemo, useState } from "react";
import { Frown, ListChecks, Meh, Plus, Smile } from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import { pad2 } from "@/lib/dates";
import { generateId } from "@/lib/storage";
import type { Checklist, ChecklistResetSchedule } from "@/types/tasks";
import { ChecklistGroupCard } from "./ChecklistGroupCard";
type DayMood = "happy" | "neutral" | "sad";

const DAY_CLOSING_HOUR = 20; // 8:00 p. m.

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

export function ChoreChecklistBoard() {
  const clock = useClock();
  const { profiles, checklists, tasks, addChecklist, updateChecklist } =
    useCalendarData();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(
    null,
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [profileId, setProfileId] = useState("");
  const [resetSchedule, setResetSchedule] =
    useState<ChecklistResetSchedule>("daily");
  const [stepsRaw, setStepsRaw] = useState("");

  const profileMap = useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const stats = useMemo(() => {
    const totalSteps = checklists.reduce((acc, c) => acc + c.steps.length, 0);
    const doneSteps = checklists.reduce(
      (acc, c) => acc + c.steps.filter((s) => s.done).length,
      0,
    );
    const remainingSteps = totalSteps - doneSteps;
    const openTasks = tasks.filter((t) => !t.completed).length;
    const completedTasks = tasks.length - openTasks;

    const nowHour = clock.ready ? clock.now.getHours() : 12;
    const nowMinute = clock.ready ? clock.now.getMinutes() : 0;
    const nowHHMM = `${pad2(nowHour)}:${pad2(nowMinute)}`;
    const isLateDay = clock.ready && nowHour >= DAY_CLOSING_HOUR;
    const isSundayEvening = isLateDay && clock.now.getDay() === 0;

    let overdueTasks = 0;
    if (clock.ready) {
      for (const t of tasks) {
        if (t.completed || !t.dueDate) continue;
        if (t.dueDate < clock.todayKey) {
          overdueTasks += 1;
        } else if (
          t.dueDate === clock.todayKey &&
          t.dueTime &&
          t.dueTime < nowHHMM
        ) {
          overdueTasks += 1;
        }
      }
    }

    let lateDailyRoutines = 0;
    let lateWeeklyRoutines = 0;
    for (const c of checklists) {
      const hasPending = c.steps.some((s) => !s.done);
      if (!hasPending) continue;
      if (c.resetSchedule === "daily" && isLateDay) {
        lateDailyRoutines += 1;
      } else if (c.resetSchedule.startsWith("weekly") && isSundayEvening) {
        lateWeeklyRoutines += 1;
      }
    }

    const totalUnits = totalSteps + tasks.length;
    const doneUnits = doneSteps + completedTasks;
    const overallPct =
      totalUnits > 0 ? Math.round((doneUnits / totalUnits) * 100) : 100;
    const remainingTotal = remainingSteps + openTasks;

    let mood: DayMood = "neutral";
    let moodTitle = "En marcha, aún tienes tiempo";
    let moodSubtitle =
      remainingTotal === 1
        ? "Te falta 1 actividad por completar"
        : `Te faltan ${remainingTotal} actividades por completar`;

    if (overdueTasks > 0 || lateDailyRoutines > 0 || lateWeeklyRoutines > 0) {
      mood = "sad";
      moodTitle = "¡Ánimo, aún puedes ponerte al día!";
      const reasons: string[] = [];
      if (overdueTasks > 0) {
        reasons.push(
          overdueTasks === 1
            ? "1 tarea puntual vencida"
            : `${overdueTasks} tareas puntuales vencidas`,
        );
      }
      if (lateDailyRoutines > 0 || lateWeeklyRoutines > 0) {
        reasons.push("rutinas pendientes al cierre del día");
      }
      moodSubtitle = `Tienes ${reasons.join(" y ")}`;
    } else if (remainingTotal === 0) {
      mood = "happy";
      moodTitle =
        totalUnits === 0
          ? "Todo tranquilo por ahora"
          : "¡Excelente! Actividades cumplidas";
      moodSubtitle =
        totalUnits === 0
          ? "Agrega una rutina o tarea puntual cuando quieras"
          : "Completaste todas tus rutinas y tareas activas";
    }

    return {
      totalSteps,
      doneSteps,
      openTasks,
      totalUnits,
      overallPct,
      mood,
      moodTitle,
      moodSubtitle,
    };
  }, [checklists, tasks, clock.now, clock.ready, clock.todayKey]);

  const handleOpenCreate = () => {
    setEditingChecklistId(null);
    setTitle("");
    setDescription("");
    setProfileId("");
    setResetSchedule("daily");
    setStepsRaw("");
    setModalOpen(true);
  };

  const handleOpenEdit = (cl: Checklist) => {
    setEditingChecklistId(cl.id);
    setTitle(cl.title);
    setDescription(cl.description ?? "");
    setProfileId(cl.profileId);
    setResetSchedule(cl.resetSchedule);
    setStepsRaw(cl.steps.map((s) => s.label).join("\n"));
    setModalOpen(true);
  };

  const handleCreateChecklist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const existing = editingChecklistId
      ? checklists.find((c) => c.id === editingChecklistId)
      : undefined;
    const existingByLabel = new Map(
      (existing?.steps ?? []).map((s) => [s.label.toLowerCase(), s]),
    );

    const steps = stepsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => {
        const prev = existingByLabel.get(label.toLowerCase());
        return prev ? prev : { id: generateId("st"), label, done: false };
      });

    const finalSteps =
      steps.length > 0
        ? steps
        : [{ id: generateId("st"), label: "Primer paso", done: false }];

    if (editingChecklistId) {
      updateChecklist(editingChecklistId, {
        title: title.trim(),
        description: description.trim() || undefined,
        profileId: profileId || profiles[0]?.id || "",
        resetSchedule,
        steps: finalSteps,
      });
    } else {
      addChecklist({
        title: title.trim(),
        description: description.trim() || undefined,
        profileId: profileId || profiles[0]?.id || "",
        resetSchedule,
        steps: finalSteps,
      });
    }

    setEditingChecklistId(null);
    setTitle("");
    setDescription("");
    setStepsRaw("");
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            Mis Tareas
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="primary" size="md" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4" />
            Nueva tarea rutinaria
          </Button>
          <NotificationPopover />
        </div>
      </div>

      {/* Tarjeta amigable de Estado del Día (Feliz / Neutra / Triste) */}
      <section
        aria-label="Estado de actividades"
        className={cn(
          "bg-card flex flex-col gap-4 rounded-3xl border p-5 shadow-2xs md:flex-row md:items-center md:justify-between",
          stats.mood === "happy"
            ? "border-success/35"
            : stats.mood === "sad"
              ? "border-danger/35"
              : "border-border",
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border",
              stats.mood === "happy"
                ? "border-success/30 bg-success-soft text-success"
                : stats.mood === "sad"
                  ? "border-danger/30 bg-danger-soft text-danger"
                  : "border-warning/30 bg-warning-soft text-warning",
            )}
            aria-hidden="true"
          >
            {stats.mood === "happy" ? (
              <Smile className="h-8 w-8 stroke-[2.2]" />
            ) : stats.mood === "sad" ? (
              <Frown className="h-8 w-8 stroke-[2.2]" />
            ) : (
              <Meh className="h-8 w-8 stroke-[2.2]" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-foreground text-base font-extrabold sm:text-lg">
              {stats.moodTitle}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium sm:text-sm">
              {stats.moodSubtitle}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2.5 md:max-w-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-semibold">
              Avance general
            </span>
            <span className="text-foreground font-extrabold tabular-nums">
              {stats.totalUnits === 0 ? "—" : `${stats.overallPct}%`}
            </span>
          </div>

          <div
            className="border-border/70 bg-muted h-2.5 w-full overflow-hidden rounded-full border"
            role="progressbar"
            aria-valuenow={stats.totalUnits === 0 ? 0 : stats.overallPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Porcentaje de actividades completadas"
          >
            {stats.totalUnits > 0 && stats.overallPct > 0 && (
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  stats.mood === "happy"
                    ? "bg-success"
                    : stats.mood === "sad"
                      ? "bg-danger"
                      : "bg-primary",
                )}
                style={{ width: `${stats.overallPct}%` }}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border-border bg-surface/75 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold tabular-nums">
              <ListChecks className="text-primary h-3.5 w-3.5" />
              <span>
                Rutinas:{" "}
                <strong className="text-foreground font-extrabold">
                  {stats.doneSteps}/{stats.totalSteps}
                </strong>
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Contenido de tareas rutinarias */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-foreground text-lg font-extrabold">
              Tareas rutinarias
            </h2>
          </div>
        </div>

        {checklists.length === 0 ? (
          <div className="border-border bg-surface/40 rounded-2xl border border-dashed p-10 text-center">
            <p className="text-foreground text-base font-bold">
              Aún no tienes tareas rutinarias creadas
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Crea rutinas escolares, de limpieza del hogar o de trabajo con
              pasos marcables.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {checklists.map((cl) => (
              <ChecklistGroupCard
                key={cl.id}
                checklist={cl}
                profile={profileMap.get(cl.profileId)}
                onEdit={handleOpenEdit}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal nueva / editar Checklist */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingChecklistId
            ? "Editar tarea rutinaria"
            : "Nueva tarea rutinaria"
        }
        subtitle="Ideal para rutinas diarias, colegio de Azucena, limpieza del hogar o compras"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" form="new-checklist-form" variant="primary">
              {editingChecklistId ? "Guardar cambios" : "Crear tarea rutinaria"}
            </Button>
          </div>
        }
      >
        <form
          id="new-checklist-form"
          onSubmit={handleCreateChecklist}
          className="space-y-4"
        >
          <div>
            <label htmlFor="chk-title" className={LABEL_CLASS}>
              Nombre de la tarea rutinaria
            </label>
            <input
              id="chk-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Rutina de noche de Azucena, Compras del súper..."
              className={INPUT_CLASS}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="chk-desc" className={LABEL_CLASS}>
              Descripción (opcional)
            </label>
            <input
              id="chk-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve nota o propósito"
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="chk-prf" className={LABEL_CLASS}>
                Perfil
              </label>
              <select
                id="chk-prf"
                value={profileId || profiles[0]?.id || ""}
                onChange={(e) => setProfileId(e.target.value)}
                className={INPUT_CLASS}
              >
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="chk-reset" className={LABEL_CLASS}>
                Reinicio automático
              </label>
              <select
                id="chk-reset"
                value={
                  resetSchedule.startsWith("weekly") ? "weekly" : resetSchedule
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "weekly") {
                    setResetSchedule("weekly:1");
                  } else {
                    setResetSchedule(val as ChecklistResetSchedule);
                  }
                }}
                className={INPUT_CLASS}
              >
                <option value="daily">Cada día</option>
                <option value="weekly">Cada semana</option>
                <option value="none">Manual (no se reinicia)</option>
              </select>
            </div>
          </div>

          {resetSchedule.startsWith("weekly") && (
            <div>
              <label htmlFor="chk-reset-day" className={LABEL_CLASS}>
                Día de reinicio semanal
              </label>
              <select
                id="chk-reset-day"
                value={
                  resetSchedule.includes(":")
                    ? resetSchedule.split(":")[1]
                    : "1"
                }
                onChange={(e) =>
                  setResetSchedule(
                    `weekly:${Number(e.target.value) as 0 | 1 | 2 | 3 | 4 | 5 | 6}`,
                  )
                }
                className={INPUT_CLASS}
              >
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="chk-steps" className={LABEL_CLASS}>
              Pasos iniciales (uno por línea)
            </label>
            <textarea
              id="chk-steps"
              rows={4}
              value={stepsRaw}
              onChange={(e) => setStepsRaw(e.target.value)}
              placeholder={
                "Guardar juguetes\nCepillar dientes\nPreparar uniforme"
              }
              className={INPUT_CLASS}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
