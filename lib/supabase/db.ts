import type {
  AlarmItem,
  NotificationItem,
  ReminderPreferences,
} from "@/types/alarms";
import type { RecurringBill } from "@/types/bills";
import type { CalendarEvent, Profile } from "@/types/calendar";
import type { Checklist, TaskItem } from "@/types/tasks";
import type { ThemeConfig } from "@/types/theme";
import type { CalendarStoreState } from "@/lib/defaultData";
import { DEFAULT_PREFERENCES } from "@/lib/defaultData";
import { getSupabaseBrowserClient } from "./client";

const SETTINGS_ID = "default";

// ============================================================================
// MAPPERS (snake_case en PostgreSQL <-> camelCase en TypeScript)
// ============================================================================

function toProfileRow(p: Profile, index = 0) {
  return {
    id: p.id,
    name: p.name,
    icon: p.icon,
    color_slot: p.colorSlot,
    visible: p.visible,
    is_primary: Boolean(p.isPrimary),
    currency: p.currency === "USD" ? "USD" : "PEN",
    email: p.email ?? null,
    phone: p.phone ?? null,
    custom_image: p.customImage ?? null,
    sort_order: index,
  };
}

function fromProfileRow(r: Record<string, unknown>): Profile {
  return {
    id: String(r.id),
    name: String(r.name),
    icon: r.icon as Profile["icon"],
    colorSlot: r.color_slot as Profile["colorSlot"],
    visible: Boolean(r.visible),
    isPrimary: Boolean(r.is_primary),
    currency: r.currency === "USD" ? "USD" : "PEN",
    email: r.email ? String(r.email) : undefined,
    phone: r.phone ? String(r.phone) : undefined,
    customImage: r.custom_image ? String(r.custom_image) : undefined,
  };
}

function toEventRow(e: CalendarEvent) {
  return {
    id: e.id,
    title: e.title,
    date: e.date,
    start_time: e.startTime ?? null,
    end_time: e.endTime ?? null,
    all_day: e.allDay,
    profile_id: e.profileId,
    visual_icon: e.visualIcon ?? null,
    location: e.location ?? null,
    notes: e.notes ?? null,
    recurrence: e.recurrence,
    reminder_minutes: e.reminderMinutes,
    completed: Boolean(e.completed),
    excluded_dates: e.excludedDates ?? [],
  };
}

function fromEventRow(r: Record<string, unknown>): CalendarEvent {
  return {
    id: String(r.id),
    title: String(r.title),
    date: String(r.date),
    startTime: r.start_time ? String(r.start_time) : undefined,
    endTime: r.end_time ? String(r.end_time) : undefined,
    allDay: Boolean(r.all_day),
    profileId: String(r.profile_id),
    visualIcon: r.visual_icon ? String(r.visual_icon) : undefined,
    location: r.location ? String(r.location) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    recurrence: (r.recurrence as CalendarEvent["recurrence"]) ?? "none",
    reminderMinutes:
      r.reminder_minutes === null || r.reminder_minutes === undefined
        ? null
        : Number(r.reminder_minutes),
    completed: Boolean(r.completed),
    excludedDates: Array.isArray(r.excluded_dates)
      ? (r.excluded_dates as string[])
      : undefined,
  };
}

function toTaskRow(t: TaskItem) {
  return {
    id: t.id,
    title: t.title,
    completed: t.completed,
    profile_id: t.profileId,
    visual_icon: t.visualIcon ?? null,
    due_date: t.dueDate ?? null,
    due_time: t.dueTime ?? null,
    priority: t.priority,
    notes: t.notes ?? null,
    show_on_calendar: t.showOnCalendar,
    created_at: t.createdAt,
  };
}

function fromTaskRow(r: Record<string, unknown>): TaskItem {
  return {
    id: String(r.id),
    title: String(r.title),
    completed: Boolean(r.completed),
    profileId: String(r.profile_id),
    visualIcon: r.visual_icon ? String(r.visual_icon) : undefined,
    dueDate: r.due_date ? String(r.due_date) : undefined,
    dueTime: r.due_time ? String(r.due_time) : undefined,
    priority: (r.priority as TaskItem["priority"]) ?? "medium",
    notes: r.notes ? String(r.notes) : undefined,
    showOnCalendar: Boolean(r.show_on_calendar),
    createdAt: r.created_at ? String(r.created_at) : new Date().toISOString(),
  };
}

