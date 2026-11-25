import type { BillStatus, RecurringBill } from "@/types/bills";
import type {
  CalendarEvent,
  Profile,
  ProjectedCalendarItem,
} from "@/types/calendar";
import type { Checklist, TaskItem } from "@/types/tasks";
import {
  addDays,
  clampDayOfMonth,
  daysBetweenKeys,
  getMonthKeyFromDateKey,
  parseDateKey,
  toDateKey,
} from "./dates";

const DAY_SHORT_BY_DOW: Record<number, string> = {
  0: "Dom",
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
};

/** Orden visual Lunes -> Domingo con su valor Date.getDay() */
export const MONDAY_FIRST_DAYS: Array<{
  dow: number;
  tiny: string;
  short: string;
}> = [
  { dow: 1, tiny: "L", short: "Lun" },
  { dow: 2, tiny: "M", short: "Mar" },
  { dow: 3, tiny: "X", short: "Mié" },
  { dow: 4, tiny: "J", short: "Jue" },
  { dow: 5, tiny: "V", short: "Vie" },
  { dow: 6, tiny: "S", short: "Sáb" },
  { dow: 0, tiny: "D", short: "Dom" },
];

export function isCustomDaysRecurrence(rec: string): rec is `days:${string}` {
  return rec.startsWith("days:");
}

export function parseCustomRecurrenceDays(rec: string): number[] {
  if (!rec.startsWith("days:")) return [];
  return rec
    .slice(5)
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
}

export function encodeCustomRecurrenceDays(days: number[]): `days:${string}` {
  const unique = Array.from(new Set(days.filter((d) => d >= 0 && d <= 6))).sort(
    (a, b) => a - b,
  );
  return `days:${unique.join(",")}`;
}

export function formatRecurrenceLabel(rec: string): string {
  if (rec === "none") return "No se repite";
  if (rec === "daily") return "Todos los días";
  if (rec === "weekdays") return "Lunes a viernes";
  if (rec === "weekly") return "Cada semana";
  if (rec === "biweekly") return "Cada 2 semanas";
  if (rec === "monthly") return "Cada mes";
  if (rec === "yearly") return "Cada año";
  if (rec.startsWith("days:")) {
    const days = parseCustomRecurrenceDays(rec);
    if (days.length === 0) return "No se repite";
    const ordered = MONDAY_FIRST_DAYS.filter((d) => days.includes(d.dow)).map(
      (d) => DAY_SHORT_BY_DOW[d.dow],
    );
    return `Cada ${ordered.join(", ")}`;
  }
  return "No se repite";
}

