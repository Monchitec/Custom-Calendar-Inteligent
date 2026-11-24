"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  List,
  Plus,
  Wallet,
} from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { useClock } from "@/hooks/useClock";
import { cn } from "@/lib/cn";
import {
  addMonths,
  clampDayOfMonth,
  formatCurrency,
  formatMonthYear,
  getMonthName,
  parseDateKey,
  toMonthKey,
} from "@/lib/dates";
import { getBillOccurrenceKey, getBillStatus } from "@/lib/recurrence";
import type { BillStatus, RecurringBill } from "@/types/bills";
import { BILL_LIST_GRID_COLS, BillCard, BillRow } from "./BillCard";
import { BillFormModal } from "./BillFormModal";

type BillFilter = "all" | "pending" | "paid";
type BillViewMode = "list" | "cards";

function doesBillApplyToMonth(
  bill: RecurringBill,
  year: number,
  monthIndex0: number,
): boolean {
  if (!bill.startDate) return true;
  const start = parseDateKey(bill.startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  const delta = year * 12 + monthIndex0 - (startYear * 12 + startMonth);

  // No proyectar ni cobrar meses anteriores al mes en que se creó el pago
  if (delta < 0) return false;

  if (bill.frequency === "once") {
    return delta === 0;
  }
  if (bill.frequency === "yearly") {
    return delta % 12 === 0;
  }
  if (bill.frequency === "quarterly") {
    return delta % 3 === 0;
  }
  return true;
}

export function BillsDashboard() {
  const clock = useClock();
  const { bills, toggleBillPaid, deleteBill } = useCalendarData();

  const [monthOffset, setMonthOffset] = useState(0);
  const [filter, setFilter] = useState<BillFilter>("all");
  const [viewMode, setViewMode] = useState<BillViewMode>("list");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const viewDate = useMemo(
    () => addMonths(clock.now, monthOffset),
    [clock.now, monthOffset],
  );
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const viewMonthKey = toMonthKey(viewDate);

  const enrichedBills = useMemo(() => {
    return bills
      .filter((bill) => doesBillApplyToMonth(bill, viewYear, viewMonth))
      .map((bill) => {
        const dueDate = clampDayOfMonth(viewYear, viewMonth, bill.dueDay);
        const occKey =
          bill.frequency === "monthly" ||
          bill.frequency === "quarterly" ||
          bill.frequency === "yearly"
            ? viewMonthKey
            : getBillOccurrenceKey(bill, dueDate);
        const isPaid = bill.paidOccurrences.includes(occKey);
        const status: BillStatus = getBillStatus(
          isPaid,
          dueDate,
          clock.todayKey,
          bill.reminderDaysBefore,
        );
        return { bill, dueDate, occKey, status };
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, viewYear, viewMonth, viewMonthKey, clock.todayKey]);

  const filteredBills = useMemo(() => {
    return enrichedBills.filter((entry) => {
      if (filter === "paid") return entry.status === "paid";
      if (filter === "pending") return entry.status !== "paid";
      return true;
    });
  }, [enrichedBills, filter]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueStrictCount = 0;

    for (const item of enrichedBills) {
      totalAmount += item.bill.amount;
      if (item.status === "paid") {
        paidAmount += item.bill.amount;
        paidCount += 1;
      } else {
        pendingAmount += item.bill.amount;
        pendingCount += 1;
        if (item.status === "overdue") {
          overdueStrictCount += 1;
        }
      }
    }

    const pct =
      totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      paidCount,
      pendingCount,
      overdueStrictCount,
      pct,
    };
  }, [enrichedBills]);

  /** Ventana de 7 meses centrada en el mes activo (3 previos + actual + 3 siguientes) */
  const monthlyTrend = useMemo(() => {
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    const points = offsets.map((rel) => {
      const targetOffset = monthOffset + rel;
      const d = addMonths(clock.now, targetOffset);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mKey = toMonthKey(d);

      let total = 0;
      let paid = 0;

      for (const bill of bills) {
        if (!doesBillApplyToMonth(bill, y, m)) continue;
        const dueDate = clampDayOfMonth(y, m, bill.dueDay);
        const occKey =
          bill.frequency === "monthly" ||
          bill.frequency === "quarterly" ||
          bill.frequency === "yearly"
            ? mKey
            : getBillOccurrenceKey(bill, dueDate);
        total += bill.amount;
        if (bill.paidOccurrences.includes(occKey)) {
          paid += bill.amount;
        }
      }

      return {
        offset: targetOffset,
        isSelected: rel === 0,
        shortMonth: getMonthName(m).slice(0, 3),
        fullLabel: formatMonthYear(d),
        total,
        paid,
        pending: Math.max(0, total - paid),
      };
    });

    const maxVal = Math.max(...points.map((p) => p.total), 1);
    const activeMonths = points.filter((p) => p.total > 0);
    const avgTotal =
      activeMonths.length > 0
        ? activeMonths.reduce((acc, p) => acc + p.total, 0) /
          activeMonths.length
        : 0;

    // Coordenadas SVG (viewBox 540 x 138) con márgenes limpios para pulso horizontal
    const width = 540;
    const height = 138;
    const padLeft = 18;
    const padRight = 18;
    const padTop = 22;
    const padBottom = 16;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const stepX = points.length > 1 ? plotW / (points.length - 1) : plotW;

    const toY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

    const coords = points.map((pt, i) => ({
      ...pt,
      x: padLeft + i * stepX,
      yTotal: toY(pt.total),
      yPaid: toY(pt.paid),
    }));

    const totalPolyline = coords.map((c) => `${c.x},${c.yTotal}`).join(" ");
    const paidPolyline = coords.map((c) => `${c.x},${c.yPaid}`).join(" ");
    const baseY = padTop + plotH;
    const totalAreaPath =
      coords.length > 0
        ? `M ${coords[0].x},${baseY} ${coords.map((c) => `L ${c.x},${c.yTotal}`).join(" ")} L ${coords[coords.length - 1].x},${baseY} Z`
        : "";
    const paidAreaPath =
      coords.length > 0
        ? `M ${coords[0].x},${baseY} ${coords.map((c) => `L ${c.x},${c.yPaid}`).join(" ")} L ${coords[coords.length - 1].x},${baseY} Z`
        : "";

    return {
      coords,
      maxVal,
      avgTotal,
      width,
      height,
      padLeft,
      padRight,
      padTop,
      baseY,
      midY: padTop + plotH / 2,
      totalPolyline,
      paidPolyline,
      totalAreaPath,
      paidAreaPath,
    };
  }, [bills, clock.now, monthOffset]);

  const filteredTotalAmount = useMemo(
    () => filteredBills.reduce((sum, item) => sum + item.bill.amount, 0),
    [filteredBills],
  );

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            Pagos Recurrentes del Hogar
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Control mensual de vivienda, servicios, colegio y suscripciones
            sincronizados con tu calendario
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="border-border bg-card flex items-center gap-1 rounded-2xl border p-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonthOffset((m) => m - 1)}
              aria-label="Mes anterior"
              className="h-9 w-9"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-foreground min-w-36 text-center text-sm font-extrabold">
              {formatMonthYear(viewDate)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonthOffset((m) => m + 1)}
              aria-label="Mes siguiente"
              className="h-9 w-9"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setEditingBill(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nuevo pago
          </Button>
          <NotificationPopover />
        </div>
      </div>

      {/* Dashboards Ejecutivos: 1) Resumen del mes + 2) Tendencia en línea (estilo pulso) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Caja 1: Resumen consolidado del mes */}
        <section
          aria-label="Resumen financiero del mes"
          className="border-border bg-card flex flex-col justify-between rounded-3xl border p-5 shadow-2xs xl:col-span-5"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary-soft text-primary flex h-8 w-8 items-center justify-center rounded-xl">
                  <Wallet className="h-4 w-4" />
                </span>
                <h2 className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
                  Resumen del mes
                </h2>
              </div>

              {enrichedBills.length > 0 && totals.pendingCount === 0 && (
                <span className="border-success/30 bg-success-soft text-success inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Al día
                </span>
              )}
            </div>

            <div className="mt-3.5 flex items-end justify-between gap-3">
              <div>
                <span className="text-muted-foreground text-[11px] font-semibold">
                  Total programado
                </span>
                <p className="text-foreground text-3xl leading-tight font-extrabold tabular-nums">
                  {formatCurrency(totals.totalAmount)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-foreground text-sm font-extrabold tabular-nums">
                  {totals.pct}% cubierto
                </span>
                <p className="text-muted-foreground text-xs tabular-nums">
                  {totals.paidCount} de {enrichedBills.length} pagados
                </p>
              </div>
            </div>

            {/* Barra de progreso neutra: se pinta solo en verde conforme se pagan recibos */}
            <div
              className="border-border/70 bg-muted mt-3 h-2.5 w-full overflow-hidden rounded-full border"
              role="progressbar"
              aria-valuenow={totals.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Porcentaje pagado del mes"
            >
              {totals.pct > 0 && (
                <div
                  className="bg-success h-full rounded-full transition-all duration-300"
                  style={{ width: `${totals.pct}%` }}
                />
              )}
            </div>
          </div>

          {/* Sub-métricas integradas sin tarjetas sueltas */}
          <div className="border-border/80 bg-surface/65 divide-border mt-4 grid grid-cols-3 divide-x rounded-2xl border py-3">
            <button
              type="button"
              onClick={() => setFilter(filter === "paid" ? "all" : "paid")}
              className="hover:bg-card/60 cursor-pointer rounded-l-xl px-3 py-0.5 text-left transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold">
                <span className="bg-success h-2 w-2 shrink-0 rounded-full" />
                Pagado
              </span>
              <p className="text-success mt-1 truncate text-sm font-extrabold tabular-nums sm:text-base">
                {formatCurrency(totals.paidAmount)}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(filter === "pending" ? "all" : "pending")
              }
              className="hover:bg-card/60 cursor-pointer px-3 py-0.5 text-left transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold">
                <span className="bg-primary h-2 w-2 shrink-0 rounded-full" />
                Pendientes
              </span>
              <p className="text-foreground mt-1 truncate text-sm font-extrabold tabular-nums sm:text-base">
                {formatCurrency(totals.pendingAmount)}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setFilter(filter === "pending" ? "all" : "pending")
              }
              className="hover:bg-card/60 cursor-pointer rounded-r-xl px-3 py-0.5 text-left transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-bold">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    totals.overdueStrictCount > 0
                      ? "bg-danger"
                      : "bg-muted-foreground/50",
                  )}
                />
                Vencidos
              </span>
              <p
                className={cn(
                  "mt-1 text-sm font-extrabold tabular-nums sm:text-base",
                  totals.overdueStrictCount > 0
                    ? "text-danger"
                    : "text-foreground",
                )}
              >
                {totals.overdueStrictCount}
              </p>
            </button>
          </div>
        </section>

        {/* Caja 2: Tendencia de pagos con líneas continuas (estilo monitor / pulso) */}
        <section
          aria-label="Tendencia de pagos en línea"
          className="border-border bg-card flex flex-col justify-between rounded-3xl border p-5 shadow-2xs xl:col-span-7"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="bg-secondary-soft text-secondary flex h-8 w-8 items-center justify-center rounded-xl">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
                  Tendencia de pagos
                </h2>
              </div>
            </div>

            <div className="text-muted-foreground flex items-center gap-3 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-primary h-0.5 w-4 rounded-full" />
                Programado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="bg-success h-0.5 w-4 rounded-full" />
                Pagado
              </span>
            </div>
          </div>

          {/* Gráfico SVG de líneas tipo electrocardiograma / pulso financiero */}
          <div className="mt-3 w-full">
            <svg
              viewBox={`0 0 ${monthlyTrend.width} ${monthlyTrend.height}`}
              className="h-36 w-full overflow-visible"
              role="img"
              aria-label="Evolución de pagos programados y pagados centrada en el mes actual"
            >
              <defs>
                <linearGradient
                  id="bills-total-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--primary)"
                    stopOpacity="0.14"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--primary)"
                    stopOpacity="0"
                  />
                </linearGradient>
                <linearGradient
                  id="bills-paid-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--success)"
                    stopOpacity="0.18"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--success)"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Líneas guía horizontales */}
              {[monthlyTrend.padTop, monthlyTrend.midY, monthlyTrend.baseY].map(
                (yLine, idx) => (
                  <line
                    key={idx}
                    x1={monthlyTrend.padLeft}
                    y1={yLine}
                    x2={monthlyTrend.width - monthlyTrend.padRight}
                    y2={yLine}
                    stroke="var(--border)"
                    strokeWidth="1"
                    strokeDasharray={idx === 2 ? undefined : "4 4"}
                  />
                ),
              )}

              {/* Guías verticales sutiles por mes */}
              {monthlyTrend.coords.map((pt) => (
                <line
                  key={`v-${pt.offset}`}
                  x1={pt.x}
                  y1={monthlyTrend.padTop}
                  x2={pt.x}
                  y2={monthlyTrend.baseY}
                  stroke={pt.isSelected ? "var(--primary)" : "var(--border)"}
                  strokeOpacity={pt.isSelected ? 0.35 : 0.45}
                  strokeWidth={pt.isSelected ? 1.5 : 1}
                  strokeDasharray="3 3"
                />
              ))}

              {/* Áreas suaves bajo las líneas */}
              {monthlyTrend.totalAreaPath && (
                <path
                  d={monthlyTrend.totalAreaPath}
                  fill="url(#bills-total-grad)"
                />
              )}
              {monthlyTrend.paidAreaPath && (
                <path
                  d={monthlyTrend.paidAreaPath}
                  fill="url(#bills-paid-grad)"
                />
              )}

              {/* Línea de Total Programado */}
              <polyline
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={monthlyTrend.totalPolyline}
              />

              {/* Línea de Pagado */}
              <polyline
                fill="none"
                stroke="var(--success)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={monthlyTrend.paidPolyline}
              />

              {/* Nodos interactivos y etiquetas de monto */}
              {monthlyTrend.coords.map((pt) => (
                <g
                  key={pt.offset}
                  onClick={() => setMonthOffset(pt.offset)}
                  className="cursor-pointer"
                >
                  <title>{`${pt.fullLabel}: ${formatCurrency(pt.paid)} pagado de ${formatCurrency(pt.total)}`}</title>

                  {/* Etiqueta superior del total programado */}
                  <text
                    x={pt.x}
                    y={Math.max(12, pt.yTotal - 9)}
                    textAnchor="middle"
                    fill={
                      pt.isSelected
                        ? "var(--foreground)"
                        : "var(--muted-foreground)"
                    }
                    fontSize="10.5"
                    fontWeight={pt.isSelected ? "800" : "600"}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(pt.total, "PEN", true)}
                  </text>

                  {/* Halo del mes activo */}
                  {pt.isSelected && (
                    <circle
                      cx={pt.x}
                      cy={pt.yTotal}
                      r="8"
                      fill="var(--primary)"
                      fillOpacity="0.16"
                    />
                  )}

                  {/* Punto de Total Programado */}
                  <circle
                    cx={pt.x}
                    cy={pt.yTotal}
                    r={pt.isSelected ? 4.5 : 3.5}
                    fill="var(--card)"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                  />

                  {/* Punto de Pagado */}
                  <circle
                    cx={pt.x}
                    cy={pt.yPaid}
                    r={pt.isSelected ? 4.5 : 3.5}
                    fill="var(--card)"
                    stroke="var(--success)"
                    strokeWidth="2.5"
                  />
                </g>
              ))}
            </svg>

            {/* Eje horizontal interactivo de meses (mes activo al centro) */}
            <div className="mt-1 grid grid-cols-7 gap-1">
              {monthlyTrend.coords.map((pt) => (
                <button
                  key={pt.offset}
                  type="button"
                  onClick={() => setMonthOffset(pt.offset)}
                  className="flex cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1 transition-colors focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors",
                      pt.isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {pt.shortMonth}
                  </span>
                  <span className="text-success text-[10px] font-semibold tabular-nums">
                    {formatCurrency(pt.paid, "PEN", true)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
            <span>
              Promedio mensual:{" "}
              <strong className="text-foreground font-bold">
                {formatCurrency(monthlyTrend.avgTotal)}
              </strong>
            </span>
            <span>Toca un mes para inspeccionar su detalle</span>
          </div>
        </section>
      </div>

      {/* Filtros + Selector de vista (Lista a la izquierda de Tarjetas, Lista por defecto) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "Todos los pagos" },
              { id: "pending", label: "Falta pagar" },
              { id: "paid", label: "Pagados" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "min-h-9 cursor-pointer rounded-full border px-4 text-xs font-bold transition-all",
                filter === item.id
                  ? "border-primary/30 bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div
          role="group"
          aria-label="Cambiar vista de pagos"
          className="border-border bg-card inline-flex items-center gap-1 rounded-2xl border p-1 shadow-2xs"
        >
          <button
            type="button"
            onClick={() => setViewMode("list")}
            aria-pressed={viewMode === "list"}
            className={cn(
              "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
              viewMode === "list"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            aria-pressed={viewMode === "cards"}
            className={cn(
              "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
              viewMode === "cards"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Tarjetas</span>
          </button>
        </div>
      </div>

      {/* Lista o Tarjetas de Pagos */}
      {filteredBills.length === 0 ? (
        <div className="border-border bg-card rounded-3xl border border-dashed p-12 text-center">
          <CreditCard className="text-muted-foreground/50 mx-auto h-10 w-10" />
          <p className="text-foreground mt-3 text-base font-bold">
            No hay pagos en este filtro
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Agrega tus pagos recurrentes de casa, servicios o colegiatura para
            recibir recordatorios.
          </p>
        </div>
      ) : viewMode === "list" ? (
        <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-xs">
          {/* Encabezado compacto: Nombre de Servicio | Monto | Vencimiento | Estado | Acciones */}
          <div
            className={cn(
              "border-border bg-surface/70 text-muted-foreground hidden border-b px-5 py-2.5 text-[11px] font-extrabold tracking-wider uppercase lg:grid lg:items-center",
              BILL_LIST_GRID_COLS,
            )}
          >
            <span>Nombre de Servicio</span>
            <span className="pr-2 text-right">Monto</span>
            <span>Vencimiento</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>

          <div className="divide-border divide-y">
            {filteredBills.map(({ bill, dueDate, occKey, status }) => (
              <BillRow
                key={bill.id}
                bill={bill}
                dueDate={dueDate}
                status={status}
                onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
                onEdit={() => {
                  setEditingBill(bill);
                  setModalOpen(true);
                }}
                onDelete={() => deleteBill(bill.id)}
              />
            ))}
          </div>

          {/* Pie compacto alineado bajo Nombre de Servicio y Monto */}
          <div
            className={cn(
              "border-border bg-surface/45 text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-xs sm:px-5 lg:grid lg:items-center",
              BILL_LIST_GRID_COLS,
            )}
          >
            <span className="font-semibold">
              Mostrando {filteredBills.length}{" "}
              {filteredBills.length === 1 ? "pago" : "pagos"}
            </span>
            <span className="text-foreground font-extrabold tabular-nums lg:pr-2 lg:text-right">
              {formatCurrency(filteredTotalAmount)}
            </span>
            <span className="hidden lg:col-span-3 lg:block" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBills.map(({ bill, dueDate, occKey, status }) => (
            <BillCard
              key={bill.id}
              bill={bill}
              dueDate={dueDate}
              status={status}
              onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
              onEdit={() => {
                setEditingBill(bill);
                setModalOpen(true);
              }}
              onDelete={() => deleteBill(bill.id)}
            />
          ))}
        </div>
      )}

      <BillFormModal
        open={modalOpen}
        editingBill={editingBill}
        onClose={() => {
          setModalOpen(false);
          setEditingBill(null);
        }}
      />
    </div>
  );
}