function toChecklistRow(cl: Checklist) {
  return {
    id: cl.id,
    title: cl.title,
    description: cl.description ?? null,
    profile_id: cl.profileId,
    reset_schedule: cl.resetSchedule,
    last_reset_key: cl.lastResetKey ?? null,
    steps: cl.steps,
  };
}

function fromChecklistRow(r: Record<string, unknown>): Checklist {
  return {
    id: String(r.id),
    title: String(r.title),
    description: r.description ? String(r.description) : undefined,
    profileId: String(r.profile_id),
    resetSchedule: (r.reset_schedule as Checklist["resetSchedule"]) ?? "daily",
    lastResetKey: r.last_reset_key ? String(r.last_reset_key) : undefined,
    steps: Array.isArray(r.steps) ? (r.steps as Checklist["steps"]) : [],
  };
}

function toBillRow(b: RecurringBill) {
  return {
    id: b.id,
    kind: b.kind ?? "expense",
    profile_id: b.profileId ?? null,
    name: b.name,
    provider: b.provider ?? null,
    visual_icon: b.visualIcon ?? null,
    amount: b.amount,
    currency: b.currency || "PEN",
    due_day: b.dueDay,
    start_date: b.startDate,
    frequency: b.frequency,
    auto_pay: b.autoPay,
    reminder_days_before: b.reminderDaysBefore,
    payment_url: b.paymentUrl ?? null,
    notes: b.notes ?? null,
    paid_occurrences: b.paidOccurrences,
  };
}

function fromBillRow(r: Record<string, unknown>): RecurringBill {
  return {
    id: String(r.id),
    kind: r.kind === "income" ? "income" : "expense",
    profileId: r.profile_id ? String(r.profile_id) : undefined,
    name: String(r.name),
    provider: r.provider ? String(r.provider) : undefined,
    visualIcon: r.visual_icon ? String(r.visual_icon) : undefined,
    amount: Number(r.amount) || 0,
    currency: r.currency ? String(r.currency) : "PEN",
    dueDay: Number(r.due_day) || 1,
    startDate: String(r.start_date),
    frequency: (r.frequency as RecurringBill["frequency"]) ?? "monthly",
    autoPay: Boolean(r.auto_pay),
    reminderDaysBefore: Number(r.reminder_days_before) || 0,
    paymentUrl: r.payment_url ? String(r.payment_url) : undefined,
    notes: r.notes ? String(r.notes) : undefined,
    paidOccurrences: Array.isArray(r.paid_occurrences)
      ? (r.paid_occurrences as string[])
      : [],
  };
}

function toAlarmRow(a: AlarmItem) {
  return {
    id: a.id,
    label: a.label,
    time: a.time,
    days: a.days,
    enabled: a.enabled,
    sound: a.sound,
    profile_id: a.profileId ?? null,
    snooze_minutes: a.snoozeMinutes,
  };
}

function fromAlarmRow(r: Record<string, unknown>): AlarmItem {
  return {
    id: String(r.id),
    label: String(r.label),
    time: String(r.time),
    days: Array.isArray(r.days) ? (r.days as number[]) : [],
    enabled: Boolean(r.enabled),
    sound: (r.sound as AlarmItem["sound"]) ?? "chime",
    profileId: r.profile_id ? String(r.profile_id) : undefined,
    snoozeMinutes: Number(r.snooze_minutes) || 5,
  };
}

function toNotificationRow(n: NotificationItem) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    timestamp: n.timestamp,
    read: n.read,
    kind: n.kind,
    link: n.link ?? null,
  };
}

function fromNotificationRow(r: Record<string, unknown>): NotificationItem {
  return {
    id: String(r.id),
    title: String(r.title),
    body: String(r.body),
    timestamp: String(r.timestamp),
    read: Boolean(r.read),
    kind: (r.kind as NotificationItem["kind"]) ?? "system",
    link: r.link ? String(r.link) : undefined,
  };
}

// ============================================================================
// LECTURA INICIAL DE TODAS LAS TABLAS EN PARALELO
// ============================================================================

