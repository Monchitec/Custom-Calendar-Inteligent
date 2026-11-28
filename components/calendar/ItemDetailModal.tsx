"use client";

import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  MapPin,
  Repeat,
  Trash2,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { Switch } from "@/components/shared/ui/Switch";
import {
  minutesToTime,
  TimePicker15,
  timeToMinutes,
} from "@/components/shared/ui/TimePicker15";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  formatDateWithWeekday,
  formatTimeDisplay,
  parseDateKey,
} from "@/lib/dates";
import {
  encodeCustomRecurrenceDays,
  formatRecurrenceLabel,
  getBillOccurrenceKey,
  isCustomDaysRecurrence,
  MONDAY_FIRST_DAYS,
  parseCustomRecurrenceDays,
} from "@/lib/recurrence";
import { getProfileSlotClasses } from "@/lib/themes";
import type {
  ProjectedCalendarItem,
  RecurrenceFrequency,
} from "@/types/calendar";

const STANDARD_RECURRENCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "No se repite" },
  { value: "daily", label: "Todos los días" },
  { value: "weekdays", label: "Lunes a viernes" },
  { value: "weekly", label: "Cada semana" },
  { value: "biweekly", label: "Cada 2 semanas" },
  { value: "monthly", label: "Cada mes" },
  { value: "yearly", label: "Cada año" },
  { value: "custom", label: "Personalizado (elegir días)" },
];

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1";

export function ItemDetailModal({
  item,
  initialEditing = false,
  onClose,
}: {
  item: ProjectedCalendarItem | null;
  initialEditing?: boolean;
  onClose: () => void;
}) {
  if (!item) return null;

  return (
    <ItemDetailModalInner
      key={`${item.id}:${initialEditing ? "edit" : "view"}`}
      item={item}
      initialEditing={initialEditing}
      onClose={onClose}
    />
  );
}

