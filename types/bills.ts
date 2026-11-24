export type BillFrequency =
  "monthly" | "biweekly" | "weekly" | "quarterly" | "yearly" | "once";

export type BillStatus = "paid" | "upcoming" | "due-soon" | "overdue";

export interface RecurringBill {
  id: string;
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
  notes?: string;
  /** Keys in YYYY-MM (for monthly/quarterly/yearly) or YYYY-MM-DD (for weekly/biweekly/once) */
  paidOccurrences: string[];
}
