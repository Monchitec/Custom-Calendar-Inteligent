"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import { Switch } from "@/components/shared/ui/Switch";
import { VisualIconPicker } from "@/components/shared/ui/VisualIconPicker";
import { cn } from "@/lib/cn";
import { toDateKey } from "@/lib/dates";
import type { BillFrequency, BillKind, RecurringBill } from "@/types/bills";

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";
const LABEL_CLASS =
  "block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5";

interface BillFormModalProps {
  open: boolean;
  editingBill: RecurringBill | null;
  defaultKind?: BillKind;
  onClose: () => void;
}

export function BillFormModal({
  open,
  editingBill,
  defaultKind = "expense",
  onClose,
}: BillFormModalProps) {
  if (!open) return null;
  return (
    <BillFormModalInner
      key={`${editingBill?.id ?? "new"}:${editingBill?.kind ?? defaultKind}`}
      editingBill={editingBill}
      defaultKind={defaultKind}
      onClose={onClose}
    />
  );
}

function BillFormModalInner({
  editingBill,
  defaultKind,
  onClose,
}: {
  editingBill: RecurringBill | null;
  defaultKind: BillKind;
  onClose: () => void;
}) {
  const { addBill, updateBill, preferences } = useCalendarData();

  const [kind, setKind] = useState<BillKind>(editingBill?.kind ?? defaultKind);
  const [name, setName] = useState(editingBill?.name ?? "");
  const [provider, setProvider] = useState(editingBill?.provider ?? "");
  const [amount, setAmount] = useState(
    editingBill ? String(editingBill.amount) : "",
  );
  const [dueDay, setDueDay] = useState(
    editingBill ? String(editingBill.dueDay) : "15",
  );
  const [frequency, setFrequency] = useState<BillFrequency>(
    editingBill?.frequency ?? "monthly",
  );
  const [autoPay, setAutoPay] = useState(editingBill?.autoPay ?? false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(
    String(editingBill?.reminderDaysBefore ?? preferences.defaultBillLeadDays),
  );
  const [paymentUrl, setPaymentUrl] = useState(editingBill?.paymentUrl ?? "");
  const [notes, setNotes] = useState(editingBill?.notes ?? "");
  const [visualIcon, setVisualIcon] = useState(editingBill?.visualIcon ?? "");
  const [error, setError] = useState("");

  const isIncome = kind === "income";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!name.trim() || Number.isNaN(num) || num <= 0) {
      setError("Ingresa un nombre y un monto mayor a 0.");
      return;
    }

    const payload = {
      kind,
      name: name.trim(),
      provider: provider.trim() || undefined,
      visualIcon: visualIcon || undefined,
      amount: num,
      currency: "PEN",
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

    if (editingBill) {
      updateBill(editingBill.id, payload);
    } else {
      addBill(payload);
    }
    onClose();
  };

  return (
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
              Monto (S/)
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
              Frecuencia
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="bf-rem" className={LABEL_CLASS}>
                Avisar días antes
              </label>
              <input
                id="bf-rem"
                type="number"
                min="0"
                max="15"
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(e.target.value)}
                className={cn(INPUT_CLASS, "tabular-nums")}
              />
            </div>
            <div className="border-border bg-surface/60 flex items-center justify-between rounded-2xl border px-4 py-2.5">
              <div>
                <p className="text-foreground text-sm font-semibold">
                  Débito automático
                </p>
                <p className="text-muted-foreground text-xs">
                  Auto-pago activo
                </p>
              </div>
              <Switch
                checked={autoPay}
                onChange={setAutoPay}
                ariaLabel="Débito automático"
              />
            </div>
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
  );
}
