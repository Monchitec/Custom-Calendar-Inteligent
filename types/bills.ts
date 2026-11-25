export type BillKind = "expense" | "income";

export type BillFrequency =
  "monthly" | "biweekly" | "weekly" | "quarterly" | "yearly" | "once";

export type BillStatus = "paid" | "upcoming" | "due-soon" | "overdue";

export interface RecurringBill {
  id: string;
  /** "expense" (por defecto) o "income" para ingresos recurrentes / puntuales */
  kind?: BillKind;
  name: string;
  provider?: string;
  visualIcon?: string;
  amount: number;
  currency: string;
  dueDay: number; // 1..31
  startDate: string; // YYYY-MM-DD
  frequency: BillFrequency;
  autoPay: boolean;
  reminderDaysBefore: number;
  paymentUrl?: string;
  notes?: string;
  /** Keys in YYYY-MM (for monthly/quarterly/yearly) or YYYY-MM-DD (for weekly/biweekly/once) */
  paidOccurrences: string[];
}
