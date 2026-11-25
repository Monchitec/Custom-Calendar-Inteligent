"use client";

import {
  AlertTriangle,
  ArrowDownLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Repeat,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/shared/ui/Button";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import { formatCurrency, formatShortDate } from "@/lib/dates";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { BillFrequency, BillStatus, RecurringBill } from "@/types/bills";

const FREQ_LABELS: Record<BillFrequency, string> = {
  monthly: "Mensual",
  biweekly: "Quincenal",
  weekly: "Semanal",
  quarterly: "Trimestral",
  yearly: "Anual",
  once: "Pago único",
};

const STATUS_STYLES: Record<
  BillStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Pagado",
    className: "bg-danger-soft text-danger border border-danger/30",
    icon: CheckCircle2,
  },
  overdue: {
    label: "Vencido",
    className:
      "bg-warning-soft text-warning border border-warning/30 animate-pulse",
    icon: AlertTriangle,
  },
  "due-soon": {
    label: "Vence pronto",
    className: "bg-warning-soft text-warning border border-warning/30",
    icon: Clock,
  },
  upcoming: {
    label: "Próximo",
    className: "bg-muted text-muted-foreground border border-border",
    icon: Calendar,
  },
};

function normalizePaymentUrl(url?: string): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

interface BillCardProps {
  bill: RecurringBill;
  dueDate: string;
  status: BillStatus;
  onTogglePaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function BillCard({
  bill,
  dueDate,
  status,
  onTogglePaid,
  onEdit,
  onDelete,
}: BillCardProps) {
  const isIncome = bill.kind === "income";
  const isPaid = status === "paid";
  const st = isIncome
    ? isPaid
      ? {
          label: "Recibido",
          className: "bg-success-soft text-success border border-success/30",
          icon: CheckCircle2,
        }
      : {
          label: "Ingreso",
          className:
            "bg-secondary-soft text-secondary border border-secondary/30",
          icon: ArrowDownLeft,
        }
    : STATUS_STYLES[status];
  const StatusIcon = st.icon;

  return (
    <article
      className={cn(
        "bg-card flex flex-col justify-between rounded-3xl border p-5 shadow-xs transition-all",
        isIncome
          ? "border-success/35 bg-success-soft/10"
          : status === "overdue"
            ? "border-warning/45"
            : isPaid
              ? "border-danger/35 bg-danger-soft/10"
              : "border-border hover:border-primary/30",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                st.className,
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {st.label}
            </span>
            {!isIncome && bill.autoPay && (
              <span className="bg-secondary-soft text-secondary inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold">
                <Zap className="h-3 w-3" />
                Auto-pago
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={`Editar ${bill.name}`}
              className="h-8 w-8"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={`Eliminar ${bill.name}`}
              className="hover:text-danger h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border",
              isIncome
                ? "border-success/30 bg-success-soft"
                : "bg-surface border-border",
            )}
          >
            <VisualThumb
              value={
                bill.visualIcon ||
                (isIncome ? "💰" : inferVisualIcon(bill.name, "bill"))
              }
              alt={bill.name}
              sizeClass="h-10 w-10"
              textClass="text-xl"
              roundedClass="rounded-2xl"
            />
          </span>
          <div className="min-w-0">
            <h3 className="text-foreground truncate text-base font-extrabold">
              {bill.name}
            </h3>
            {bill.provider && (
              <p className="text-muted-foreground truncate text-xs font-medium">
                {bill.provider}
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface/70 mt-4 flex items-baseline justify-between gap-2 rounded-2xl px-3.5 py-2.5">
          <div>
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {isIncome ? "Ingreso" : "Monto"}
            </p>
            <p
              className={cn(
                "text-xl font-extrabold tabular-nums",
                isIncome ? "text-success" : "text-foreground",
              )}
            >
              {isIncome ? "+" : ""}
              {formatCurrency(bill.amount, bill.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
              {isIncome ? "Fecha" : "Vencimiento"}
            </p>
            <p className="text-foreground text-sm font-bold tabular-nums">
              {formatShortDate(dueDate)}
            </p>
            <p className="text-muted-foreground inline-flex items-center gap-1 text-[11px]">
              <Repeat className="h-3 w-3" />
              {FREQ_LABELS[bill.frequency]}
            </p>
          </div>
        </div>

        {bill.notes && (
          <p className="text-muted-foreground mt-3 text-xs">{bill.notes}</p>
        )}

        {!isIncome && normalizePaymentUrl(bill.paymentUrl) && (
          <a
            href={normalizePaymentUrl(bill.paymentUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            className="border-cat-1/30 bg-cat-1-soft text-cat-1 hover:bg-cat-1 hover:text-primary-foreground mt-3 inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            Abrir link de pago
          </a>
        )}
      </div>

      <div className="mt-4 pt-2">
        <Button
          variant={isPaid ? "secondary" : "primary"}
          size="md"
          onClick={onTogglePaid}
          className={cn(
            "w-full",
            isPaid &&
              "bg-muted text-muted-foreground border-border/70 hover:bg-muted opacity-60 shadow-none hover:opacity-85",
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isIncome
            ? isPaid
              ? "Recibido (desmarcar)"
              : "Marcar como recibido"
            : isPaid
              ? "Pagado (desmarcar)"
              : "Marcar como pagado"}
        </Button>
      </div>
    </article>
  );
}

/**
 * Plantilla de columnas compartida:
 * Nombre de Servicio | Monto | Vencimiento | Estado | Link | Acciones (alineadas a la derecha)
 */
export const BILL_LIST_GRID_COLS =
  "lg:grid-cols-[minmax(175px,245px)_minmax(112px,132px)_minmax(150px,178px)_minmax(118px,162px)_minmax(108px,128px)_minmax(148px,1fr)] lg:gap-4";

/** Vista compacta en línea (lista de detalles) */
export function BillRow({
  bill,
  dueDate,
  status,
  onTogglePaid,
  onEdit,
  onDelete,
}: BillCardProps) {
  const isIncome = bill.kind === "income";
  const isPaid = status === "paid";
  const st = isIncome
    ? isPaid
      ? {
          label: "Recibido",
          className: "bg-success-soft text-success border border-success/30",
          icon: CheckCircle2,
        }
      : {
          label: "Ingreso",
          className:
            "bg-secondary-soft text-secondary border border-secondary/30",
          icon: ArrowDownLeft,
        }
    : STATUS_STYLES[status];
  const StatusIcon = st.icon;

  return (
    <div
      className={cn(
        "hover:bg-card-hover/60 flex flex-col gap-2.5 border-l-3 px-4 py-2.5 transition-colors sm:px-5 lg:grid lg:items-center",
        BILL_LIST_GRID_COLS,
        isIncome
          ? "border-l-success bg-success-soft/10"
          : status === "overdue"
            ? "border-l-warning"
            : status === "due-soon"
              ? "border-l-warning"
              : isPaid
                ? "border-l-danger bg-danger-soft/10"
                : "border-l-transparent",
      )}
    >
      {/* Nombre de Servicio / Ingreso + Proveedor */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
            isIncome
              ? "border-success/30 bg-success-soft"
              : "bg-surface border-border",
          )}
        >
          <VisualThumb
            value={
              bill.visualIcon ||
              (isIncome ? "💰" : inferVisualIcon(bill.name, "bill"))
            }
            alt={bill.name}
            sizeClass="h-9 w-9"
            textClass="text-lg"
            roundedClass="rounded-xl"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm leading-snug font-extrabold">
            {bill.name}
          </p>
          {(bill.provider || bill.notes) && (
            <p className="text-muted-foreground truncate text-xs leading-snug font-medium">
              {bill.provider}
              {bill.provider && bill.notes ? ` · ${bill.notes}` : bill.notes}
            </p>
          )}
        </div>
      </div>

      {/* Monto (verde con + para ingresos) */}
      <div
        className={cn(
          "text-sm font-extrabold whitespace-nowrap tabular-nums sm:text-base lg:pr-5 lg:text-right",
          isIncome ? "text-success" : "text-foreground",
        )}
      >
        {isIncome ? "+" : ""}
        {formatCurrency(bill.amount, bill.currency)}
      </div>

      {/* Fecha / Vencimiento + Frecuencia */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
        <span className="text-foreground font-bold whitespace-nowrap tabular-nums">
          {formatShortDate(dueDate)}
        </span>
        <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] whitespace-nowrap">
          <Repeat className="h-3 w-3 shrink-0" />
          {FREQ_LABELS[bill.frequency]}
        </span>
      </div>

      {/* Estado */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap",
            st.className,
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          {st.label}
        </span>
        {!isIncome && bill.autoPay && (
          <span className="bg-secondary-soft text-secondary inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap">
            <Zap className="h-3 w-3 shrink-0" />
            Auto
          </span>
        )}
      </div>

      {/* Link de pago */}
      <div className="flex items-center">
        {!isIncome && normalizePaymentUrl(bill.paymentUrl) ? (
          <a
            href={normalizePaymentUrl(bill.paymentUrl)!}
            target="_blank"
            rel="noopener noreferrer"
            title={bill.paymentUrl}
            className="border-cat-1/30 bg-cat-1-soft text-cat-1 hover:bg-cat-1 hover:text-primary-foreground inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap transition-colors"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            Link de Pago
          </a>
        ) : (
          <span className="text-muted-foreground/50 text-xs">—</span>
        )}
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end gap-1">
        <Button
          variant={isPaid ? "secondary" : "primary"}
          size="sm"
          onClick={onTogglePaid}
          className={cn(
            "min-h-8 px-3 text-xs",
            isPaid &&
              "bg-muted text-muted-foreground border-border/70 hover:bg-muted opacity-60 shadow-none hover:opacity-85",
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isIncome
            ? isPaid
              ? "Recibido"
              : "Recibir"
            : isPaid
              ? "Pagado"
              : "Pagar"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Editar ${bill.name}`}
          className="h-8 w-8"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          aria-label={`Eliminar ${bill.name}`}
          className="hover:text-danger h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