export async function fetchAllCalendarTables(): Promise<CalendarStoreState | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;

  const [profRes, evtRes, tskRes, chkRes, billRes, almRes, ntfRes, setRes] =
    await Promise.all([
      client
        .from("profiles")
        .select("*")
        .order("sort_order", { ascending: true }),
      client.from("events").select("*").order("date", { ascending: true }),
      client
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false }),
      client
        .from("checklists")
        .select("*")
        .order("created_at", { ascending: true }),
      client.from("bills").select("*").order("due_day", { ascending: true }),
      client.from("alarms").select("*").order("time", { ascending: true }),
      client
        .from("notifications")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(40),
      client
        .from("app_settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .maybeSingle(),
    ]);

  if (profRes.error) return null;

  const settings = (setRes.data as Record<string, unknown> | null) ?? null;

  return {
    profiles: (profRes.data ?? []).map((r) =>
      fromProfileRow(r as Record<string, unknown>),
    ),
    events: (evtRes.data ?? []).map((r) =>
      fromEventRow(r as Record<string, unknown>),
    ),
    tasks: (tskRes.data ?? []).map((r) =>
      fromTaskRow(r as Record<string, unknown>),
    ),
    checklists: (chkRes.data ?? []).map((r) =>
      fromChecklistRow(r as Record<string, unknown>),
    ),
    bills: (billRes.data ?? []).map((r) =>
      fromBillRow(r as Record<string, unknown>),
    ),
    alarms: (almRes.data ?? []).map((r) =>
      fromAlarmRow(r as Record<string, unknown>),
    ),
    notifications: (ntfRes.data ?? []).map((r) =>
      fromNotificationRow(r as Record<string, unknown>),
    ),
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...((settings?.preferences as Partial<ReminderPreferences>) ?? {}),
    },
    showBillsOnCalendar:
      settings?.show_bills_on_calendar === undefined
        ? true
        : Boolean(settings.show_bills_on_calendar),
    showTasksOnCalendar:
      settings?.show_tasks_on_calendar === undefined
        ? true
        : Boolean(settings.show_tasks_on_calendar),
  };
}

export async function seedAllCalendarTables(
  initial: CalendarStoreState,
): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (!client) return;

  await Promise.all([
    initial.profiles.length > 0 &&
      client
        .from("profiles")
        .upsert(initial.profiles.map((p, idx) => toProfileRow(p, idx))),
    initial.events.length > 0 &&
      client.from("events").upsert(initial.events.map(toEventRow)),
    initial.tasks.length > 0 &&
      client.from("tasks").upsert(initial.tasks.map(toTaskRow)),
    initial.checklists.length > 0 &&
      client.from("checklists").upsert(initial.checklists.map(toChecklistRow)),
    initial.bills.length > 0 &&
      client.from("bills").upsert(initial.bills.map(toBillRow)),
    initial.alarms.length > 0 &&
      client.from("alarms").upsert(initial.alarms.map(toAlarmRow)),
    initial.notifications.length > 0 &&
      client
        .from("notifications")
        .upsert(initial.notifications.map(toNotificationRow)),
    client.from("app_settings").upsert({
      id: SETTINGS_ID,
      preferences: initial.preferences,
      show_bills_on_calendar: initial.showBillsOnCalendar,
      show_tasks_on_calendar: initial.showTasksOnCalendar,
      updated_at: new Date().toISOString(),
    }),
  ]);
}

// ============================================================================
// OPERACIONES GRANULARES POR TABLA (0 conflictos entre familiares)
// ============================================================================

export async function dbUpsertProfile(profile: Profile, index = 0) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const row = toProfileRow(profile, index);
  const { error } = await client.from("profiles").upsert(row);
  if (!error) return;

  // Fallback si faltan columnas nuevas (is_primary, currency, email, phone) en el schema cache
  const fallbackRow: Record<string, unknown> = { ...row };
  if (error.message.includes("is_primary")) delete fallbackRow.is_primary;
  if (error.message.includes("currency")) delete fallbackRow.currency;
  if (error.message.includes("email")) delete fallbackRow.email;
  if (error.message.includes("phone")) delete fallbackRow.phone;
  if (Object.keys(fallbackRow).length < Object.keys(row).length) {
    console.warn("[Supabase dbUpsertProfile fallback]", error.message);
    const retry = await client.from("profiles").upsert(fallbackRow);
    if (retry.error) {
      console.error("[Supabase dbUpsertProfile retry]", retry.error.message);
    }
    return;
  }
  console.error("[Supabase dbUpsertProfile]", error.message);
}

export async function dbDeleteProfile(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("profiles").delete().eq("id", id);
}

