"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import {
  type QuickAddTab,
  useCalendarData,
} from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { Switch } from "@/components/shared/ui/Switch";
import {
  minutesToTime,
  TimePicker15,
  timeToMinutes,
} from "@/components/shared/ui/TimePicker15";
import { VisualIconPicker } from "@/components/shared/ui/VisualIconPicker";
import { cn } from "@/lib/cn";
import { getWeekdayTinyLabels, parseDateKey, toDateKey } from "@/lib/dates";
import {
  encodeCustomRecurrenceDays,
  MONDAY_FIRST_DAYS,
} from "@/lib/recurrence";
import { ALARM_SOUNDS, playAlarmSound } from "@/lib/sounds";
import type { AlarmSoundId } from "@/types/alarms";
import type { BillFrequency } from "@/types/bills";
import type { RecurrenceFrequency } from "@/types/calendar";
import type { TaskPriority } from "@/types/tasks";

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

export function QuickAddModal() {
  const { quickAdd, closeQuickAdd } = useCalendarData();
  if (!quickAdd.open) return null;

  return (
    <QuickAddModalInner
      key={`${quickAdd.tab}:${quickAdd.defaultDate ?? "today"}`}
      initialTab={quickAdd.tab}
      defaultDate={quickAdd.defaultDate}
      onClose={closeQuickAdd}
    />
  );
}

