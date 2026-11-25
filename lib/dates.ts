const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEKDAY_SHORT_MONDAY = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const WEEKDAY_LONG = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const WEEKDAY_TINY = ["D", "L", "M", "X", "J", "V", "S"];

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function getMonthKeyFromDateKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Parses YYYY-MM-DD at local noon to prevent DST boundary shifts */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
    0,
    0,
    0,
  );
  return next;
}

export function addDaysToKey(dateKey: string, days: number): string {
  return toDateKey(addDays(parseDateKey(dateKey), days));
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12, 0, 0, 0);
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function clampDayOfMonth(
  year: number,
  monthIndex0: number,
  day: number,
): string {
  const maxDay = daysInMonth(year, monthIndex0);
  const safeDay = Math.min(Math.max(1, day), maxDay);
  return `${year}-${pad2(monthIndex0 + 1)}-${pad2(safeDay)}`;
}

export function daysBetweenKeys(startKey: string, endKey: string): number {
  const a = parseDateKey(startKey);
  const b = parseDateKey(endKey);
  const msPerDay = 86_400_000;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/** Monday-first start of week */
export function startOfWeekMonday(date: Date): Date {
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

export function getWeekDays(anchorDate: Date): Date[] {
  const start = startOfWeekMonday(anchorDate);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Returns 35 or 42 dates (5 or 6 rows x 7 columns, Monday-first) covering the month */
export function getMonthGridDays(year: number, monthIndex0: number): Date[] {
  const firstOfMonth = new Date(year, monthIndex0, 1, 12, 0, 0, 0);
  const lastOfMonth = new Date(year, monthIndex0 + 1, 0, 12, 0, 0, 0);
  const gridStart = startOfWeekMonday(firstOfMonth);
  const totalDaysNeeded =
    Math.round((lastOfMonth.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const cellCount = totalDaysNeeded <= 35 ? 35 : 42;
  return Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i));
}

export function getWeekdayHeadersMonday(): string[] {
  return WEEKDAY_SHORT_MONDAY;
}

export function getWeekdayTinyLabels(): string[] {
  return WEEKDAY_TINY;
}

export function getWeekdayLong(date: Date): string {
  return WEEKDAY_LONG[date.getDay()] ?? "";
}

export function getMonthName(monthIndex0: number): string {
  return MONTH_NAMES[monthIndex0] ?? "";
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatLongDate(date: Date): string {
  return `${WEEKDAY_LONG[date.getDay()]}, ${date.getDate()} de ${MONTH_NAMES[date.getMonth()].toLowerCase()} de ${date.getFullYear()}`;
}

export function formatShortDate(dateKey: string): string {
  const d = parseDateKey(dateKey);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

export function formatDateWithWeekday(dateKey: string): string {
  const d = parseDateKey(dateKey);
  const wk = WEEKDAY_LONG[d.getDay()].slice(0, 3);
  return `${wk}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
}

export function formatTimeDisplay(time24?: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return time24;
  const period = h >= 12 ? "p. m." : "a. m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad2(m)} ${period}`;
}

export function formatCurrency(
  amount: number,
  currency = "PEN",
  compact = false,
): string {
  const normalizedCurrency = currency === "USD" ? "USD" : "PEN";
  const locale = normalizedCurrency === "USD" ? "en-US" : "es-PE";
  const fractionDigits = compact && Number.isInteger(amount) ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = normalizedCurrency === "USD" ? "$" : "S/ ";
    return `${symbol}${amount.toFixed(fractionDigits)}`;
  }
}

export function getCurrentWeekKey(date: Date): string {
  const monday = startOfWeekMonday(date);
  return toDateKey(monday);
}
