"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutGrid,
  List,
  PieChart,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
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
import type { BillKind, BillStatus, RecurringBill } from "@/types/bills";
import { BILL_LIST_GRID_COLS, BillCard, BillRow } from "./BillCard";
import { BillFormModal } from "./BillFormModal";

type BillFilter = "all" | "incomes" | "pending" | "paid";
type BillViewMode = "list" | "cards";
type ChartScope = "month" | "year";

const DONUT_EXPENSE_SLOTS = [
  { stroke: "var(--primary)", dotClass: "bg-primary" },
  { stroke: "var(--cat-1)", dotClass: "bg-cat-1" },
  { stroke: "var(--cat-5)", dotClass: "bg-cat-5" },
  { stroke: "var(--accent)", dotClass: "bg-accent" },
  { stroke: "var(--cat-6)", dotClass: "bg-cat-6" },
  { stroke: "var(--cat-7)", dotClass: "bg-cat-7" },
  { stroke: "var(--cat-bills)", dotClass: "bg-cat-bills" },
  { stroke: "var(--secondary)", dotClass: "bg-secondary" },
] as const;

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

  // No proyectar ni cobrar meses anteriores al mes en que se creó el registro
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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<BillViewMode>("list");
  const [chartScope, setChartScope] = useState<ChartScope>("month");
  const [hoveredSliceKey, setHoveredSliceKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDefaultKind, setModalDefaultKind] = useState<BillKind>("expense");
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const viewDate = useMemo(
    () => addMonths(clock.now, monthOffset),
    [clock.now, monthOffset],
  );
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const viewMonthKey = toMonthKey(viewDate);

  const openNewModal = (kind: BillKind) => {
    setEditingBill(null);
    setModalDefaultKind(kind);
    setModalOpen(true);
  };

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
        return {
          bill,
          isIncome: bill.kind === "income",
          dueDate,
          occKey,
          status,
        };
      })
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, viewYear, viewMonth, viewMonthKey, clock.todayKey]);

  const filteredBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedBills.filter((entry) => {
      if (filter === "incomes" && !entry.isIncome) return false;
      if (filter === "paid" && (entry.isIncome || entry.status !== "paid")) {
        return false;
      }
      if (filter === "pending" && (entry.isIncome || entry.status === "paid")) {
        return false;
      }
      if (!q) return true;
      return (
        entry.bill.name.toLowerCase().includes(q) ||
        (entry.bill.provider?.toLowerCase().includes(q) ?? false) ||
        (entry.bill.notes?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [enrichedBills, filter, searchQuery]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let paidExpense = 0;
    let pendingExpense = 0;
    let expenseCount = 0;
    let pendingExpenseCount = 0;
    let overdueStrictCount = 0;

    for (const item of enrichedBills) {
      if (item.isIncome) {
        totalIncome += item.bill.amount;
      } else {
        expenseCount += 1;
        totalExpense += item.bill.amount;
        if (item.status === "paid") {
          paidExpense += item.bill.amount;
        } else {
          pendingExpense += item.bill.amount;
          pendingExpenseCount += 1;
          if (item.status === "overdue") {
            overdueStrictCount += 1;
          }
        }
      }
    }

    const paidPct =
      totalExpense > 0 ? Math.round((paidExpense / totalExpense) * 100) : 0;
    const egressPct =
      totalIncome > 0
        ? Math.min(100, Math.round((paidExpense / totalIncome) * 100))
        : paidPct;
    const realBalance = totalIncome - paidExpense;
    const committedPct =
      totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense,
      paidExpense,
      pendingExpense,
      expenseCount,
      pendingExpenseCount,
      overdueStrictCount,
      paidPct,
      egressPct,
      realBalance,
      committedPct,
    };
  }, [enrichedBills]);

  /** Gráfica de Dona (Mes actual): distribución por servicio principal + saldo libre */
  const donutData = useMemo(() => {
    const expenses = enrichedBills
      .filter((e) => !e.isIncome)
      .sort((a, b) => b.bill.amount - a.bill.amount);

    const baseTotal = Math.max(totals.totalIncome, totals.totalExpense);
    if (baseTotal <= 0) {
      return { slices: [], baseTotal: 0, circumference: 2 * Math.PI * 54 };
    }

    const rawSlices: Array<{
      key: string;
      label: string;
      amount: number;
      pct: number;
      stroke: string;
      dotClass: string;
      isFree?: boolean;
    }> = [];

    expenses.forEach((entry, idx) => {
      const slot = DONUT_EXPENSE_SLOTS[idx % DONUT_EXPENSE_SLOTS.length];
      rawSlices.push({
        key: entry.bill.id,
        label: entry.bill.name,
        amount: entry.bill.amount,
        pct: Math.round((entry.bill.amount / baseTotal) * 100),
        stroke: slot.stroke,
        dotClass: slot.dotClass,
      });
    });

    if (totals.totalIncome > totals.totalExpense) {
      const freeAmt = totals.totalIncome - totals.totalExpense;
      rawSlices.push({
        key: "__free__",
        label: "Saldo libre",
        amount: freeAmt,
        pct: Math.max(1, Math.round((freeAmt / baseTotal) * 100)),
        stroke: "var(--success)",
        dotClass: "bg-success",
        isFree: true,
      });
    }

    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    const slices = rawSlices.map((s) => {
      const fraction = s.amount / baseTotal;
      const dashLength = fraction * circumference;
      const dashOffset = -offsetAcc;
      offsetAcc += dashLength;
      return {
        ...s,
        dashLength,
        dashOffset,
      };
    });

    return { slices, baseTotal, circumference };
  }, [enrichedBills, totals.totalIncome, totals.totalExpense]);

  /** Gráfica Comparativa Mensual (Año): 2 líneas limpias (Ingresos vs Gastos) */
  const yearlyChart = useMemo(() => {
    const offsets = [-3, -2, -1, 0, 1, 2, 3];
    const points = offsets.map((rel) => {
      const targetOffset = monthOffset + rel;
      const d = addMonths(clock.now, targetOffset);
      const y = d.getFullYear();
      const m = d.getMonth();
      const mKey = toMonthKey(d);

      let income = 0;
      let expense = 0;

      for (const bill of bills) {
        if (!doesBillApplyToMonth(bill, y, m)) continue;
        if (bill.kind === "income") {
          income += bill.amount;
        } else {
          const dueDate = clampDayOfMonth(y, m, bill.dueDay);
          const occKey =
            bill.frequency === "monthly" ||
            bill.frequency === "quarterly" ||
            bill.frequency === "yearly"
              ? mKey
              : getBillOccurrenceKey(bill, dueDate);
          if (bill.paidOccurrences.includes(occKey)) {
            expense += bill.amount;
          }
        }
      }

      return {
        key: `m-${targetOffset}`,
        offset: targetOffset,
        label: getMonthName(m).slice(0, 3),
        fullLabel: formatMonthYear(d),
        isSelected: rel === 0,
        income,
        expense,
      };
    });

    const hasAnyIncome = points.some((p) => p.income > 0);
    const maxVal = Math.max(
      ...points.map((p) => Math.max(p.income, p.expense)),
      1,
    );

    const activeMonths = points.filter((p) => p.expense > 0 || p.income > 0);
    const avgExpense =
      activeMonths.length > 0
        ? activeMonths.reduce((acc, p) => acc + p.expense, 0) /
          activeMonths.length
        : 0;

    const width = 540;
    const height = 136;
    const padLeft = 24;
    const padRight = 24;
    const padTop = 22;
    const padBottom = 14;
    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;
    const stepX = points.length > 1 ? plotW / (points.length - 1) : plotW;
    const toY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

    const coords = points.map((pt, i) => ({
      ...pt,
      x: padLeft + i * stepX,
      yIncome: toY(pt.income),
      yExpense: toY(pt.expense),
    }));

    const baseY = padTop + plotH;
    const incomePolyline = coords.map((c) => `${c.x},${c.yIncome}`).join(" ");
    const expensePolyline = coords.map((c) => `${c.x},${c.yExpense}`).join(" ");
    const incomeAreaPath =
      coords.length > 0 && hasAnyIncome
        ? `M ${coords[0].x},${baseY} ${coords.map((c) => `L ${c.x},${c.yIncome}`).join(" ")} L ${coords[coords.length - 1].x},${baseY} Z`
        : "";
    const expenseAreaPath =
      coords.length > 0
        ? `M ${coords[0].x},${baseY} ${coords.map((c) => `L ${c.x},${c.yExpense}`).join(" ")} L ${coords[coords.length - 1].x},${baseY} Z`
        : "";

    return {
      coords,
      hasAnyIncome,
      avgExpense,
      width,
      height,
      padLeft,
      padRight,
      padTop,
      baseY,
      midY: padTop + plotH / 2,
      incomePolyline,
      expensePolyline,
      incomeAreaPath,
      expenseAreaPath,
    };
  }, [bills, clock.now, monthOffset]);

  const activeDonutSlice = useMemo(
    () => donutData.slices.find((s) => s.key === hoveredSliceKey) ?? null,
    [donutData.slices, hoveredSliceKey],
  );

  const filteredSummary = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const item of filteredBills) {
      if (item.isIncome) inc += item.bill.amount;
      else exp += item.bill.amount;
    }
    return { inc, exp, net: inc - exp };
  }, [filteredBills]);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
            Finanzas y Pagos del Hogar
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            variant="secondary"
            size="md"
            onClick={() => openNewModal("income")}
            className="border-success/35 bg-success-soft text-success hover:bg-success hover:text-primary-foreground"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Ingreso
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => openNewModal("expense")}
          >
            <Plus className="h-4 w-4" />
            Nuevo pago
          </Button>
          <NotificationPopover />
        </div>
      </div>

      {/* Dashboards Ejecutivos: 1) Balance del mes + 2) Dona del mes / Comparativo anual */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Caja 1: Balance consolidado del mes */}
        <section
          aria-label="Balance financiero del mes"
          className="border-border bg-card flex flex-col justify-between rounded-3xl border p-5 shadow-2xs xl:col-span-5"
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary-soft text-primary flex h-8 w-8 items-center justify-center rounded-xl">
                  <Wallet className="h-4 w-4" />
                </span>
                <h2 className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
                  Balance del mes
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                {totals.overdueStrictCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilter(filter === "pending" ? "all" : "pending")
                    }
                    className="border-danger/30 bg-danger-soft text-danger inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums transition-opacity hover:opacity-85"
                  >
                    {totals.overdueStrictCount}{" "}
                    {totals.overdueStrictCount === 1 ? "vencido" : "vencidos"}
                  </button>
                )}

                {totals.totalIncome > 0 &&
                totals.pendingExpenseCount === 0 &&
                totals.expenseCount > 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums",
                      totals.realBalance >= 0
                        ? "border-success/30 bg-success-soft text-success"
                        : "border-danger/30 bg-danger-soft text-danger",
                    )}
                  >
                    {totals.realBalance >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    Mes cerrado
                  </span>
                ) : (
                  totals.expenseCount > 0 &&
                  totals.pendingExpenseCount === 0 && (
                    <span className="border-success/30 bg-success-soft text-success inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Al día
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Saldo real = Ingreso − Egreso (pagado) */}
            <div className="mt-4">
              <span className="text-muted-foreground text-xs font-semibold sm:text-sm">
                {totals.totalIncome > 0
                  ? "Saldo actual (Ingreso − Egreso)"
                  : "Egresos del mes"}
              </span>
              <p
                className={cn(
                  "mt-0.5 text-3xl leading-tight font-extrabold tabular-nums sm:text-4xl",
                  totals.totalIncome > 0
                    ? totals.realBalance >= 0
                      ? "text-success"
                      : "text-danger"
                    : "text-foreground",
                )}
              >
                {totals.totalIncome > 0
                  ? `${totals.realBalance > 0 ? "+" : ""}${formatCurrency(totals.realBalance)}`
                  : formatCurrency(totals.paidExpense)}
              </p>
            </div>

            {/* Barra visual de Egresos sobre fondo neutro */}
            <div
              className="border-border/70 bg-muted mt-3.5 h-2.5 w-full overflow-hidden rounded-full border"
              role="progressbar"
              aria-valuenow={totals.egressPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Proporción de egresos pagados"
            >
              {totals.egressPct > 0 && (
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${totals.egressPct}%` }}
                />
              )}
            </div>
          </div>

          {/* 2 bloques limpios y amplios: Ingresos | Egresos (pagados) */}
          <div className="border-border/80 bg-surface/65 divide-border mt-5 grid grid-cols-2 divide-x rounded-2xl border py-3.5">
            <button
              type="button"
              onClick={() =>
                totals.totalIncome > 0
                  ? setFilter(filter === "incomes" ? "all" : "incomes")
                  : openNewModal("income")
              }
              className="hover:bg-card/60 cursor-pointer rounded-l-xl px-4 py-0.5 text-left transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-2 text-xs font-bold sm:text-sm">
                <span className="bg-success h-2.5 w-2.5 shrink-0 rounded-full" />
                Ingresos
              </span>
              <p className="text-success mt-1.5 truncate text-lg font-extrabold tabular-nums sm:text-xl">
                {formatCurrency(totals.totalIncome)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setFilter(filter === "paid" ? "all" : "paid")}
              className="hover:bg-card/60 cursor-pointer rounded-r-xl px-4 py-0.5 text-left transition-colors"
            >
              <span className="text-muted-foreground flex items-center gap-2 text-xs font-bold sm:text-sm">
                <span className="bg-primary h-2.5 w-2.5 shrink-0 rounded-full" />
                Egresos
                <span className="text-muted-foreground/75 text-[11px] font-semibold">
                  (pagados)
                </span>
              </span>
              <p className="text-primary mt-1.5 truncate text-lg font-extrabold tabular-nums sm:text-xl">
                {formatCurrency(totals.paidExpense)}
              </p>
            </button>
          </div>
        </section>

        {/* Caja 2: Distribución del mes (Dona por defecto) / Comparativo anual (Ingresos vs Gastos) */}
        <section
          aria-label="Distribución de gastos y comparativo anual"
          className="border-border bg-card flex flex-col rounded-3xl border p-5 shadow-2xs xl:col-span-7"
        >
          <div className="border-border/75 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <span className="bg-secondary-soft text-secondary flex h-8 w-8 items-center justify-center rounded-xl">
                {chartScope === "month" ? (
                  <PieChart className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </span>
              <h2 className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
                {chartScope === "month"
                  ? "Egreso Proyectado del Mes"
                  : "Ingresos Vs Egresos"}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {chartScope === "year" && (
                <div className="text-muted-foreground flex items-center gap-3 text-[11px] font-semibold">
                  <span className="text-success inline-flex items-center gap-1.5 font-bold">
                    <span className="bg-success h-1 w-4 rounded-full" />
                    Ingresos
                  </span>
                  <span className="text-primary inline-flex items-center gap-1.5 font-bold">
                    <span className="bg-primary h-1 w-4 rounded-full" />
                    Egresos
                  </span>
                </div>
              )}

              <div
                role="group"
                aria-label="Cambiar vista del gráfico financiero"
                className="border-border bg-surface inline-flex items-center rounded-xl border p-0.5"
              >
                <button
                  type="button"
                  onClick={() => setChartScope("month")}
                  aria-pressed={chartScope === "month"}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                    chartScope === "month"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Mes
                </button>
                <button
                  type="button"
                  onClick={() => setChartScope("year")}
                  aria-pressed={chartScope === "year"}
                  className={cn(
                    "cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                    chartScope === "year"
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Año
                </button>
              </div>
            </div>
          </div>

          {chartScope === "month" ? (
            donutData.slices.length === 0 ? (
              <div className="bg-surface/50 my-auto mt-4 rounded-2xl p-8 text-center">
                <p className="text-muted-foreground text-xs font-medium">
                  Registra tus ingresos o pagos de {formatMonthYear(viewDate)}{" "}
                  para ver cómo se distribuye tu dinero.
                </p>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center gap-5 pt-4 sm:flex-row sm:items-center">
                {/* Dona SVG interactiva */}
                <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                  <svg
                    viewBox="0 0 148 148"
                    className="h-36 w-36 -rotate-90"
                    role="img"
                    aria-label={`Distribución de gastos e ingresos en ${formatMonthYear(viewDate)}`}
                  >
                    <circle
                      cx="74"
                      cy="74"
                      r="54"
                      fill="none"
                      stroke="var(--muted)"
                      strokeWidth="18"
                    />
                    {donutData.slices.map((s) => {
                      const isDimmed =
                        hoveredSliceKey !== null && hoveredSliceKey !== s.key;
                      return (
                        <circle
                          key={s.key}
                          cx="74"
                          cy="74"
                          r="54"
                          fill="none"
                          stroke={s.stroke}
                          strokeWidth={hoveredSliceKey === s.key ? 21 : 18}
                          strokeDasharray={`${Math.max(0, s.dashLength - 1.5)} ${donutData.circumference}`}
                          strokeDashoffset={s.dashOffset}
                          className="cursor-pointer transition-all duration-200"
                          style={{ opacity: isDimmed ? 0.35 : 1 }}
                          onMouseEnter={() => setHoveredSliceKey(s.key)}
                          onMouseLeave={() => setHoveredSliceKey(null)}
                        >
                          <title>{`${s.label}: ${formatCurrency(s.amount)} (${s.pct}%)`}</title>
                        </circle>
                      );
                    })}
                  </svg>

                  {/* Centro de la Dona: monto de egreso proyectado sin descripción */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
                    {activeDonutSlice ? (
                      <>
                        <span className="text-foreground text-sm leading-none font-extrabold tabular-nums">
                          {formatCurrency(activeDonutSlice.amount, "PEN", true)}
                        </span>
                        <span className="text-muted-foreground mt-1 max-w-22 truncate text-[10px] font-bold">
                          {activeDonutSlice.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-foreground text-base leading-none font-extrabold tabular-nums">
                        {formatCurrency(totals.totalExpense, "PEN", true)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Desglose completo en columnas compactas con líneas divisoras */}
                <div className="sm:border-border/70 flex w-full min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4 sm:border-l sm:pl-4">
                  {(donutData.slices.length > 4
                    ? [
                        donutData.slices.slice(
                          0,
                          Math.ceil(donutData.slices.length / 2),
                        ),
                        donutData.slices.slice(
                          Math.ceil(donutData.slices.length / 2),
                        ),
                      ]
                    : [donutData.slices]
                  ).map((colSlices, colIdx) => (
                    <div
                      key={colIdx}
                      className={cn(
                        "flex min-w-0 flex-1 flex-col gap-1",
                        colIdx > 0 &&
                          "border-border/70 border-t pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4",
                      )}
                    >
                      {colSlices.map((s) => (
                        <div
                          key={s.key}
                          onMouseEnter={() => setHoveredSliceKey(s.key)}
                          onMouseLeave={() => setHoveredSliceKey(null)}
                          className={cn(
                            "flex w-full max-w-52 items-center justify-between gap-3 rounded-xl px-2 py-1 text-xs transition-colors",
                            hoveredSliceKey === s.key && "bg-surface/90",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                s.dotClass,
                              )}
                            />
                            <span
                              className={cn(
                                "truncate font-bold",
                                s.isFree ? "text-success" : "text-foreground",
                              )}
                            >
                              {s.label}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "shrink-0 font-extrabold tabular-nums",
                              s.isFree ? "text-success" : "text-foreground",
                            )}
                          >
                            {formatCurrency(s.amount, "PEN", true)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            /* Vista Año: Comparativo mensual de 2 líneas limpias (Ingresos vs Gastos) */
            <div className="mt-3 w-full">
              <svg
                viewBox={`0 0 ${yearlyChart.width} ${yearlyChart.height}`}
                className="h-36 w-full overflow-visible"
                role="img"
                aria-label="Comparativo mensual de ingresos frente a egresos"
              >
                <defs>
                  <linearGradient
                    id="bills-year-income"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--success)"
                      stopOpacity="0.2"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--success)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                  <linearGradient
                    id="bills-year-expense"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--primary)"
                      stopOpacity="0.16"
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--primary)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>

                {[yearlyChart.padTop, yearlyChart.midY, yearlyChart.baseY].map(
                  (yLine, idx) => (
                    <line
                      key={idx}
                      x1={yearlyChart.padLeft}
                      y1={yLine}
                      x2={yearlyChart.width - yearlyChart.padRight}
                      y2={yLine}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray={idx === 2 ? undefined : "4 4"}
                    />
                  ),
                )}

                {yearlyChart.coords.map((pt) => (
                  <line
                    key={`v-${pt.key}`}
                    x1={pt.x}
                    y1={yearlyChart.padTop}
                    x2={pt.x}
                    y2={yearlyChart.baseY}
                    stroke={pt.isSelected ? "var(--primary)" : "var(--border)"}
                    strokeOpacity={pt.isSelected ? 0.35 : 0.45}
                    strokeWidth={pt.isSelected ? 1.5 : 1}
                    strokeDasharray="3 3"
                  />
                ))}

                {yearlyChart.incomeAreaPath && (
                  <path
                    d={yearlyChart.incomeAreaPath}
                    fill="url(#bills-year-income)"
                  />
                )}
                {yearlyChart.expenseAreaPath && (
                  <path
                    d={yearlyChart.expenseAreaPath}
                    fill="url(#bills-year-expense)"
                  />
                )}

                {yearlyChart.hasAnyIncome && (
                  <polyline
                    fill="none"
                    stroke="var(--success)"
                    strokeWidth="2.75"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={yearlyChart.incomePolyline}
                  />
                )}

                <polyline
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="2.75"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={yearlyChart.expensePolyline}
                />

                {yearlyChart.coords.map((pt) => {
                  const topVal = Math.max(pt.income, pt.expense);
                  const topY = Math.min(pt.yIncome, pt.yExpense);
                  return (
                    <g
                      key={pt.key}
                      onClick={() => setMonthOffset(pt.offset)}
                      className="cursor-pointer"
                    >
                      <title>{`${pt.fullLabel}: Ingresos ${formatCurrency(pt.income)} · Egresos ${formatCurrency(pt.expense)}`}</title>

                      {topVal > 0 && (
                        <text
                          x={pt.x}
                          y={Math.max(12, topY - 8)}
                          textAnchor="middle"
                          fill={
                            pt.income >= pt.expense && pt.income > 0
                              ? "var(--success)"
                              : "var(--muted-foreground)"
                          }
                          fontSize="10"
                          fontWeight={pt.isSelected ? "800" : "600"}
                          style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                          {formatCurrency(topVal, "PEN", true)}
                        </text>
                      )}

                      {yearlyChart.hasAnyIncome && (
                        <circle
                          cx={pt.x}
                          cy={pt.yIncome}
                          r={pt.isSelected ? 4.5 : 3.5}
                          fill={
                            pt.isSelected ? "var(--success)" : "var(--card)"
                          }
                          stroke={
                            pt.isSelected ? "var(--card)" : "var(--success)"
                          }
                          strokeWidth="2.2"
                        />
                      )}

                      <circle
                        cx={pt.x}
                        cy={pt.yExpense}
                        r={pt.isSelected ? 4.5 : 3.5}
                        fill={pt.isSelected ? "var(--primary)" : "var(--card)"}
                        stroke={
                          pt.isSelected ? "var(--card)" : "var(--primary)"
                        }
                        strokeWidth="2.2"
                      />
                    </g>
                  );
                })}
              </svg>

              <div className="mt-1 grid grid-cols-7 gap-1">
                {yearlyChart.coords.map((pt) => (
                  <button
                    key={pt.key}
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
                      {pt.label}
                    </span>
                    <span className="text-primary text-[10px] font-semibold tabular-nums">
                      {formatCurrency(pt.expense, "PEN", true)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chartScope === "year" && (
            <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums">
              <span>
                Egreso promedio mensual:{" "}
                <strong className="text-foreground font-bold">
                  {formatCurrency(yearlyChart.avgExpense)}
                </strong>
              </span>
              <span>Toca un mes para ver su detalle</span>
            </div>
          )}
        </section>
      </div>

      {/* Filtros + Selector de vista (Lista a la izquierda de Tarjetas, Lista por defecto) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "all", label: "Todos" },
              { id: "incomes", label: "Ingresos" },
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
                  ? item.id === "incomes"
                    ? "border-success/30 bg-success text-primary-foreground shadow-2xs"
                    : "border-primary/30 bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pago o ingreso..."
              aria-label="Buscar pagos o ingresos por nombre"
              className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/25 h-9 w-full rounded-2xl border pr-8 pl-8 text-xs font-medium shadow-2xs transition-all focus:ring-2 focus:outline-none sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpiar búsqueda"
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Cambiar vista de movimientos"
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
      </div>

      {/* Lista o Tarjetas de Movimientos */}
      {filteredBills.length === 0 ? (
        <div className="border-border bg-card rounded-3xl border border-dashed p-12 text-center">
          <CreditCard className="text-muted-foreground/50 mx-auto h-10 w-10" />
          <p className="text-foreground mt-3 text-base font-bold">
            {filter === "incomes"
              ? "Aún no tienes ingresos registrados este mes"
              : "No hay movimientos en este filtro"}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            {filter === "incomes"
              ? "Agrega tu sueldo, honorarios o ingresos extra para visualizar tu balance proyectado."
              : "Agrega tus pagos recurrentes de casa, servicios o colegiatura para recibir recordatorios."}
          </p>
          {filter === "incomes" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openNewModal("income")}
              className="mt-4"
            >
              <Plus className="h-4 w-4" />
              Registrar primer ingreso
            </Button>
          )}
        </div>
      ) : viewMode === "list" ? (
        <div className="border-border bg-card overflow-hidden rounded-3xl border shadow-xs">
          {/* Encabezado compacto: Nombre de Servicio | Monto | Fecha | Estado | Link | Acciones */}
          <div
            className={cn(
              "border-border bg-surface/70 text-muted-foreground hidden border-b px-5 py-2.5 text-[11px] font-extrabold tracking-wider uppercase lg:grid lg:items-center",
              BILL_LIST_GRID_COLS,
            )}
          >
            <span>Nombre de Servicio</span>
            <span className="pr-5 text-right">Monto</span>
            <span>Fecha de Vencimiento</span>
            <span>Estado</span>
            <span>Link</span>
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
                  setModalDefaultKind(bill.kind ?? "expense");
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
              {filteredBills.length === 1 ? "registro" : "registros"}
            </span>
            <span
              className={cn(
                "font-extrabold whitespace-nowrap tabular-nums lg:pr-5 lg:text-right",
                filter === "incomes"
                  ? "text-success"
                  : filteredSummary.inc > 0 && filteredSummary.exp > 0
                    ? filteredSummary.net >= 0
                      ? "text-success"
                      : "text-danger"
                    : "text-foreground",
              )}
            >
              {filter === "incomes"
                ? `+${formatCurrency(filteredSummary.inc)}`
                : filteredSummary.inc > 0 && filteredSummary.exp > 0
                  ? `${filteredSummary.net > 0 ? "+" : ""}${formatCurrency(filteredSummary.net)}`
                  : formatCurrency(filteredSummary.exp)}
            </span>
            <span className="text-muted-foreground hidden text-[11px] font-semibold lg:col-span-4 lg:block">
              {filteredSummary.inc > 0 && filteredSummary.exp > 0
                ? `Balance proyectado (Ingresos ${formatCurrency(filteredSummary.inc)} − Gastos ${formatCurrency(filteredSummary.exp)})`
                : ""}
            </span>
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
                setModalDefaultKind(bill.kind ?? "expense");
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
        defaultKind={modalDefaultKind}
        onClose={() => {
          setModalOpen(false);
          setEditingBill(null);
        }}
      />
    </div>
  );
}