function QuickAddModalInner({
  initialTab,
  defaultDate,
  onClose,
}: {
  initialTab: QuickAddTab;
  defaultDate?: string;
  onClose: () => void;
}) {
  const { profiles, preferences, addEvent, addTask, addBill, addAlarm } =
    useCalendarData();

  const todayKey = defaultDate ?? toDateKey(new Date());
  const defaultProfileId = profiles[0]?.id ?? "";

  const tab = initialTab;

  // Event state
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDate, setEvtDate] = useState(todayKey);
  const [evtAllDay, setEvtAllDay] = useState(false);
  const [evtStart, setEvtStart] = useState("09:00");
  const [evtEnd, setEvtEnd] = useState("10:00");
  const [evtProfile, setEvtProfile] = useState(defaultProfileId);
  const [evtRecurrence, setEvtRecurrence] = useState<string>("none");
  const [evtCustomDays, setEvtCustomDays] = useState<number[]>(() => [
    parseDateKey(todayKey).getDay(),
  ]);
  const [evtLocation, setEvtLocation] = useState("");
  const [evtReminder, setEvtReminder] = useState<string>(
    String(preferences.defaultEventLeadMinutes),
  );
  const [evtNotes, setEvtNotes] = useState("");
  const [evtIcon, setEvtIcon] = useState("");

  // Task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProfile, setTaskProfile] = useState(defaultProfileId);
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskDueDate, setTaskDueDate] = useState(todayKey);
  const [taskDueTime, setTaskDueTime] = useState("");
  const [taskShowOnCal, setTaskShowOnCal] = useState(true);
  const [taskNotes, setTaskNotes] = useState("");
  const [taskIcon, setTaskIcon] = useState("");

  // Bill state
  const [billName, setBillName] = useState("");
  const [billProvider, setBillProvider] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDay, setBillDueDay] = useState(
    String(Math.min(28, Number(todayKey.slice(8, 10)) || 15)),
  );
  const [billFrequency, setBillFrequency] = useState<BillFrequency>("monthly");
  const [billAutoPay, setBillAutoPay] = useState(false);
  const [billReminderDays, setBillReminderDays] = useState(
    String(preferences.defaultBillLeadDays),
  );
  const [billNotes, setBillNotes] = useState("");
  const [billIcon, setBillIcon] = useState("");

  // Alarm state
  const [alarmLabel, setAlarmLabel] = useState("");
  const [alarmTime, setAlarmTime] = useState("07:30");
  const [alarmDays, setAlarmDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [alarmSound, setAlarmSound] = useState<AlarmSoundId>(
    preferences.defaultSound,
  );
  const [alarmProfile, setAlarmProfile] = useState(defaultProfileId);

  const [error, setError] = useState("");

  const toggleAlarmDay = (dayIndex: number) => {
    setAlarmDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort(),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (tab === "event") {
      if (!evtTitle.trim()) {
        setError("Escribe un título para el evento o cita.");
        return;
      }
      const resolvedRecurrence: RecurrenceFrequency =
        evtRecurrence === "custom"
          ? evtCustomDays.length > 0
            ? encodeCustomRecurrenceDays(evtCustomDays)
            : "none"
          : (evtRecurrence as RecurrenceFrequency);

      addEvent({
        title: evtTitle.trim(),
        date: evtDate,
        allDay: evtAllDay,
        startTime: evtAllDay ? undefined : evtStart,
        endTime: evtAllDay ? undefined : evtEnd,
        profileId: evtProfile || defaultProfileId,
        visualIcon: evtIcon || undefined,
        location: evtLocation.trim() || undefined,
        notes: evtNotes.trim() || undefined,
        recurrence: resolvedRecurrence,
        reminderMinutes: evtReminder === "none" ? null : Number(evtReminder),
      });
      onClose();
      return;
    }

    if (tab === "task") {
      if (!taskTitle.trim()) {
        setError("Escribe el nombre de la tarea pendiente.");
        return;
      }
      addTask({
        title: taskTitle.trim(),
        completed: false,
        profileId: taskProfile || defaultProfileId,
        visualIcon: taskIcon || undefined,
        dueDate: taskDueDate || undefined,
        dueTime: taskDueTime || undefined,
        priority: taskPriority,
        notes: taskNotes.trim() || undefined,
        showOnCalendar: taskShowOnCal,
      });
      onClose();
      return;
    }

    if (tab === "bill") {
      const amountNum = Number(billAmount);
      if (!billName.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
        setError("Ingresa el nombre del pago y un monto válido mayor a 0.");
        return;
      }
      addBill({
        name: billName.trim(),
        provider: billProvider.trim() || undefined,
        visualIcon: billIcon || undefined,
        amount: amountNum,
        currency: "PEN",
        dueDay: Math.min(31, Math.max(1, Number(billDueDay) || 1)),
        startDate: todayKey,
        frequency: billFrequency,
        autoPay: billAutoPay,
        reminderDaysBefore: Math.max(0, Number(billReminderDays) || 0),
        notes: billNotes.trim() || undefined,
      });
      onClose();
      return;
    }

    if (tab === "alarm") {
      if (!alarmLabel.trim()) {
        setError("Escribe una etiqueta para tu alarma.");
        return;
      }
      addAlarm({
        label: alarmLabel.trim(),
        time: alarmTime,
        days: alarmDays,
        enabled: true,
        sound: alarmSound,
        profileId: alarmProfile || undefined,
        snoozeMinutes: 5,
      });
      onClose();
    }
  };

  const weekdayTiny = getWeekdayTinyLabels();

  const modalTitle =
    tab === "event"
      ? "Nuevo evento"
      : tab === "task"
        ? "Nueva tarea"
        : tab === "bill"
          ? "Nuevo pago"
          : "Nueva alarma";

  const modalSubtitle =
    tab === "event"
      ? "Programa un evento, actividad o cita en tu calendario"
      : tab === "task"
        ? "Registra una tarea puntual con fecha, hora y detalles"
        : tab === "bill"
          ? "Programa un pago recurrente o único con recordatorio"
          : "Configura una alarma con sonido y días de repetición";

  const submitLabel =
    tab === "event"
      ? "Guardar evento"
      : tab === "task"
        ? "Guardar tarea"
        : tab === "bill"
          ? "Guardar pago"
          : "Guardar alarma";

  const handleStartTimeChange = (nextStart: string) => {
    const prevDuration = Math.max(
      15,
      timeToMinutes(evtEnd) - timeToMinutes(evtStart),
    );
    setEvtStart(nextStart);
    const nextEndMins = Math.min(
      23 * 60 + 45,
      timeToMinutes(nextStart) + prevDuration,
    );
    setEvtEnd(minutesToTime(nextEndMins));
  };

  const currentDurationMins = Math.max(
    0,
    timeToMinutes(evtEnd) - timeToMinutes(evtStart),
  );

  const applyQuickDuration = (minutes: number) => {
    const nextEndMins = Math.min(
      23 * 60 + 45,
      timeToMinutes(evtStart) + minutes,
    );
    setEvtEnd(minutesToTime(nextEndMins));
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
      maxWidthClass="max-w-xl"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="quick-add-form" variant="primary">
            {submitLabel}
          </Button>
        </div>
      }
    >
      <form id="quick-add-form" onSubmit={handleSubmit} className="space-y-4">
        {tab === "event" && (
          <>
            <div>
              <label htmlFor="qa-evt-title" className={LABEL_CLASS}>
                Título del evento, actividad o cita
              </label>
              <input
                id="qa-evt-title"
                type="text"
                placeholder="Ej. Reunión en el colegio de Azucena, Cita médica..."
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                className={INPUT_CLASS}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-evt-prf" className={LABEL_CLASS}>
                  Perfil
                </label>
                <select
                  id="qa-evt-prf"
                  value={evtProfile}
                  onChange={(e) => setEvtProfile(e.target.value)}
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
                <label htmlFor="qa-evt-date" className={LABEL_CLASS}>
                  Fecha
                </label>
                <input
                  id="qa-evt-date"
                  type="date"
                  value={evtDate}
                  onChange={(e) => setEvtDate(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
            </div>

            <div className="border-border bg-surface/60 flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Todo el día
                </p>
                <p className="text-muted-foreground text-xs">
                  Desactívalo para definir hora de inicio y fin
                </p>
              </div>
              <Switch
                checked={evtAllDay}
                onChange={setEvtAllDay}
                ariaLabel="Evento de todo el día"
              />
            </div>

            {!evtAllDay && (
              <div className="border-border bg-surface/40 space-y-3 rounded-2xl border p-3.5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="qa-evt-start" className={LABEL_CLASS}>
                      Inicio
                    </label>
                    <TimePicker15
                      id="qa-evt-start"
                      value={evtStart}
                      onChange={handleStartTimeChange}
                      ariaLabel="Hora de inicio"
                    />
                  </div>
                  <div>
                    <label htmlFor="qa-evt-end" className={LABEL_CLASS}>
                      Fin
                    </label>
                    <TimePicker15
                      id="qa-evt-end"
                      value={evtEnd}
                      minTime={evtStart}
                      onChange={setEvtEnd}
                      ariaLabel="Hora de fin"
                    />
                  </div>
                </div>

                {/* Accesos rápidos de duración */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-muted-foreground mr-1 text-[11px] font-semibold">
                    Duración rápida:
                  </span>
                  {[
                    { label: "15 min", mins: 15 },
                    { label: "30 min", mins: 30 },
                    { label: "1 h", mins: 60 },
                    { label: "1.5 h", mins: 90 },
                    { label: "2 h", mins: 120 },
                  ].map((preset) => {
                    const active = currentDurationMins === preset.mins;
                    return (
                      <button
                        key={preset.mins}
                        type="button"
                        onClick={() => applyQuickDuration(preset.mins)}
                        className={cn(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums transition-all",
                          active
                            ? "border-primary/40 bg-primary-soft text-primary"
                            : "border-border bg-card text-muted-foreground hover:bg-card-hover hover:text-foreground",
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-evt-rec" className={LABEL_CLASS}>
                  Repetición
                </label>
                <select
                  id="qa-evt-rec"
                  value={evtRecurrence}
                  onChange={(e) => setEvtRecurrence(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="none">No se repite</option>
                  <option value="daily">Todos los días</option>
                  <option value="weekdays">Lunes a viernes</option>
                  <option value="weekly">Cada semana</option>
                  <option value="biweekly">Cada 2 semanas</option>
                  <option value="monthly">Cada mes</option>
                  <option value="yearly">Cada año</option>
                  <option value="custom">Personalizado (elegir días)</option>
                </select>
              </div>
              <div>
                <label htmlFor="qa-evt-rem" className={LABEL_CLASS}>
                  Recordatorio
                </label>
                <select
                  id="qa-evt-rem"
                  value={evtReminder}
                  onChange={(e) => setEvtReminder(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="none">Sin recordatorio</option>
                  <option value="0">A la hora del evento</option>
                  <option value="10">10 minutos antes</option>
                  <option value="15">15 minutos antes</option>
                  <option value="30">30 minutos antes</option>
                  <option value="60">1 hora antes</option>
                </select>
              </div>
            </div>

            {evtRecurrence === "custom" && (
              <div className="border-border bg-surface/50 rounded-2xl border p-3.5">
                <span className={LABEL_CLASS}>
                  Repetir los días seleccionados
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MONDAY_FIRST_DAYS.map((d) => {
                    const selected = evtCustomDays.includes(d.dow);
                    return (
                      <button
                        key={d.dow}
                        type="button"
                        onClick={() =>
                          setEvtCustomDays((prev) =>
                            prev.includes(d.dow)
                              ? prev.filter((x) => x !== d.dow)
                              : [...prev, d.dow],
                          )
                        }
                        aria-pressed={selected}
                        title={d.short}
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
              <label htmlFor="qa-evt-loc" className={LABEL_CLASS}>
                Ubicación (opcional)
              </label>
              <input
                id="qa-evt-loc"
                type="text"
                placeholder="Ej. Clínica Central, Colegio, Zoom..."
                value={evtLocation}
                onChange={(e) => setEvtLocation(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <span className={LABEL_CLASS}>
                Ícono visual (opcional · si lo dejas vacío se asigna automático)
              </span>
              <VisualIconPicker value={evtIcon} onChange={setEvtIcon} compact />
            </div>

            <div>
              <label htmlFor="qa-evt-notes" className={LABEL_CLASS}>
                Notas (opcional)
              </label>
              <textarea
                id="qa-evt-notes"
                rows={2}
                placeholder="Detalles importantes, documentos a llevar..."
                value={evtNotes}
                onChange={(e) => setEvtNotes(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {tab === "task" && (
          <>
            <div>
              <label htmlFor="qa-tsk-title" className={LABEL_CLASS}>
                ¿Qué pendiente quieres anotar?
              </label>
              <input
                id="qa-tsk-title"
                type="text"
                placeholder="Ej. Comprar útiles escolares, Enviar cotización..."
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className={INPUT_CLASS}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-tsk-prf" className={LABEL_CLASS}>
                  Perfil
                </label>
                <select
                  id="qa-tsk-prf"
                  value={taskProfile}
                  onChange={(e) => setTaskProfile(e.target.value)}
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
                <label htmlFor="qa-tsk-pri" className={LABEL_CLASS}>
                  Prioridad
                </label>
                <select
                  id="qa-tsk-pri"
                  value={taskPriority}
                  onChange={(e) =>
                    setTaskPriority(e.target.value as TaskPriority)
                  }
                  className={INPUT_CLASS}
                >
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qa-tsk-date" className={LABEL_CLASS}>
                  Fecha límite (opcional)
                </label>
                <input
                  id="qa-tsk-date"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
              <div>
                <label htmlFor="qa-tsk-time" className={LABEL_CLASS}>
                  Hora (opcional)
                </label>
                <TimePicker15
                  id="qa-tsk-time"
                  value={taskDueTime}
                  onChange={setTaskDueTime}
                  allowEmpty
                  placeholder="Sin hora"
                  ariaLabel="Hora opcional de la tarea"
                />
              </div>
            </div>

            <div className="border-border bg-surface/60 flex items-center justify-between rounded-2xl border px-4 py-3">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Mostrar en el Calendario
                </p>
                <p className="text-muted-foreground text-xs">
                  Aparecerá en la cuadrícula del día seleccionado
                </p>
              </div>
              <Switch
                checked={taskShowOnCal}
                onChange={setTaskShowOnCal}
                ariaLabel="Mostrar tarea en calendario"
              />
            </div>

            <div>
              <span className={LABEL_CLASS}>
                Ícono visual de tarea (opcional)
              </span>
              <VisualIconPicker
                value={taskIcon}
                onChange={setTaskIcon}
                compact
              />
            </div>

            <div>
              <label htmlFor="qa-tsk-notes" className={LABEL_CLASS}>
                Notas (opcional)
              </label>
              <textarea
                id="qa-tsk-notes"
                rows={2}
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                placeholder="Subdetalles o recordatorios..."
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {tab === "bill" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-bill-name" className={LABEL_CLASS}>
                  Nombre del pago
                </label>
                <input
                  id="qa-bill-name"
                  type="text"
                  placeholder="Ej. Electricidad, Internet, Colegio..."
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  className={INPUT_CLASS}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="qa-bill-prov" className={LABEL_CLASS}>
                  Proveedor (opcional)
                </label>
                <input
                  id="qa-bill-prov"
                  type="text"
                  placeholder="Ej. FibraHogar"
                  value={billProvider}
                  onChange={(e) => setBillProvider(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="qa-bill-amount" className={LABEL_CLASS}>
                  Monto (S/)
                </label>
                <input
                  id="qa-bill-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
              <div>
                <label htmlFor="qa-bill-day" className={LABEL_CLASS}>
                  Día de pago
                </label>
                <input
                  id="qa-bill-day"
                  type="number"
                  min="1"
                  max="31"
                  value={billDueDay}
                  onChange={(e) => setBillDueDay(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="qa-bill-freq" className={LABEL_CLASS}>
                  Frecuencia
                </label>
                <select
                  id="qa-bill-freq"
                  value={billFrequency}
                  onChange={(e) =>
                    setBillFrequency(e.target.value as BillFrequency)
                  }
                  className={INPUT_CLASS}
                >
                  <option value="monthly">Mensual</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="weekly">Semanal</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="yearly">Anual</option>
                  <option value="once">Pago único</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-bill-rem" className={LABEL_CLASS}>
                  Avisar días antes
                </label>
                <input
                  id="qa-bill-rem"
                  type="number"
                  min="0"
                  max="15"
                  value={billReminderDays}
                  onChange={(e) => setBillReminderDays(e.target.value)}
                  className={cn(INPUT_CLASS, "tabular-nums")}
                />
              </div>
              <div className="border-border bg-surface/60 flex items-center justify-between rounded-2xl border px-4 py-2.5">
                <div>
                  <p className="text-foreground text-sm font-semibold">
                    Débito automático
                  </p>
                  <p className="text-muted-foreground text-xs">Auto-pago</p>
                </div>
                <Switch
                  checked={billAutoPay}
                  onChange={setBillAutoPay}
                  ariaLabel="Débito automático"
                />
              </div>
            </div>

            <div>
              <span className={LABEL_CLASS}>Ícono del servicio (opcional)</span>
              <VisualIconPicker
                value={billIcon}
                onChange={setBillIcon}
                compact
              />
            </div>

            <div>
              <label htmlFor="qa-bill-notes" className={LABEL_CLASS}>
                Notas (opcional)
              </label>
              <input
                id="qa-bill-notes"
                type="text"
                placeholder="Número de cuenta, referencia..."
                value={billNotes}
                onChange={(e) => setBillNotes(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </>
        )}

        {tab === "alarm" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label htmlFor="qa-alm-label" className={LABEL_CLASS}>
                  Etiqueta de alarma
                </label>
                <input
                  id="qa-alm-label"
                  type="text"
                  placeholder="Ej. Salida al colegio de Azucena..."
                  value={alarmLabel}
                  onChange={(e) => setAlarmLabel(e.target.value)}
                  className={INPUT_CLASS}
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="qa-alm-time" className={LABEL_CLASS}>
                  Hora
                </label>
                <input
                  id="qa-alm-time"
                  type="time"
                  value={alarmTime}
                  onChange={(e) => setAlarmTime(e.target.value)}
                  className={cn(INPUT_CLASS, "font-bold tabular-nums")}
                />
              </div>
            </div>

            <div>
              <span className={LABEL_CLASS}>Repetir los días</span>
              <div className="flex flex-wrap gap-2">
                {weekdayTiny.map((lbl, idx) => {
                  const selected = alarmDays.includes(idx);
                  return (
                    <button
                      key={lbl + idx}
                      type="button"
                      onClick={() => toggleAlarmDay(idx)}
                      className={cn(
                        "flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-xs font-bold transition-all",
                        selected
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "border-border bg-background text-muted-foreground hover:bg-muted border",
                      )}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                {alarmDays.length === 0
                  ? "Sonará una sola vez."
                  : "Se repetirá automáticamente los días seleccionados."}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="qa-alm-sound" className={LABEL_CLASS}>
                  Sonido de alarma
                </label>
                <div className="flex gap-2">
                  <select
                    id="qa-alm-sound"
                    value={alarmSound}
                    onChange={(e) =>
                      setAlarmSound(e.target.value as AlarmSoundId)
                    }
                    className={INPUT_CLASS}
                  >
                    {ALARM_SOUNDS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() =>
                      playAlarmSound(alarmSound, preferences.volume)
                    }
                    aria-label="Probar tono seleccionado"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label htmlFor="qa-alm-prf" className={LABEL_CLASS}>
                  Perfil asociado
                </label>
                <select
                  id="qa-alm-prf"
                  value={alarmProfile}
                  onChange={(e) => setAlarmProfile(e.target.value)}
                  className={INPUT_CLASS}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="bg-danger-soft text-danger rounded-xl px-3.5 py-2 text-xs font-semibold">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