export async function dbUpsertEvent(event: CalendarEvent) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const row = toEventRow(event);
  const { error } = await client.from("events").upsert(row);
  if (!error) return;

  if (error.message.includes("excluded_dates")) {
    console.warn("[Supabase dbUpsertEvent fallback]", error.message);
    const fallbackRow: Record<string, unknown> = { ...row };
    delete fallbackRow.excluded_dates;
    const retry = await client.from("events").upsert(fallbackRow);
    if (retry.error) {
      console.error("[Supabase dbUpsertEvent retry]", retry.error.message);
    }
    return;
  }
  console.error("[Supabase dbUpsertEvent]", error.message);
}

export async function dbDeleteEvent(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("events").delete().eq("id", id);
}

export async function dbUpsertTask(task: TaskItem) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("tasks").upsert(toTaskRow(task));
}

export async function dbDeleteTask(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("tasks").delete().eq("id", id);
}

export async function dbUpsertChecklist(checklist: Checklist) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("checklists").upsert(toChecklistRow(checklist));
}

export async function dbDeleteChecklist(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("checklists").delete().eq("id", id);
}

export async function dbUpsertBill(bill: RecurringBill) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const row = toBillRow(bill);
  const { error } = await client.from("bills").upsert(row);
  if (!error) return;

  console.error("[Supabase dbUpsertBill]", error.message);

  // Fallback si falta alguna columna opcional en el schema cache de PostgREST
  const fallbackRow: Record<string, unknown> = { ...row };
  if (error.message.includes("payment_url")) {
    delete fallbackRow.payment_url;
  }
  if (error.message.includes("kind")) {
    delete fallbackRow.kind;
  }
  if (error.message.includes("profile_id")) {
    delete fallbackRow.profile_id;
  }
  if (Object.keys(fallbackRow).length < Object.keys(row).length) {
    const retry = await client.from("bills").upsert(fallbackRow);
    if (retry.error) {
      console.error("[Supabase dbUpsertBill retry]", retry.error.message);
    }
  }
}

export async function dbDeleteBill(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("bills").delete().eq("id", id);
}

export async function dbUpsertAlarm(alarm: AlarmItem) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("alarms").upsert(toAlarmRow(alarm));
}

export async function dbDeleteAlarm(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("alarms").delete().eq("id", id);
}

export async function dbInsertNotification(notif: NotificationItem) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("notifications").upsert(toNotificationRow(notif));
}

export async function dbMarkNotificationRead(id: string) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("notifications").update({ read: true }).eq("id", id);
}

export async function dbMarkAllNotificationsRead() {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("notifications").update({ read: true }).eq("read", false);
}

export async function dbClearNotifications() {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  await client.from("notifications").delete().neq("id", "");
}

export async function dbUpdateSettings(patch: {
  preferences?: ReminderPreferences;
  theme?: ThemeConfig;
  showBillsOnCalendar?: boolean;
  showTasksOnCalendar?: boolean;
}) {
  const client = getSupabaseBrowserClient();
  if (!client) return;
  const payload: Record<string, unknown> = {
    id: SETTINGS_ID,
    updated_at: new Date().toISOString(),
  };
  if (patch.preferences !== undefined) payload.preferences = patch.preferences;
  if (patch.theme !== undefined) payload.theme = patch.theme;
  if (patch.showBillsOnCalendar !== undefined) {
    payload.show_bills_on_calendar = patch.showBillsOnCalendar;
  }
  if (patch.showTasksOnCalendar !== undefined) {
    payload.show_tasks_on_calendar = patch.showTasksOnCalendar;
  }
  await client.from("app_settings").upsert(payload, { onConflict: "id" });
}

export async function dbFetchTheme(): Promise<Partial<ThemeConfig> | null> {
  const client = getSupabaseBrowserClient();
  if (!client) return null;
  const { data } = await client
    .from("app_settings")
    .select("theme")
    .eq("id", SETTINGS_ID)
    .maybeSingle();
  return (data as { theme?: Partial<ThemeConfig> } | null)?.theme ?? null;
}

export function subscribeToCalendarTables(onAnyChange: () => void): () => void {
  const client = getSupabaseBrowserClient();
  if (!client) return () => {};

  const tables = [
    "profiles",
    "events",
    "tasks",
    "checklists",
    "bills",
    "alarms",
    "notifications",
    "app_settings",
  ];

  let channel = client.channel("calendar-family-realtime");
  for (const table of tables) {
    channel = channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      () => onAnyChange(),
    );
  }
  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