export function projectEventOccurrences(
  event: CalendarEvent,
  rangeStartKey: string,
  rangeEndKey: string,
): string[] {
  const results: string[] = [];
  if (event.date > rangeEndKey) return results;

  if (event.recurrence === "none") {
    if (event.date >= rangeStartKey && event.date <= rangeEndKey) {
      results.push(event.date);
    }
    return results;
  }

  const start = parseDateKey(event.date);
  const rangeStart = parseDateKey(rangeStartKey);
  const rangeEnd = parseDateKey(rangeEndKey);

  if (isCustomDaysRecurrence(event.recurrence)) {
    const customDays = parseCustomRecurrenceDays(event.recurrence);
    if (customDays.length === 0) return results;
    let cursor = start < rangeStart ? new Date(rangeStart) : new Date(start);
    while (cursor <= rangeEnd) {
      const key = toDateKey(cursor);
      if (key >= event.date && customDays.includes(cursor.getDay())) {
        results.push(key);
      }
      cursor = addDays(cursor, 1);
    }
    return results;
  }

  if (
    event.recurrence === "daily" ||
    event.recurrence === "weekdays" ||
    event.recurrence === "weekly" ||
    event.recurrence === "biweekly"
  ) {
    let cursor = start < rangeStart ? new Date(rangeStart) : new Date(start);
    const startWeekday = start.getDay();

    while (cursor <= rangeEnd) {
      const key = toDateKey(cursor);
      const diff = daysBetweenKeys(event.date, key);
      if (diff >= 0) {
        if (event.recurrence === "daily") {
          results.push(key);
        } else if (event.recurrence === "weekdays") {
          const dow = cursor.getDay();
          if (dow >= 1 && dow <= 5) results.push(key);
        } else if (event.recurrence === "weekly") {
          if (cursor.getDay() === startWeekday) results.push(key);
        } else if (event.recurrence === "biweekly") {
          if (diff % 14 === 0) results.push(key);
        }
      }
      cursor = addDays(cursor, 1);
    }
    return results;
  }

  if (event.recurrence === "monthly") {
    const startDay = start.getDate();
    let y = Math.max(start.getFullYear(), rangeStart.getFullYear());
    let m = y === rangeStart.getFullYear() ? rangeStart.getMonth() : 0;
    const endYear = rangeEnd.getFullYear();
    const endMonth = rangeEnd.getMonth();

    while (y < endYear || (y === endYear && m <= endMonth)) {
      const candidate = clampDayOfMonth(y, m, startDay);
      if (
        candidate >= event.date &&
        candidate >= rangeStartKey &&
        candidate <= rangeEndKey
      ) {
        results.push(candidate);
      }
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return results;
  }

  if (event.recurrence === "yearly") {
    const startMonth = start.getMonth();
    const startDay = start.getDate();
    for (
      let y = Math.max(start.getFullYear(), rangeStart.getFullYear());
      y <= rangeEnd.getFullYear();
      y += 1
    ) {
      const candidate = clampDayOfMonth(y, startMonth, startDay);
      if (
        candidate >= event.date &&
        candidate >= rangeStartKey &&
        candidate <= rangeEndKey
      ) {
        results.push(candidate);
      }
    }
  }

  return results;
}

export function getBillOccurrenceKey(
  bill: RecurringBill,
  dueDateKey: string,
): string {
  if (
    bill.frequency === "monthly" ||
    bill.frequency === "quarterly" ||
    bill.frequency === "yearly"
  ) {
    return getMonthKeyFromDateKey(dueDateKey);
  }
  return dueDateKey;
}

export function projectBillOccurrences(
  bill: RecurringBill,
  rangeStartKey: string,
  rangeEndKey: string,
): Array<{ dueDate: string; occurrenceKey: string; isPaid: boolean }> {
  const occurrences: Array<{
    dueDate: string;
    occurrenceKey: string;
    isPaid: boolean;
  }> = [];

  if (bill.startDate > rangeEndKey) return occurrences;

  const start = parseDateKey(bill.startDate);
  const rangeStart = parseDateKey(rangeStartKey);
  const rangeEnd = parseDateKey(rangeEndKey);

  if (bill.frequency === "once") {
    if (bill.startDate >= rangeStartKey && bill.startDate <= rangeEndKey) {
      const occKey = getBillOccurrenceKey(bill, bill.startDate);
      occurrences.push({
        dueDate: bill.startDate,
        occurrenceKey: occKey,
        isPaid: bill.paidOccurrences.includes(occKey),
      });
    }
    return occurrences;
  }

  if (bill.frequency === "weekly" || bill.frequency === "biweekly") {
    const step = bill.frequency === "weekly" ? 7 : 14;
    let cursor = new Date(start);
    while (cursor <= rangeEnd) {
      const key = toDateKey(cursor);
      if (key >= rangeStartKey && key <= rangeEndKey) {
        const occKey = getBillOccurrenceKey(bill, key);
        occurrences.push({
          dueDate: key,
          occurrenceKey: occKey,
          isPaid: bill.paidOccurrences.includes(occKey),
        });
      }
      cursor = addDays(cursor, step);
    }
    return occurrences;
  }

  // monthly / quarterly / yearly
  let y = rangeStart.getFullYear();
  let m = rangeStart.getMonth();
  const endY = rangeEnd.getFullYear();
  const endM = rangeEnd.getMonth();
  const startMonthTotal = start.getFullYear() * 12 + start.getMonth();

  while (y < endY || (y === endY && m <= endM)) {
    const curMonthTotal = y * 12 + m;
    const delta = curMonthTotal - startMonthTotal;
    const matchesCycle =
      delta >= 0 &&
      (bill.frequency === "monthly" ||
        (bill.frequency === "quarterly" && delta % 3 === 0) ||
        (bill.frequency === "yearly" && delta % 12 === 0));

    if (matchesCycle) {
      const candidate = clampDayOfMonth(y, m, bill.dueDay);
      if (candidate >= rangeStartKey && candidate <= rangeEndKey) {
        const occKey = getBillOccurrenceKey(bill, candidate);
        occurrences.push({
          dueDate: candidate,
          occurrenceKey: occKey,
          isPaid: bill.paidOccurrences.includes(occKey),
        });
      }
    }

    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }

  return occurrences;
}

export function getBillStatus(
  isPaid: boolean,
  dueDateKey: string,
  todayKey: string,
  reminderDaysBefore: number,
): BillStatus {
  if (isPaid) return "paid";
  const diff = daysBetweenKeys(todayKey, dueDateKey);
  if (diff < 0) return "overdue";
  if (diff <= Math.max(reminderDaysBefore, 3)) return "due-soon";
  return "upcoming";
}

export function buildProjectedCalendarItems(params: {
  events: CalendarEvent[];
  bills: RecurringBill[];
  tasks: TaskItem[];
  checklists?: Checklist[];
  todayKey?: string;
  profiles: Profile[];
  rangeStartKey: string;
  rangeEndKey: string;
  includeBills: boolean;
  includeTasks: boolean;
}): ProjectedCalendarItem[] {
  const {
    events,
    bills,
    tasks,
    checklists = [],
    todayKey,
    profiles,
    rangeStartKey,
    rangeEndKey,
    includeBills,
    includeTasks,
  } = params;

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const items: ProjectedCalendarItem[] = [];

  for (const event of events) {
    const profile = profileMap.get(event.profileId);
    if (profile && !profile.visible) continue;
    const dates = projectEventOccurrences(event, rangeStartKey, rangeEndKey);
    for (const dateKey of dates) {
      items.push({
        id: `event:${event.id}:${dateKey}`,
        source: "event",
        sourceId: event.id,
        title: event.title,
        date: dateKey,
        startTime: event.allDay ? undefined : event.startTime,
        endTime: event.allDay ? undefined : event.endTime,
        allDay: event.allDay,
        colorSlot: profile?.colorSlot ?? "cat-1",
        profileId: event.profileId,
        profileLabel: profile?.name ?? "General",
        visualIcon: event.visualIcon,
        location: event.location,
        notes: event.notes,
        completed: event.completed,
        recurrence: event.recurrence,
        reminderMinutes: event.reminderMinutes,
      });
    }
  }

  if (includeBills) {
    for (const bill of bills) {
      if (bill.kind === "income") continue;
      const occs = projectBillOccurrences(bill, rangeStartKey, rangeEndKey);
      for (const occ of occs) {
        items.push({
          id: `bill:${bill.id}:${occ.dueDate}`,
          source: "bill",
          sourceId: bill.id,
          title: bill.name,
          date: occ.dueDate,
          allDay: true,
          colorSlot: "cat-bills",
          profileId: "__bills__",
          profileLabel: "Pagos",
          visualIcon: bill.visualIcon,
          amount: bill.amount,
          currency: bill.currency,
          billPaid: occ.isPaid,
          notes: bill.provider ? `Proveedor: ${bill.provider}` : bill.notes,
        });
      }
    }
  }

  if (includeTasks) {
    for (const task of tasks) {
      if (!task.showOnCalendar || !task.dueDate) continue;
      if (task.dueDate < rangeStartKey || task.dueDate > rangeEndKey) continue;
      const profile = profileMap.get(task.profileId);
      if (profile && !profile.visible) continue;
      items.push({
        id: `task:${task.id}:${task.dueDate}`,
        source: "task",
        sourceId: task.id,
        title: task.title,
        date: task.dueDate,
        startTime: task.dueTime,
        allDay: !task.dueTime,
        colorSlot: profile?.colorSlot ?? "cat-6",
        profileId: task.profileId,
        profileLabel: profile?.name ?? "Tarea",
        visualIcon: task.visualIcon,
        completed: task.completed,
        notes: task.notes,
      });
    }

    // Proyectar rutinas diarias en el día de hoy si hoy cae dentro del rango visible
    if (todayKey && todayKey >= rangeStartKey && todayKey <= rangeEndKey) {
      for (const cl of checklists) {
        if (cl.resetSchedule !== "daily") continue;
        const profile = profileMap.get(cl.profileId);
        if (profile && !profile.visible) continue;
        const totalSteps = cl.steps.length;
        const doneSteps = cl.steps.filter((s) => s.done).length;
        const allDone = totalSteps > 0 && doneSteps === totalSteps;

        items.push({
          id: `checklist:${cl.id}:${todayKey}`,
          source: "task",
          sourceId: cl.id,
          title:
            totalSteps > 0
              ? `${cl.title} (${doneSteps}/${totalSteps})`
              : cl.title,
          date: todayKey,
          allDay: true,
          colorSlot: profile?.colorSlot ?? "cat-6",
          profileId: cl.profileId,
          profileLabel: profile?.name ?? "Rutina",
          completed: allDone,
          notes: cl.description,
        });
      }
    }
  }

  items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });

  return items;
}
