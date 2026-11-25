"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileSpreadsheet,
  GripVertical,
  LayoutGrid,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { NotificationPopover } from "@/components/shared/layout/NotificationPopover";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
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
import { readStorage, writeStorage } from "@/lib/storage";
import { getProfileSlotClasses } from "@/lib/themes";
import type { BillKind, BillStatus, RecurringBill } from "@/types/bills";
import {
  BillCard,
  BillStatementRow,
  DEFAULT_STATEMENT_COLUMNS,
  type StatementColumnKey,
} from "./BillCard";
import { BillFormModal } from "./BillFormModal";

type BillViewMode = "statement" | "cards";
type StatementKindFilter = "all" | "income" | "expense";
type StatementStatusFilter = "all" | "pending" | "overdue" | "paid";
type StatementSortField = "dueDate" | "amount" | "name";

const STATEMENT_PAGE_SIZE = 8;
const STATEMENT_COLS_STORAGE_KEY = "calendario_statement_cols_v1";

function normalizeStatementColumns(raw: unknown): StatementColumnKey[] {
  if (!Array.isArray(raw)) return DEFAULT_STATEMENT_COLUMNS;
  const valid = raw.filter((item): item is StatementColumnKey =>
    DEFAULT_STATEMENT_COLUMNS.includes(item as StatementColumnKey),
  );
  const unique = Array.from(new Set(valid));
  for (const col of DEFAULT_STATEMENT_COLUMNS) {
    if (!unique.includes(col)) unique.push(col);
  }
  return unique;
}

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
  const { profiles, bills, toggleBillPaid, deleteBill } = useCalendarData();

  const primaryProfile = useMemo(
    () => profiles.find((p) => p.isPrimary) ?? profiles[0],
    [profiles],
  );

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const activeProfileId = useMemo(() => {
    if (selectedProfileId === "all") return "all";
    if (
      selectedProfileId &&
      profiles.some((p) => p.id === selectedProfileId)
    ) {
      return selectedProfileId;
    }
    return primaryProfile?.id ?? "all";
  }, [selectedProfileId, profiles, primaryProfile]);

  const activeProfile = useMemo(
    () =>
      activeProfileId === "all"
        ? undefined
        : profiles.find((p) => p.id === activeProfileId),
    [profiles, activeProfileId],
  );
  const activeProfileSlot = activeProfile
    ? getProfileSlotClasses(activeProfile.colorSlot)
    : null;
  const activeCurrency =
    activeProfile?.currency ?? primaryProfile?.currency ?? "PEN";

  const [monthOffset, setMonthOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<BillViewMode>("statement");
  const [kindFilter, setKindFilter] = useState<StatementKindFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<StatementStatusFilter>("all");
  const [sortField, setSortField] = useState<StatementSortField>("dueDate");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnOrder, setColumnOrder] = useState<StatementColumnKey[]>(
    DEFAULT_STATEMENT_COLUMNS,
  );
  const [draggedCol, setDraggedCol] = useState<StatementColumnKey | null>(null);
  const [dragOverCol, setDragOverCol] = useState<StatementColumnKey | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = readStorage<StatementColumnKey[] | null>(
        STATEMENT_COLS_STORAGE_KEY,
        null,
      );
      if (saved) {
        setColumnOrder(normalizeStatementColumns(saved));
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleColumnDrop = (targetCol: StatementColumnKey) => {
    if (!draggedCol || draggedCol === targetCol) {
      setDraggedCol(null);
      setDragOverCol(null);
      return;
    }
    setColumnOrder((prev) => {
      const fromIdx = prev.indexOf(draggedCol);
      const toIdx = prev.indexOf(targetCol);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedCol);
      writeStorage(STATEMENT_COLS_STORAGE_KEY, next);
      return next;
    });
    setDraggedCol(null);
    setDragOverCol(null);
  };
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

  const profileFilteredBills = useMemo(() => {
    if (activeProfileId === "all") return bills;
    return bills.filter((bill) => {
      const ownerId = bill.profileId ?? primaryProfile?.id;
      return ownerId === activeProfileId;
    });
  }, [bills, activeProfileId, primaryProfile]);

  const enrichedBills = useMemo(() => {
    return profileFilteredBills
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
  }, [profileFilteredBills, viewYear, viewMonth, viewMonthKey, clock.todayKey]);

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

  /** Contadores para las píldoras de filtro sobre los resultados buscados */
  const filterCounts = useMemo(() => {
    let incomes = 0;
    let expenses = 0;
    let pending = 0;
    let overdue = 0;
    let paid = 0;

    for (const entry of searchedBills) {
      if (entry.isIncome) {
        incomes += 1;
        paid += 1;
      } else {
        expenses += 1;
        if (entry.status === "paid") {
          paid += 1;
        } else {
          pending += 1;
          if (entry.status === "overdue") {
            overdue += 1;
          }
        }
      }
    }

    return {
      all: searchedBills.length,
      incomes,
      expenses,
      pending,
      overdue,
      paid,
    };
  }, [searchedBills]);

  /** Lista filtrada y ordenada para la tabla de Estado Financiero */
  const filteredStatementBills = useMemo(() => {
    const filtered = searchedBills.filter((entry) => {
      if (kindFilter === "income" && !entry.isIncome) return false;
      if (kindFilter === "expense" && entry.isIncome) return false;

      if (statusFilter === "pending") {
        return !entry.isIncome && entry.status !== "paid";
      }
      if (statusFilter === "overdue") {
        return !entry.isIncome && entry.status === "overdue";
      }
      if (statusFilter === "paid") {
        return entry.isIncome || entry.status === "paid";
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortField === "dueDate") {
        // Ingresos primero si tienen misma fecha, o por fecha de vencimiento
        cmp = a.dueDate.localeCompare(b.dueDate);
        if (cmp === 0 && a.isIncome !== b.isIncome) {
          cmp = a.isIncome ? -1 : 1;
        }
      } else if (sortField === "amount") {
        cmp = a.bill.amount - b.bill.amount;
      } else {
        cmp = a.bill.name.localeCompare(b.bill.name, "es");
      }
      return sortAsc ? cmp : -cmp;
    });

    return sorted;
  }, [searchedBills, kindFilter, statusFilter, sortField, sortAsc]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStatementBills.length / STATEMENT_PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const paginatedStatementBills = useMemo(() => {
    const start = (safePage - 1) * STATEMENT_PAGE_SIZE;
    return filteredStatementBills.slice(start, start + STATEMENT_PAGE_SIZE);
  }, [filteredStatementBills, safePage]);

  const toggleStatusFilter = (target: Exclude<StatementStatusFilter, "all">) => {
    setStatusFilter((prev) => (prev === target ? "all" : target));
    setCurrentPage(1);
  };

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
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      paidExpense,
      pendingExpense,
      expenseCount,
      paidCount,
      paidPct,
      balance,
    };
  }, [enrichedBills]);

  return (
    <div className="space-y-3">
      {/* Encabezado principal en una sola línea: Título + Perfil + Mes + Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <h1 className="text-foreground text-xl font-extrabold tracking-tight whitespace-nowrap sm:text-2xl">
            Pagos y Finanzas de:
          </h1>

          {profiles.length > 0 && (
            <div className="relative inline-flex items-center">
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute left-1.5 flex h-6 w-6 items-center justify-center overflow-hidden rounded-full",
                  activeProfileSlot
                    ? activeProfileSlot.iconBg
                    : "bg-primary-soft text-primary",
                )}
              >
                {activeProfile?.customImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeProfile.customImage}
                    alt={activeProfile.name}
                    className="h-full w-full object-cover"
                  />
                ) : activeProfile ? (
                  <ProfileIcon name={activeProfile.icon} className="h-3.5 w-3.5" />
                ) : (
                  <Users className="h-3.5 w-3.5" />
                )}
              </span>

              <select
                aria-label="Filtrar finanzas por perfil"
                value={activeProfileId}
                onChange={(e) => {
                  setSelectedProfileId(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(
                  "h-9 cursor-pointer appearance-none rounded-full border pr-8 pl-9 text-xs font-extrabold shadow-2xs transition-colors focus:ring-2 focus:outline-none sm:text-sm",
                  activeProfileSlot
                    ? activeProfileSlot.activeChip
                    : "border-border bg-card text-foreground hover:bg-muted focus:border-primary focus:ring-primary/25",
                )}
              >
                {profiles.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    className="bg-card text-foreground"
                  >
                    {p.name}
                  </option>
                ))}
                {profiles.length > 1 && (
                  <option value="all" className="bg-card text-foreground">
                    Todos los perfiles
                  </option>
                )}
              </select>
              <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 opacity-75"
              />
            </div>
          )}

          <div className="border-border bg-card flex w-fit items-center gap-1 rounded-2xl border p-1 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMonthOffset((m) => m - 1)}
              aria-label="Mes anterior"
              className="h-7 w-7"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setMonthOffset(0)}
              title={monthOffset !== 0 ? "Volver al mes actual" : undefined}
              className={cn(
                "min-w-32 text-center text-xs font-extrabold whitespace-nowrap tabular-nums transition-colors sm:text-sm",
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
              className="h-7 w-7"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            Nuevo Egreso
          </Button>
          <NotificationPopover />
        </div>
      </div>

      {/* 3 Tarjetas KPI: Ingresos, Egresos y Saldo Disponible */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Tarjeta 1: Ingresos */}
        <section
          aria-label="Ingresos del mes"
          className="border-border bg-card hover:border-primary/30 flex flex-col justify-between gap-1.5 rounded-2xl border px-4 py-3 shadow-2xs transition-colors"
        >
          <h2 className="text-muted-foreground text-xs font-semibold">
            Ingresos
          </h2>

          <p className="text-success text-xl leading-tight font-extrabold tracking-tight tabular-nums sm:text-2xl">
            {formatCurrency(totals.totalIncome, activeCurrency)}
          </p>
        </section>

        {/* Tarjeta 2: Egresos */}
        <section
          aria-label="Egresos del mes"
          className="border-border bg-card hover:border-primary/30 flex flex-col justify-between gap-1.5 rounded-2xl border px-4 py-3 shadow-2xs transition-colors"
        >
          <h2 className="text-muted-foreground text-xs font-semibold">
            Egresos
          </h2>

          <p className="text-primary text-xl leading-tight font-extrabold tracking-tight tabular-nums sm:text-2xl">
            {formatCurrency(totals.totalExpense, activeCurrency)}
          </p>
        </section>

        {/* Tarjeta 3: Saldo Disponible */}
        <section
          aria-label="Saldo Disponible"
          className="border-border bg-card hover:border-primary/30 flex flex-col justify-between gap-1.5 rounded-2xl border px-4 py-3 shadow-2xs transition-colors"
        >
          <h2 className="text-muted-foreground text-xs font-semibold">
            Saldo Disponible
          </h2>

          <p
            className={cn(
              "text-xl leading-tight font-extrabold tracking-tight tabular-nums sm:text-2xl",
              totals.balance > 0
                ? "text-success"
                : totals.balance < 0
                  ? "text-danger"
                  : "text-foreground",
            )}
          >
            {formatCurrency(totals.balance, activeCurrency)}
          </p>
        </section>
      </div>

      {/* Progreso compacto de pagos del mes */}
      <section
        aria-label="Mi deuda pagada"
        className="border-border bg-card flex flex-col gap-2 rounded-2xl border px-4 py-2.5 shadow-2xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-secondary-soft text-secondary flex h-6 w-6 shrink-0 items-center justify-center rounded-lg">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-foreground text-xs leading-tight font-extrabold sm:text-sm">
              Mi deuda pagada es:
            </h2>
            <span className="text-primary text-xs font-extrabold tabular-nums sm:text-sm">
              {formatCurrency(totals.paidExpense, activeCurrency)}
            </span>
          </div>

          <span className="text-foreground text-xs font-bold tabular-nums sm:text-sm">
            {formatCurrency(totals.totalExpense, activeCurrency)}
          </span>
        </div>

        <div
          className="border-border/70 bg-muted h-2.5 w-full overflow-hidden rounded-full border p-0.5"
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
      </section>

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar ingreso o gasto..."
              aria-label="Buscar ingreso o gasto"
              className="border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/25 h-9 w-full rounded-full border pr-8 pl-8 text-xs font-medium shadow-2xs transition-all focus:ring-2 focus:outline-none sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
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
            className="border-border bg-card inline-flex items-center gap-1 rounded-full border p-1 shadow-2xs"
          >
            <button
              type="button"
              onClick={() => setViewMode("statement")}
              aria-pressed={viewMode === "statement"}
              className={cn(
                "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all",
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
                "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all",
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
        <section
          aria-label="Tabla de Estado Financiero"
          className="border-border bg-card flex flex-col overflow-hidden rounded-3xl border shadow-xs"
        >
          {/* Barra superior de filtros por Tipo, Estado y Ordenamiento */}
          <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 sm:px-5">
            {/* Grupo izquierdo: Todos / Ingresos / Egresos */}
            <div
              role="group"
              aria-label="Filtrar por tipo de movimiento"
              className="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                onClick={() => {
                  setKindFilter("all");
                  setCurrentPage(1);
                }}
                aria-pressed={kindFilter === "all"}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums transition-all",
                  kindFilter === "all"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border-border bg-card text-foreground hover:bg-muted border",
                )}
              >
                <span>Todos ({filterCounts.all})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setKindFilter("income");
                  setCurrentPage(1);
                }}
                aria-pressed={kindFilter === "income"}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums transition-all",
                  kindFilter === "income"
                    ? "bg-success text-primary-foreground shadow-2xs"
                    : "border-border bg-card text-foreground hover:bg-muted border",
                )}
              >
                <ArrowDownLeft
                  className={cn(
                    "h-3.5 w-3.5",
                    kindFilter === "income"
                      ? "text-primary-foreground"
                      : "text-success",
                  )}
                />
                <span>Ingresos ({filterCounts.incomes})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setKindFilter("expense");
                  setCurrentPage(1);
                }}
                aria-pressed={kindFilter === "expense"}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold tabular-nums transition-all",
                  kindFilter === "expense"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "border-border bg-card text-foreground hover:bg-muted border",
                )}
              >
                <ArrowUpRight
                  className={cn(
                    "h-3.5 w-3.5",
                    kindFilter === "expense"
                      ? "text-primary-foreground"
                      : "text-primary",
                  )}
                />
                <span>Egresos ({filterCounts.expenses})</span>
              </button>
            </div>

            {/* Grupo derecho: Estados (Pendientes / Vencidos / Pagados) + Ordenar por */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <span
                aria-hidden="true"
                className="bg-border mr-1 hidden h-6 w-px xl:block"
              />

              <button
                type="button"
                onClick={() => toggleStatusFilter("pending")}
                aria-pressed={statusFilter === "pending"}
                className={cn(
                  "inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all",
                  statusFilter === "pending"
                    ? "bg-warning-soft text-warning ring-warning/50 ring-2"
                    : "border-border bg-card text-foreground hover:bg-muted border",
                )}
              >
                Pendientes ({filterCounts.pending})
              </button>

              <button
                type="button"
                onClick={() => toggleStatusFilter("overdue")}
                aria-pressed={statusFilter === "overdue"}
                className={cn(
                  "bg-danger-soft text-danger inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all hover:opacity-90",
                  statusFilter === "overdue" && "ring-danger/50 ring-2",
                )}
              >
                Vencidos ({filterCounts.overdue})
              </button>

              <button
                type="button"
                onClick={() => toggleStatusFilter("paid")}
                aria-pressed={statusFilter === "paid"}
                className={cn(
                  "bg-success-soft text-success inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-xs font-bold tabular-nums transition-all hover:opacity-90",
                  statusFilter === "paid" && "ring-success/50 ring-2",
                )}
              >
                Pagados ({filterCounts.paid})
              </button>

              <div className="relative">
                <select
                  aria-label="Ordenar movimientos por"
                  value={sortField}
                  onChange={(e) => {
                    const nextField = e.target.value as StatementSortField;
                    setSortField(nextField);
                    setSortAsc(nextField !== "amount");
                    setCurrentPage(1);
                  }}
                  className="border-border bg-card text-foreground hover:bg-muted focus:border-primary focus:ring-primary/25 cursor-pointer appearance-none rounded-full border py-1.5 pr-8 pl-3.5 text-xs font-semibold transition-colors focus:ring-2 focus:outline-none"
                >
                  <option value="dueDate">Ordenar por: Vencimiento</option>
                  <option value="amount">Ordenar por: Monto</option>
                  <option value="name">Ordenar por: Descripción</option>
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2"
                />
              </div>
            </div>
          </div>

          {/* Tabla unificada de movimientos */}
          {filteredStatementBills.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CreditCard className="text-muted-foreground/50 mx-auto h-9 w-9" />
              <p className="text-muted-foreground mt-2 text-sm font-semibold">
                No hay registros que coincidan con los filtros seleccionados
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {(kindFilter !== "all" ||
                  statusFilter !== "all" ||
                  searchQuery.trim() !== "") && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setKindFilter("all");
                      setStatusFilter("all");
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => openNewModal("expense")}
                >
                  <Plus className="h-4 w-4" />
                  Nuevo pago
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-border bg-surface/80 text-muted-foreground border-b text-xs font-bold">
                      {columnOrder.map((colKey) => {
                        const isDragging = draggedCol === colKey;
                        const isOver =
                          dragOverCol === colKey && draggedCol !== colKey;

                        const labelMap: Record<StatementColumnKey, string> = {
                          kind: "Tipo",
                          description: "Descripción",
                          dueDate: "Fecha / Vencimiento",
                          frequency: "Frecuencia",
                          amount: "Monto",
                          status: "Estado",
                          quickPay: "Pago",
                        };

                        return (
                          <th
                            key={colKey}
                            scope="col"
                            draggable
                            title="Mantén presionado y arrastra para mover esta columna"
                            onDragStart={(e) => {
                              setDraggedCol(colKey);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", colKey);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              if (dragOverCol !== colKey) {
                                setDragOverCol(colKey);
                              }
                            }}
                            onDragLeave={() => {
                              if (dragOverCol === colKey) {
                                setDragOverCol(null);
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleColumnDrop(colKey);
                            }}
                            onDragEnd={() => {
                              setDraggedCol(null);
                              setDragOverCol(null);
                            }}
                            className={cn(
                              "group cursor-grab py-2.5 whitespace-nowrap transition-all select-none active:cursor-grabbing",
                              colKey === "kind"
                                ? "px-4"
                                : colKey === "quickPay" ||
                                    colKey === "dueDate" ||
                                    colKey === "frequency" ||
                                    colKey === "status"
                                  ? "px-3 text-center"
                                  : colKey === "amount"
                                    ? "px-3 text-right"
                                    : "px-3",
                              isDragging && "opacity-40",
                              isOver &&
                                "bg-primary-soft/75 text-primary ring-primary/50 ring-2 ring-inset",
                            )}
                          >
                            <div
                              className={cn(
                                "inline-flex items-center gap-1",
                                colKey === "amount" && "justify-end",
                                (colKey === "quickPay" ||
                                  colKey === "dueDate" ||
                                  colKey === "frequency" ||
                                  colKey === "status") &&
                                  "justify-center",
                              )}
                            >
                              <GripVertical
                                aria-hidden="true"
                                className="text-muted-foreground/40 group-hover:text-muted-foreground h-3.5 w-3.5 shrink-0 transition-colors"
                              />
                              {colKey === "dueDate" ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (sortField === "dueDate") {
                                      setSortAsc((prev) => !prev);
                                    } else {
                                      setSortField("dueDate");
                                      setSortAsc(true);
                                    }
                                    setCurrentPage(1);
                                  }}
                                  className="hover:text-foreground inline-flex cursor-pointer items-center gap-1 font-bold transition-colors"
                                >
                                  <span>
                                    Fecha /{" "}
                                    <span className="decoration-muted-foreground/60 underline underline-offset-2">
                                      Vencimiento
                                    </span>
                                  </span>
                                  <ArrowUpDown className="h-3.5 w-3.5" />
                                </button>
                              ) : colKey === "quickPay" ? (
                                <span className="text-muted-foreground/75">
                                  {labelMap[colKey]}
                                </span>
                              ) : (
                                <span>{labelMap[colKey]}</span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      <th
                        scope="col"
                        className="px-4 py-2.5 text-right whitespace-nowrap"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {paginatedStatementBills.map(
                      ({ bill, dueDate, occKey, status }) => (
                        <BillStatementRow
                          key={bill.id}
                          bill={bill}
                          dueDate={dueDate}
                          status={status}
                          columns={columnOrder}
                          onTogglePaid={() => toggleBillPaid(bill.id, occKey)}
                          onEdit={() => handleEditBill(bill)}
                          onDelete={() => deleteBill(bill.id)}
                        />
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pie de tabla: Contador de registros + Paginación */}
              <div className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5">
                <p className="text-muted-foreground text-xs font-medium tabular-nums">
                  {totalPages > 1
                    ? `Mostrando ${(safePage - 1) * STATEMENT_PAGE_SIZE + 1}–${Math.min(
                        safePage * STATEMENT_PAGE_SIZE,
                        filteredStatementBills.length,
                      )} de ${filteredStatementBills.length} registros`
                    : `Mostrando ${filteredStatementBills.length} ${
                        filteredStatementBills.length === 1
                          ? "registro"
                          : "registros"
                      }`}
                </p>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                    className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                    (pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        aria-current={pageNum === safePage ? "page" : undefined}
                        className={cn(
                          "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-xs font-extrabold tabular-nums transition-all",
                          pageNum === safePage
                            ? "bg-primary text-primary-foreground shadow-2xs"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {pageNum}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    aria-label="Página siguiente"
                    className="border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        defaultProfileId={
          activeProfileId !== "all" ? activeProfileId : primaryProfile?.id
        }
        onClose={() => {
          setModalOpen(false);
          setEditingBill(null);
        }}
      />
    </div>
  );
}
