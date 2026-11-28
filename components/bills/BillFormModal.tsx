"use client";

import { useState } from "react";
import { AlertCircle, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { VisualIconPicker } from "@/components/shared/ui/VisualIconPicker";
import { cn } from "@/lib/cn";
import {
  daysInMonth,
  formatMonthYear,
  pad2,
  parseDateKey,
  toDateKey,
} from "@/lib/dates";
import type { BillFrequency, BillKind, RecurringBill } from "@/types/bills";

const FREQ_LOWER_LABELS: Record<BillFrequency, string> = {
  monthly: "mensual",
  biweekly: "quincenal",
  weekly: "semanal",
  quarterly: "trimestral",
  yearly: "anual",
  once: "única",
};

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

interface BillFormModalProps {
  open: boolean;
  editingBill: RecurringBill | null;
  defaultKind?: BillKind;
  defaultProfileId?: string;
  contextMonthKey?: string;
  onClose: () => void;
}

export function BillFormModal({
  open,
  editingBill,
  defaultKind = "expense",
  defaultProfileId,
  contextMonthKey,
  onClose,
}: BillFormModalProps) {
  if (!open) return null;
  return (
    <BillFormModalInner
      key={`${editingBill?.id ?? "new"}:${editingBill?.kind ?? defaultKind}:${editingBill?.profileId ?? defaultProfileId ?? ""}:${contextMonthKey ?? ""}`}
      editingBill={editingBill}
      defaultKind={defaultKind}
      defaultProfileId={defaultProfileId}
      contextMonthKey={contextMonthKey}
      onClose={onClose}
    />
  );
}

function getPrevMonthEndKey(monthKey: string): string {
  const [yStr, mStr] = monthKey.split("-");
  let y = Number(yStr);
  let m = Number(mStr) - 1; // 1..12 -> 0..11
  if (m <= 0) {
    m = 12;
    y -= 1;
  }
  const lastDay = daysInMonth(y, m - 1);
  return `${y}-${pad2(m)}-${pad2(lastDay)}`;
}

function BillFormModalInner({
  editingBill,
  defaultKind,
  defaultProfileId,
  contextMonthKey,
  onClose,
}: {
  editingBill: RecurringBill | null;
  defaultKind: BillKind;
  defaultProfileId?: string;
  contextMonthKey?: string;
  onClose: () => void;
}) {
  const { profiles, addBill, updateBill, preferences } = useCalendarData();
  const primaryProfileId =
    profiles.find((p) => p.isPrimary)?.id ?? profiles[0]?.id ?? "";

  const effectiveInitialAmount =
    editingBill && contextMonthKey
      ? (editingBill.amountOverrides?.[contextMonthKey] ?? editingBill.amount)
      : editingBill?.amount;

  const [kind, setKind] = useState<BillKind>(editingBill?.kind ?? defaultKind);
  const [profileId, setProfileId] = useState<string>(
    editingBill?.profileId ?? defaultProfileId ?? primaryProfileId,
  );
  const [name, setName] = useState(editingBill?.name ?? "");
  const [provider, setProvider] = useState(editingBill?.provider ?? "");
  const [amount, setAmount] = useState(
    effectiveInitialAmount !== undefined ? String(effectiveInitialAmount) : "",
  );
  const [scopePromptOpen, setScopePromptOpen] = useState(false);
  const [dueDay, setDueDay] = useState(
    editingBill ? String(editingBill.dueDay) : "15",
  );
  const [frequency, setFrequency] = useState<BillFrequency>(
    editingBill?.frequency ?? "monthly",
  );
  const [autoPay] = useState(editingBill?.autoPay ?? false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    String(editingBill?.reminderDaysBefore ?? preferences.defaultBillLeadDays),
  );
  const [paymentUrl, setPaymentUrl] = useState(editingBill?.paymentUrl ?? "");
  const [notes, setNotes] = useState(editingBill?.notes ?? "");
  const [visualIcon, setVisualIcon] = useState(editingBill?.visualIcon ?? "");
  const [error, setError] = useState("");

  const selectedProfile = profiles.find(
    (p) => p.id === (profileId || primaryProfileId),
  );
  const selectedCurrency =
    selectedProfile?.currency ?? editingBill?.currency ?? "PEN";

  const isIncome = kind === "income";

  const buildPayload = () => {
    const num = Number(amount);
    return {
      kind,
      profileId: profileId || primaryProfileId || undefined,
      name: name.trim(),
      provider: provider.trim() || undefined,
      visualIcon: visualIcon || undefined,
      amount: num,
      currency: selectedCurrency,
      dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
      startDate: editingBill?.startDate ?? toDateKey(new Date()),
      frequency,
      autoPay: isIncome ? false : autoPay,
      reminderDaysBefore: isIncome
        ? 0
        : Math.max(0, Number(reminderDaysBefore) || 0),
      paymentUrl: paymentUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };
  };

  const hasChanges = editingBill
    ? (editingBill.kind ?? "expense") !== kind ||
      (editingBill.profileId ?? primaryProfileId) !==
        (profileId || primaryProfileId) ||
      editingBill.name !== name.trim() ||
      (editingBill.provider ?? "") !== provider.trim() ||
      (effectiveInitialAmount ?? editingBill.amount) !== Number(amount) ||
      editingBill.dueDay !== Math.min(31, Math.max(1, Number(dueDay) || 1)) ||
      editingBill.frequency !== frequency ||
      (isIncome ? false : editingBill.autoPay) !==
        (isIncome ? false : autoPay) ||
      (isIncome ? 0 : editingBill.reminderDaysBefore) !==
        (isIncome ? 0 : Math.max(0, Number(reminderDaysBefore) || 0)) ||
      (editingBill.paymentUrl ?? "") !== paymentUrl.trim() ||
      (editingBill.notes ?? "") !== notes.trim() ||
      (editingBill.visualIcon ?? "") !== visualIcon
    : true;

  const contextMonthLabel = contextMonthKey
    ? formatMonthYear(parseDateKey(`${contextMonthKey}-01`))
    : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!name.trim() || Number.isNaN(num) || num <= 0) {
      setError("Ingresa un nombre y un monto mayor a 0.");
      return;
    }

    if (editingBill && !hasChanges) {
      onClose();
      return;
    }

    if (editingBill && editingBill.frequency !== "once" && contextMonthKey) {
      setScopePromptOpen(true);
      return;
    }

    const payload = buildPayload();
    if (editingBill) {
      updateBill(editingBill.id, payload);
    } else {
      addBill(payload);
    }
    onClose();
  };

  const applyOnlyThisMonth = () => {
    if (!editingBill || !contextMonthKey) return;
    const payload = buildPayload();
    updateBill(editingBill.id, {
      ...payload,
      // Mantiene el monto base original para los demás meses y guarda solo la excepción de este mes
      amount: editingBill.amount,
      amountOverrides: {
        ...(editingBill.amountOverrides ?? {}),
        [contextMonthKey]: payload.amount,
      },
    });
    setScopePromptOpen(false);
    onClose();
  };

  const applyFromThisMonthForward = () => {
    if (!editingBill || !contextMonthKey) return;
    const payload = buildPayload();
    if (contextMonthKey <= editingBill.startDate.slice(0, 7)) {
      updateBill(editingBill.id, payload);
    } else {
      const prevEnd = getPrevMonthEndKey(contextMonthKey);
      updateBill(editingBill.id, { endDate: prevEnd });
      addBill({
        ...payload,
        startDate: `${contextMonthKey}-01`,
      });
    }
    setScopePromptOpen(false);
    onClose();
  };

  const applyAllMonths = () => {
    if (!editingBill) return;
    const payload = buildPayload();
    updateBill(editingBill.id, {
      ...payload,
      amountOverrides: undefined,
    });
    setScopePromptOpen(false);
    onClose();
  };

  return (
    <>
      <Modal
      open
      onClose={onClose}
      title={
        editingBill
          ? isIncome
            ? "Editar ingreso"
            : "Editar pago recurrente"
          : isIncome
            ? "Nuevo ingreso"
            : "Nuevo pago del hogar"
      }
      subtitle={
        isIncome
          ? "Registra sueldos, honorarios o ingresos extra para calcular tu balance mensual"
          : "Se proyectará automáticamente en tu calendario mensual con recordatorio"
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="bill-form" variant="primary">
            {editingBill
              ? "Guardar cambios"
              : isIncome
                ? "Registrar ingreso"
                : "Registrar pago"}
          </Button>
        </div>
      }
    >
      <form id="bill-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de tipo: Ingreso a la izquierda de Gasto / Pago */}
        <div
          role="group"
          aria-label="Tipo de movimiento"
          className="border-border bg-surface grid grid-cols-2 gap-1 rounded-2xl border p-1"
        >
          <button
            type="button"
            onClick={() => setKind("income")}
            aria-pressed={isIncome}
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
              isIncome
                ? "bg-success text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDownLeft className="h-4 w-4" />
            Ingreso
          </button>
          <button
            type="button"
            onClick={() => setKind("expense")}
            aria-pressed={!isIncome}
            className={cn(
              "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
              !isIncome
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUpRight className="h-4 w-4" />
            Gasto / Pago
          </button>
        </div>

        {/* Selector de Perfil */}
        {profiles.length > 0 && (
          <div>
            <label htmlFor="bf-profile" className={LABEL_CLASS}>
              Perfil
            </label>
            <select
              id="bf-profile"
              value={profileId || primaryProfileId}
              onChange={(e) => setProfileId(e.target.value)}
              className={INPUT_CLASS}
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === primaryProfileId ? " (Principal)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="bf-name" className={LABEL_CLASS}>
              {isIncome ? "Nombre del ingreso" : "Nombre del pago"}
            </label>
            <input
              id="bf-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isIncome
                  ? "Ej. Sueldo, Consultorio, Bono, Freelance..."
                  : "Ej. Alquiler, Luz, Internet, Colegio..."
              }
              className={INPUT_CLASS}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="bf-prov" className={LABEL_CLASS}>
              {isIncome ? "Origen / Fuente" : "Proveedor / Entidad"}
            </label>
            <input
              id="bf-prov"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder={
                isIncome
                  ? "Ej. Empresa, Clínica, Cliente"
                  : "Ej. Compañía Eléctrica"
              }
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="bf-amount" className={LABEL_CLASS}>
              Monto ({selectedCurrency === "USD" ? "$" : "S/"})
            </label>
            <input
              id="bf-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={cn(INPUT_CLASS, "tabular-nums")}
            />
          </div>
          <div>
            <label htmlFor="bf-day" className={LABEL_CLASS}>
              {isIncome ? "Día de ingreso" : "Día de vencimiento"}
            </label>
            <input
              id="bf-day"
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              className={cn(INPUT_CLASS, "tabular-nums")}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label htmlFor="bf-freq" className={LABEL_CLASS}>
              Frecuencia de pago
            </label>
            <select
              id="bf-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as BillFrequency)}
              className={INPUT_CLASS}
            >
              <option value="monthly">Mensual</option>
              <option value="biweekly">Quincenal</option>
              <option value="weekly">Semanal</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
              <option value="once">
                {isIncome ? "Ingreso único" : "Pago único"}
              </option>
            </select>
          </div>
        </div>

        {!isIncome && (
          <div>
            <label
              htmlFor="bf-rem"
              className={cn(LABEL_CLASS, "inline-flex items-center gap-1.5")}
            >
              <span>Recordatorio</span>
              <span aria-hidden="true">🔔</span>
            </label>
            <select
              id="bf-rem"
              value={reminderDaysBefore}
              onChange={(e) => setReminderDaysBefore(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="0">El mismo día</option>
              <option value="1">1 día antes</option>
              <option value="2">2 días antes</option>
              <option value="3">3 días antes</option>
              <option value="5">5 días antes</option>
              <option value="7">7 días antes</option>
            </select>
          </div>
        )}

        <div>
          <span className={LABEL_CLASS}>
            {isIncome
              ? "Ícono o imagen (opcional)"
              : "Ícono o imagen del servicio (opcional)"}
          </span>
          <VisualIconPicker
            value={visualIcon}
            onChange={setVisualIcon}
            compact
          />
        </div>

        {!isIncome && (
          <div>
            <label htmlFor="bf-url" className={LABEL_CLASS}>
              Link de pago (opcional)
            </label>
            <input
              id="bf-url"
              type="url"
              value={paymentUrl}
              onChange={(e) => setPaymentUrl(e.target.value)}
              placeholder="https://portal.entidad.com/pagos"
              className={INPUT_CLASS}
            />
          </div>
        )}

        <div>
          <label htmlFor="bf-notes" className={LABEL_CLASS}>
            Notas (opcional)
          </label>
          <textarea
            id="bf-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              isIncome
                ? "Cuenta destino, observaciones..."
                : "Referencia bancaria, código de suministro..."
            }
            className={INPUT_CLASS}
          />
        </div>

        {error && (
          <p className="bg-danger-soft text-danger rounded-xl px-3.5 py-2 text-xs font-semibold">
            {error}
          </p>
        )}
      </form>
    </Modal>

      {/* Modal aparte de alerta para elegir alcance del cambio */}
      <Modal
        open={Boolean(scopePromptOpen && editingBill)}
        onClose={() => setScopePromptOpen(false)}
        title="¿Cómo deseas aplicar este cambio?"
        maxWidthClass="max-w-md"
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setScopePromptOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        }
      >
        <div className="space-y-2.5">
          <div className="bg-warning-soft border-warning/35 flex items-start gap-2.5 rounded-2xl border p-3.5">
            <AlertCircle className="text-warning mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-foreground text-xs leading-relaxed font-medium">
              Este registro se repite de forma{" "}
              <strong className="font-extrabold">
                {FREQ_LOWER_LABELS[editingBill?.frequency ?? frequency]}
              </strong>
              . ¿Estás seguro de cómo deseas aplicar el cambio?
            </p>
          </div>

          <button
            type="button"
            onClick={applyOnlyThisMonth}
            className="border-border bg-card hover:border-primary/40 hover:bg-card-hover flex w-full cursor-pointer items-center rounded-2xl border px-4 py-3 text-left transition-all"
          >
            <span className="text-foreground text-sm font-extrabold">
              Solo este mes ({contextMonthLabel})
            </span>
          </button>

          <button
            type="button"
            onClick={applyFromThisMonthForward}
            className="border-border bg-card hover:border-primary/40 hover:bg-card-hover flex w-full cursor-pointer items-center rounded-2xl border px-4 py-3 text-left transition-all"
          >
            <span className="text-foreground text-sm font-extrabold">
              Desde este mes en adelante
            </span>
          </button>

          <button
            type="button"
            onClick={applyAllMonths}
            className="border-border bg-card hover:border-primary/40 hover:bg-card-hover flex w-full cursor-pointer items-center rounded-2xl border px-4 py-3 text-left transition-all"
          >
            <span className="text-foreground text-sm font-extrabold">
              Todos los meses
            </span>
          </button>
        </div>
      </Modal>
    </>
  );
}
