"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  LayoutGrid,
  Plus,
  Search,
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
  parseDateKey,
  toMonthKey,
} from "@/lib/dates";
import { getBillOccurrenceKey, getBillStatus } from "@/lib/recurrence";
import type { BillKind, BillStatus, RecurringBill } from "@/types/bills";
import { BillCard, BillStatementRow } from "./BillCard";
import { BillFormModal } from "./BillFormModal";

type BillViewMode = "statement" | "cards";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<BillViewMode>("statement");
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

  const handleEditBill = (bill: RecurringBill) => {
    setEditingBill(bill);
    setModalDefaultKind(bill.kind ?? "expense");
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

  const searchedBills = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return enrichedBills;
    return enrichedBills.filter(
      (entry) =>
        entry.bill.name.toLowerCase().includes(q) ||
        (entry.bill.provider?.toLowerCase().includes(q) ?? false) ||
        (entry.bill.notes?.toLowerCase().includes(q) ?? false),
    );
  }, [enrichedBills, searchQuery]);

  /** 2 columnas estables: Ingresos | Egresos (los servicios no cambian de columna al pagar) */
  const statementGroups = useMemo(() => {
    const incomes = searchedBills.filter((e) => e.isIncome);
    const expenses = searchedBills.filter((e) => !e.isIncome);

    const incomesSum = incomes.reduce((acc, e) => acc + e.bill.amount, 0);
    const expensesSum = expenses.reduce((acc, e) => acc + e.bill.amount, 0);

    return {
      incomes,
      expenses,
      incomesSum,
      expensesSum,
    };
  }, [searchedBills]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let paidExpense = 0;
    let pendingExpense = 0;
    let expenseCount = 0;
    let paidCount = 0;

    for (const item of enrichedBills) {
      if (item.isIncome) {
        totalIncome += item.bill.amount;
      } else {
        expenseCount += 1;
        totalExpense += item.bill.amount;
        if (item.status === "paid") {
          paidExpense += item.bill.amount;
          paidCount += 1;
        } else {
          pendingExpense += item.bill.amount;
        }
      }
    }

    const paidPct =
      totalExpense > 0 ? Math.round((paidExpense / totalExpense) * 100) : 0;
    const realBalance = totalIncome - paidExpense;

    return {
      totalIncome,
      totalExpense,
      paidExpense,
      pendingExpense,
      expenseCount,
      paidCount,
      paidPct,
      realBalance,
    };
  }, [enrichedBills]);

  return (
    <div className="space-y-5">
      {/* Encabezado principal con filtro de mes centrado */}
      <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
        <h1 className="text-foreground text-2xl font-extrabold tracking-tight sm:text-3xl">
          Finanzas y Pagos del Hogar
        </h1>

        <div className="border-border bg-card flex w-fit items-center gap-1 rounded-2xl border p-1 lg:justify-self-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMonthOffset((m) => m - 1)}
            aria-label="Mes anterior"
            className="h-9 w-9"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            onClick={() => setMonthOffset(0)}
            title={monthOffset !== 0 ? "Volver al mes actual" : undefined}
            className={cn(
              "min-w-36 text-center text-sm font-extrabold whitespace-nowrap tabular-nums transition-colors",
              monthOffset !== 0
                ? "text-primary cursor-pointer hover:underline"
                : "text-foreground cursor-default",
            )}
          >
            {formatMonthYear(viewDate)}
          </button>
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

        <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
          <Button
            variant="secondary"
            size="md"
            onClick={() => openNewModal("income")}
            className="border-success/35 bg-success-soft text-success hover:bg-success hover:text-primary-foreground"
          >
            <ArrowDownLeft className="h-4 w-4" />
            Nuevo Ingreso
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

      {/* 2 Tarjetas Ejecutivas Simétricas y Minimalistas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Tarjeta 1: Mi Saldo actual es: */}
        <section
          aria-label="Mi Saldo actual"
          className="border-border bg-card flex flex-col rounded-3xl border p-5 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <span className="bg-primary-soft text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
              <Wallet className="h-4 w-4" />
            </span>
            <h2 className="text-foreground text-sm leading-tight font-extrabold sm:text-base">
              Mi Saldo actual es:
            </h2>
          </div>

          <div className="flex flex-1 items-center pt-3 pb-1">
            <p
              className={cn(
                "text-3xl leading-tight font-extrabold tabular-nums sm:text-4xl",
                totals.totalIncome > 0
                  ? totals.realBalance >= 0
                    ? "text-success"
                    : "text-danger"
                  : "text-foreground",
              )}
            >
              {totals.totalIncome > 0
                ? `${totals.realBalance > 0 ? "+" : ""}${formatCurrency(totals.realBalance)}`
                : formatCurrency(-totals.paidExpense)}
            </p>
          </div>
        </section>

        {/* Tarjeta 2: Mi deuda pagada es: */}
        <section
          aria-label="Mi deuda pagada"
          className="border-border bg-card flex flex-col justify-between rounded-3xl border p-5 shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="bg-secondary-soft text-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <h2 className="text-foreground text-sm leading-tight font-extrabold sm:text-base">
                Mi deuda pagada es:
              </h2>
            </div>

            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-extrabold tabular-nums",
                totals.paidPct === 100 && totals.expenseCount > 0
                  ? "bg-success-soft text-success"
                  : "bg-primary-soft text-primary",
              )}
            >
              {totals.paidPct}% pagado
            </span>
          </div>

          <div className="mt-5">
            <div className="mb-2.5 flex items-end justify-between gap-3 tabular-nums">
              <div>
                <span className="text-muted-foreground block text-xs font-bold">
                  Pagado
                </span>
                <p className="text-success mt-0.5 text-2xl leading-none font-extrabold sm:text-3xl">
                  {formatCurrency(totals.paidExpense)}
                </p>
              </div>

              <div className="text-right">
                <span className="text-muted-foreground block text-xs font-bold">
                  Deuda total
                </span>
                <p className="text-foreground mt-0.5 text-2xl leading-none font-extrabold sm:text-3xl">
                  {formatCurrency(totals.totalExpense)}
                </p>
              </div>
            </div>

            <div
              className="border-border/70 bg-muted h-4 w-full overflow-hidden rounded-full border p-0.5"
              role="progressbar"
              aria-valuenow={totals.paidPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso de pagos sobre la deuda total"
            >
              {totals.paidPct > 0 && (
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    totals.paidPct === 100 ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${totals.paidPct}%` }}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Barra limpia: Título + Buscador + Selector de vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-foreground text-base font-extrabold sm:text-lg">
          Estado Financiero · {formatMonthYear(viewDate)}
        </h2>

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
              placeholder="Buscar servicio o ingreso..."
              aria-label="Buscar servicio o ingreso"
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
              onClick={() => setViewMode("statement")}
              aria-pressed={viewMode === "statement"}
              className={cn(
                "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
                viewMode === "statement"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Estado de cuenta</span>
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

      {viewMode === "statement" ? (
        /* 2 Columnas Simétricas 50/50 alineadas con las 2 tarjetas superiores: Ingresos | Egresos */
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {/* Columna 1: Ingresos */}
          <section
            aria-label="Columna de Ingresos"
            className="border-border bg-card flex flex-col overflow-hidden rounded-3xl border shadow-xs"
          >
            <div className="border-border bg-success-soft/25 flex items-center justify-between gap-3 border-b px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="bg-success-soft text-success flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                  <ArrowDownLeft className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-sm font-extrabold sm:text-base">
                    Ingresos
                  </h3>
                  <span className="bg-success text-primary-foreground rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums">
                    {statementGroups.incomes.length}
                  </span>
                </div>
              </div>

              <p className="text-success text-base font-extrabold tabular-nums sm:text-lg">
                +{formatCurrency(statementGroups.incomesSum)}
              </p>
            </div>

            {statementGroups.incomes.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-muted-foreground text-sm font-semibold">
                  Sin ingresos registrados
                </p>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => openNewModal("income")}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4" />
                  Agregar ingreso
                </Button>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {statementGroups.incomes.map(
                  ({ bill, dueDate, occKey, status }) => (
                    <BillStatementRow
                      key={bill.id}
                      bill={bill}
                      dueDate={dueDate}
                      status={status}
                      onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
                      onEdit={() => handleEditBill(bill)}
                      onDelete={() => deleteBill(bill.id)}
                    />
                  ),
                )}
              </div>
            )}
          </section>

          {/* Columna 2: Egresos */}
          <section
            aria-label="Columna de Egresos"
            className="border-border bg-card flex flex-col overflow-hidden rounded-3xl border shadow-xs"
          >
            <div className="border-border bg-primary-soft/30 flex items-center justify-between gap-3 border-b px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="bg-primary-soft text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-foreground text-sm font-extrabold sm:text-base">
                    Egresos
                  </h3>
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums">
                    {statementGroups.expenses.length}
                  </span>
                </div>
              </div>

              <p className="text-primary text-base font-extrabold tabular-nums sm:text-lg">
                {formatCurrency(statementGroups.expensesSum)}
              </p>
            </div>

            {statementGroups.expenses.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <CreditCard className="text-muted-foreground/50 mx-auto h-9 w-9" />
                <p className="text-muted-foreground mt-2 text-sm font-semibold">
                  Sin egresos registrados
                </p>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => openNewModal("expense")}
                  className="mt-3"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo pago
                </Button>
              </div>
            ) : (
              <div className="divide-border divide-y">
                {statementGroups.expenses.map(
                  ({ bill, dueDate, occKey, status }) => (
                    <BillStatementRow
                      key={bill.id}
                      bill={bill}
                      dueDate={dueDate}
                      status={status}
                      onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
                      onEdit={() => handleEditBill(bill)}
                      onDelete={() => deleteBill(bill.id)}
                    />
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {searchedBills.map(({ bill, dueDate, occKey, status }) => (
            <BillCard
              key={bill.id}
              bill={bill}
              dueDate={dueDate}
              status={status}
              onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
              onEdit={() => handleEditBill(bill)}
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