function ItemDetailModalInner({
  item,
  initialEditing,
  onClose,
}: {
  item: ProjectedCalendarItem;
  initialEditing: boolean;
  onClose: () => void;
}) {
  const {
    profiles,
    events,
    bills,
    tasks,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleBillPaid,
    toggleTask,
    deleteTask,
  } = useCalendarData();

  const sourceEvent =
    item.source === "event"
      ? events.find((e) => e.id === item.sourceId)
      : undefined;
  const sourceBill =
    item.source === "bill"
      ? bills.find((b) => b.id === item.sourceId)
      : undefined;
  const sourceTask =
    item.source === "task"
      ? tasks.find((t) => t.id === item.sourceId)
      : undefined;

  const [editing, setEditing] = useState(initialEditing);
  const [scopePrompt, setScopePrompt] = useState<"save" | "delete" | null>(
    null,
  );
  const [title, setTitle] = useState(sourceEvent?.title ?? item.title);
  const [date, setDate] = useState(item.date);
  const [allDay, setAllDay] = useState(sourceEvent?.allDay ?? item.allDay);
  const [startTime, setStartTime] = useState(sourceEvent?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(sourceEvent?.endTime ?? "10:00");
  const [profileId, setProfileId] = useState(
    sourceEvent?.profileId ?? item.profileId,
  );
  const [location, setLocation] = useState(sourceEvent?.location ?? "");
  const initialRec = sourceEvent?.recurrence ?? "none";
  const [recurrence, setRecurrence] = useState<string>(
    isCustomDaysRecurrence(initialRec) ? "custom" : initialRec,
  );
  const [customDays, setCustomDays] = useState<number[]>(() =>
    isCustomDaysRecurrence(initialRec)
      ? parseCustomRecurrenceDays(initialRec)
      : [parseDateKey(sourceEvent?.date ?? item.date).getDay()],
  );
  const [notes, setNotes] = useState(sourceEvent?.notes ?? "");
  const [reminderMinutes, setReminderMinutes] = useState<string>(
    sourceEvent?.reminderMinutes !== null &&
      sourceEvent?.reminderMinutes !== undefined
      ? String(sourceEvent.reminderMinutes)
      : "none",
  );

  const slot = getProfileSlotClasses(item.colorSlot);

  const isRecurringEvent = Boolean(
    sourceEvent && sourceEvent.recurrence !== "none",
  );

  const resolveEditedRecurrence = (): RecurrenceFrequency =>
    recurrence === "custom"
      ? customDays.length > 0
        ? encodeCustomRecurrenceDays(customDays)
        : "none"
      : (recurrence as RecurrenceFrequency);

  const resolveReminderMinutes = (): number | null =>
    reminderMinutes === "none" ? null : Number(reminderMinutes);

  const applySaveAllSeries = () => {
    if (!sourceEvent || !title.trim()) return;
    updateEvent(sourceEvent.id, {
      title: title.trim(),
      date: date === item.date ? sourceEvent.date : date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      profileId,
      location: location.trim() || undefined,
      recurrence: resolveEditedRecurrence(),
      notes: notes.trim() || undefined,
      reminderMinutes: resolveReminderMinutes(),
    });
    setScopePrompt(null);
    setEditing(false);
    onClose();
  };

  const applySaveSingleOccurrence = () => {
    if (!sourceEvent || !title.trim()) return;
    const prevExcluded = sourceEvent.excludedDates ?? [];
    if (!prevExcluded.includes(item.date)) {
      updateEvent(sourceEvent.id, {
        excludedDates: [...prevExcluded, item.date],
      });
    }
    addEvent({
      title: title.trim(),
      date,
      allDay,
      startTime: allDay ? undefined : startTime,
      endTime: allDay ? undefined : endTime,
      profileId,
      visualIcon: sourceEvent.visualIcon,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      recurrence: "none",
      reminderMinutes: resolveReminderMinutes(),
    });
    setScopePrompt(null);
    setEditing(false);
    onClose();
  };

  const applyDeleteSingleOccurrence = () => {
    if (!sourceEvent) return;
    const prevExcluded = sourceEvent.excludedDates ?? [];
    if (!prevExcluded.includes(item.date)) {
      updateEvent(sourceEvent.id, {
        excludedDates: [...prevExcluded, item.date],
      });
    }
    setScopePrompt(null);
    onClose();
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceEvent || !title.trim()) return;
    if (isRecurringEvent) {
      setScopePrompt("save");
      return;
    }
    applySaveAllSeries();
  };

  const billOccurrenceKey = sourceBill
    ? getBillOccurrenceKey(sourceBill, item.date)
    : "";
  const isBillPaidNow = sourceBill
    ? sourceBill.paidOccurrences.includes(billOccurrenceKey)
    : false;

  const handleEditStartChange = (nextStart: string) => {
    const prevDuration = Math.max(
      15,
      timeToMinutes(endTime) - timeToMinutes(startTime),
    );
    setStartTime(nextStart);
    const nextEndMins = Math.min(
      23 * 60 + 45,
      timeToMinutes(nextStart) + prevDuration,
    );
    setEndTime(minutesToTime(nextEndMins));
  };

  const modalFooter =
    scopePrompt === "save" && sourceEvent ? (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-xs font-semibold">
          ¿Aplicar cambios a:
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setScopePrompt(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applySaveSingleOccurrence}
          >
            Solo este evento ({formatDateWithWeekday(item.date)})
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={applySaveAllSeries}
          >
            Toda la serie
          </Button>
        </div>
      </div>
    ) : scopePrompt === "delete" && sourceEvent ? (
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground text-xs font-semibold">
          ¿Qué deseas eliminar?
        </span>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setScopePrompt(null)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={applyDeleteSingleOccurrence}
          >
            Solo este día ({formatDateWithWeekday(item.date)})
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => {
              deleteEvent(sourceEvent.id);
              setScopePrompt(null);
              onClose();
            }}
          >
            Toda la serie
          </Button>
        </div>
      </div>
    ) : editing && sourceEvent ? (
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
          Volver
        </Button>
        <Button type="submit" form="edit-event-form" variant="primary">
          Guardar cambios
        </Button>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        {sourceEvent && (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (isRecurringEvent) {
                  setScopePrompt("delete");
                  return;
                }
                deleteEvent(sourceEvent.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Edit3 className="h-4 w-4" />
                Editar
              </Button>
            </div>
          </>
        )}

        {sourceBill && (
          <>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              variant={isBillPaidNow ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                toggleBillPaid(sourceBill.id, billOccurrenceKey);
                onClose();
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {isBillPaidNow ? "Marcar como pendiente" : "Marcar como pagado"}
            </Button>
          </>
        )}

        {sourceTask && (
          <>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                deleteTask(sourceTask.id);
                onClose();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Cerrar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  toggleTask(sourceTask.id);
                  onClose();
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {sourceTask.completed ? "Reabrir tarea" : "Completar tarea"}
              </Button>
            </div>
          </>
        )}
      </div>
    );

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Editar evento" : item.title}
      subtitle={`${item.profileLabel} · ${formatDateWithWeekday(item.date)}`}
      maxWidthClass="max-w-lg"
      footer={modalFooter}
    >
      {editing && sourceEvent ? (
        <form
          id="edit-event-form"
          onSubmit={handleSaveEdit}
          className="space-y-4"
        >
          <div>
            <label htmlFor="edit-evt-title" className={LABEL_CLASS}>
              Título
            </label>
            <input
              id="edit-evt-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-evt-prf" className={LABEL_CLASS}>
                Perfil
              </label>
              <select
                id="edit-evt-prf"
                value={profileId}
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
              <label htmlFor="edit-evt-date" className={LABEL_CLASS}>
                Fecha
              </label>
              <input
                id="edit-evt-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={cn(INPUT_CLASS, "tabular-nums")}
              />
            </div>
          </div>

          <div className="border-border bg-surface/50 rounded-2xl border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-semibold">
                Todo el día
              </span>
              <Switch
                checked={allDay}
                onChange={setAllDay}
                ariaLabel="Todo el día"
              />
            </div>

            {!allDay && (
              <div className="border-border/70 mt-3 grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-evt-start" className={LABEL_CLASS}>
                    Inicio
                  </label>
                  <TimePicker15
                    id="edit-evt-start"
                    value={startTime}
                    onChange={handleEditStartChange}
                    ariaLabel="Hora de inicio"
                  />
                </div>
                <div>
                  <label htmlFor="edit-evt-end" className={LABEL_CLASS}>
                    Fin
                  </label>
                  <TimePicker15
                    id="edit-evt-end"
                    value={endTime}
                    minTime={startTime}
                    onChange={setEndTime}
                    ariaLabel="Hora de fin"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-evt-rec" className={LABEL_CLASS}>
                Repetición
              </label>
              <select
                id="edit-evt-rec"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className={INPUT_CLASS}
              >
                {STANDARD_RECURRENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-evt-loc" className={LABEL_CLASS}>
                Ubicación
              </label>
              <input
                id="edit-evt-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {recurrence === "custom" && (
            <div className="border-border bg-surface/50 rounded-2xl border p-3.5">
              <span className={LABEL_CLASS}>
                Repetir los días seleccionados
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MONDAY_FIRST_DAYS.map((d) => {
                  const selected = customDays.includes(d.dow);
                  return (
                    <button
                      key={d.dow}
                      type="button"
                      onClick={() =>
                        setCustomDays((prev) =>
                          prev.includes(d.dow)
                            ? prev.filter((x) => x !== d.dow)
                            : [...prev, d.dow],
                        )
                      }
                      aria-pressed={selected}
                      className={cn(
                        "flex h-9 min-w-10 cursor-pointer items-center justify-center rounded-xl px-2 text-xs font-bold transition-all",
                        selected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-card-hover hover:text-foreground border",
                      )}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="edit-evt-reminder"
              className={cn(LABEL_CLASS, "inline-flex items-center gap-1.5")}
            >
              <span>Notificación / Recordatorio</span>
              <span aria-hidden="true">🔔</span>
            </label>
            <select
              id="edit-evt-reminder"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="none">Sin recordatorio</option>
              <option value="0">A la hora del evento</option>
              <option value="5">5 minutos antes</option>
              <option value="15">15 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
              <option value="1440">1 día antes</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit-evt-notes" className={LABEL_CLASS}>
              Notas
            </label>
            <textarea
              id="edit-evt-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                slot.badge,
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", slot.dot)} />
              {item.profileLabel}
            </span>

            {sourceBill && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                  isBillPaidNow
                    ? "bg-success-soft text-success"
                    : "bg-warning-soft text-warning",
                )}
              >
                <CreditCard className="h-3.5 w-3.5" />
                {isBillPaidNow ? "Pagado este periodo" : "Pendiente de pago"}
              </span>
            )}

            {sourceTask && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                  sourceTask.completed
                    ? "bg-success-soft text-success"
                    : "bg-primary-soft text-primary",
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {sourceTask.completed ? "Tarea completada" : "Tarea pendiente"}
              </span>
            )}
          </div>

          <div className="border-border bg-surface/60 space-y-2.5 rounded-2xl border p-4 text-sm">
            <div className="text-foreground flex items-center gap-2.5">
              <Calendar className="text-primary h-4 w-4" />
              <span className="font-semibold">
                {formatDateWithWeekday(item.date)}
              </span>
            </div>

            {!item.allDay && item.startTime && (
              <div className="text-foreground flex items-center gap-2.5 tabular-nums">
                <Clock className="text-primary h-4 w-4" />
                <span>
                  {formatTimeDisplay(item.startTime)}
                  {item.endTime ? ` — ${formatTimeDisplay(item.endTime)}` : ""}
                </span>
              </div>
            )}

            {item.location && (
              <div className="text-foreground flex items-center gap-2.5">
                <MapPin className="text-primary h-4 w-4" />
                <span>{item.location}</span>
              </div>
            )}

            {sourceEvent && sourceEvent.recurrence !== "none" && (
              <div className="text-muted-foreground flex items-center gap-2.5">
                <Repeat className="text-primary h-4 w-4" />
                <span>{formatRecurrenceLabel(sourceEvent.recurrence)}</span>
              </div>
            )}

            {sourceBill && (
              <div className="border-border flex items-center justify-between border-t pt-2.5">
                <span className="text-muted-foreground">Monto programado</span>
                <span className="text-foreground text-lg font-extrabold tabular-nums">
                  {formatCurrency(sourceBill.amount, sourceBill.currency)}
                </span>
              </div>
            )}
          </div>

          {item.notes && (
            <div className="border-border bg-background text-muted-foreground rounded-2xl border p-3.5 text-sm">
              {item.notes}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
