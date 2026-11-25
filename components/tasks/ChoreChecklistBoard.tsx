"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { generateId } from "@/lib/storage";
import type { Checklist, ChecklistResetSchedule } from "@/types/tasks";
import { ChecklistGroupCard } from "./ChecklistGroupCard";

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

export function ChoreChecklistBoard() {
  const { profiles, checklists, addChecklist, updateChecklist } =
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
