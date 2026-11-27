export type BillKind = "expense" | "income";

export type BillFrequency =
  "monthly" | "biweekly" | "weekly" | "quarterly" | "yearly" | "once";

export type BillStatus = "paid" | "upcoming" | "due-soon" | "overdue";

export interface RecurringBill {
  id: string;
  /** "expense" (por defecto) o "income" para ingresos recurrentes / puntuales */
  kind?: BillKind;
  /** Perfil al que pertenece este ingreso o egreso (por defecto, el perfil principal) */
  profileId?: string;
  name: string;
  provider?: string;
  visualIcon?: string;
  amount: number;
  currency: string;
  dueDay: number; // 1..31
  startDate: string; // YYYY-MM-DD
  /** Fecha límite opcional (YYYY-MM-DD) cuando se cambia el monto "desde este mes en adelante" */
  endDate?: string;
  /** Montos excepcionales por mes (YYYY-MM -> monto) sin alterar meses anteriores */
  amountOverrides?: Record<string, number>;
  /** Meses (YYYY-MM) en los que este pago/ingreso recurrente se omite */
  excludedMonths?: string[];
  frequency: BillFrequency;
  autoPay: boolean;
  reminderDaysBefore: number;
  paymentUrl?: string;
  notes?: string;
  /** Keys in YYYY-MM (for monthly/quarterly/yearly) or YYYY-MM-DD (for weekly/biweekly/once) */
  paidOccurrences: string[];
}
