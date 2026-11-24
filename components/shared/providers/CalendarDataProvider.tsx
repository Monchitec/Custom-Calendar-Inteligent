"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getCurrentWeekKey, pad2, toDateKey } from "@/lib/dates";
import {
  type CalendarStoreState,
  createInitialStoreState,
  DEFAULT_PREFERENCES,
} from "@/lib/defaultData";
import { projectEventOccurrences } from "@/lib/recurrence";
import { playAlarmSound } from "@/lib/sounds";
import { generateId, readStorage, writeStorage } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  dbClearNotifications,
  dbDeleteAlarm,
  dbDeleteBill,
  dbDeleteChecklist,
  dbDeleteEvent,
  dbDeleteProfile,
  dbDeleteTask,
  dbInsertNotification,
  dbMarkAllNotificationsRead,
  dbMarkNotificationRead,
  dbUpdateSettings,
  dbUpsertAlarm,
  dbUpsertBill,
  dbUpsertChecklist,
  dbUpsertEvent,
  dbUpsertProfile,
  dbUpsertTask,
  fetchAllCalendarTables,
  seedAllCalendarTables,
  subscribeToCalendarTables,
} from "@/lib/supabase/db";
import {
  deleteIconFromSupabase,
  uploadIconToSupabase,
} from "@/lib/supabase/sync";
import { inferVisualIcon } from "@/lib/visualIcons";
import type {
  AlarmItem,
  NotificationItem,
  ReminderPreferences,
} from "@/types/alarms";
import type { RecurringBill } from "@/types/bills";
import type { CalendarEvent, Profile } from "@/types/calendar";
import type { Checklist, TaskItem } from "@/types/tasks";

const LEGACY_STORAGE_KEY = "calendario_hub_data_v1";

export type QuickAddTab = "event" | "task" | "bill" | "alarm";

export interface QuickAddState {
  open: boolean;
  tab: QuickAddTab;
  defaultDate?: string;
}

export interface RingingAlarm {
  alarm: AlarmItem;
  triggeredAt: string;
}

export interface ActiveReminderPopup {
  id: string;
  title: string;
  body: string;
  icon: string;
  link?: string;
}

interface CalendarDataContextValue {
  hydrated: boolean;
  profiles: Profile[];
  events: CalendarEvent[];
  tasks: TaskItem[];
  checklists: Checklist[];
  bills: RecurringBill[];
  alarms: AlarmItem[];
  notifications: NotificationItem[];
  preferences: ReminderPreferences;
  showBillsOnCalendar: boolean;
  showTasksOnCalendar: boolean;
  unreadNotificationsCount: number;
  ringingAlarm: RingingAlarm | null;
  activeReminder: ActiveReminderPopup | null;
  quickAdd: QuickAddState;

  openQuickAdd: (tab?: QuickAddTab, defaultDate?: string) => void;
  closeQuickAdd: () => void;

  setShowBillsOnCalendar: (value: boolean) => void;
  setShowTasksOnCalendar: (value: boolean) => void;

  addProfile: (profile: Omit<Profile, "id">) => void;
  updateProfile: (id: string, patch: Partial<Omit<Profile, "id">>) => void;
  deleteProfile: (id: string) => void;
  toggleProfileVisibility: (id: string) => void;
  showAllProfiles: () => void;

  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  updateEvent: (id: string, patch: Partial<Omit<CalendarEvent, "id">>) => void;
  deleteEvent: (id: string) => void;

  addTask: (task: Omit<TaskItem, "id" | "createdAt">) => void;
  updateTask: (id: string, patch: Partial<Omit<TaskItem, "id">>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  addChecklist: (checklist: Omit<Checklist, "id">) => void;
  updateChecklist: (id: string, patch: Partial<Omit<Checklist, "id">>) => void;
  deleteChecklist: (id: string) => void;
  toggleChecklistStep: (checklistId: string, stepId: string) => void;
  addChecklistStep: (checklistId: string, label: string) => void;
  removeChecklistStep: (checklistId: string, stepId: string) => void;
  resetChecklist: (checklistId: string) => void;

  addBill: (bill: Omit<RecurringBill, "id" | "paidOccurrences">) => void;
  updateBill: (id: string, patch: Partial<Omit<RecurringBill, "id">>) => void;
  deleteBill: (id: string) => void;
  toggleBillPaid: (billId: string, occurrenceKey: string) => void;

  addAlarm: (alarm: Omit<AlarmItem, "id">) => void;
  updateAlarm: (id: string, patch: Partial<Omit<AlarmItem, "id">>) => void;
  toggleAlarm: (id: string) => void;
  deleteAlarm: (id: string) => void;
  dismissRingingAlarm: () => void;
  snoozeRingingAlarm: () => void;
  triggerAlarmTest: (alarm: AlarmItem) => void;
  dismissActiveReminder: () => void;

  updatePreferences: (patch: Partial<ReminderPreferences>) => void;
  pushNotification: (
    item: Omit<NotificationItem, "id" | "timestamp" | "read">,
  ) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  resetDemoData: () => void;
}

const CalendarDataContext = createContext<CalendarDataContextValue | null>(
  null,
);

const EMPTY_SSR_STATE: CalendarStoreState = {
  profiles: [],
  events: [],
  tasks: [],
  checklists: [],
  bills: [],
  alarms: [],
  notifications: [],
  preferences: DEFAULT_PREFERENCES,
  showBillsOnCalendar: true,
  showTasksOnCalendar: true,
};

function applyScheduledChecklistResets(
  checklists: Checklist[],
  now: Date,
): { lists: Checklist[]; changed: Checklist[] } {
  const todayKey = toDateKey(now);
  const weekKey = getCurrentWeekKey(now);
  const changed: Checklist[] = [];

  const lists = checklists.map((list) => {
    if (list.resetSchedule === "daily" && list.lastResetKey !== todayKey) {
      const updated = {
        ...list,
        lastResetKey: todayKey,
        steps: list.steps.map((s) => ({ ...s, done: false })),
      };
      changed.push(updated);
      return updated;
    }
    if (list.resetSchedule === "weekly" && list.lastResetKey !== weekKey) {
      const updated = {
        ...list,
        lastResetKey: weekKey,
        steps: list.steps.map((s) => ({ ...s, done: false })),
      };
      changed.push(updated);
      return updated;
    }
    return list;
  });

  return { lists, changed };
}

export function CalendarDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CalendarStoreState>(EMPTY_SSR_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [ringingAlarm, setRingingAlarm] = useState<RingingAlarm | null>(null);
  const [activeReminder, setActiveReminder] =
    useState<ActiveReminderPopup | null>(null);
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    open: false,
    tab: "event",
  });

  const stateRef = useRef<CalendarStoreState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const lastTriggeredAlarmKeysRef = useRef<Set<string>>(new Set());
  const lastTriggeredReminderKeysRef = useRef<Set<string>>(new Set());

  // Carga inicial: Supabase es la única fuente de verdad (sin duplicar datos en localStorage)
  useEffect(() => {
    let active = true;
    const id = window.setTimeout(() => {
      const now = new Date();
      const useDb = isSupabaseConfigured();

      if (!useDb) {
        // Fallback solo si el proyecto corre sin variables de Supabase
        const stored = readStorage<CalendarStoreState | null>(
          LEGACY_STORAGE_KEY,
          null,
        );
        const initial =
          stored && stored.profiles?.length
            ? stored
            : createInitialStoreState();
        setState(initial);
        setHydrated(true);
        return;
      }

      void fetchAllCalendarTables().then(async (remote) => {
        if (!active) return;

        if (remote && remote.profiles.length > 0) {
          const { lists, changed } = applyScheduledChecklistResets(
            remote.checklists,
            now,
          );
          if (changed.length > 0) {
            await Promise.all(changed.map((cl) => dbUpsertChecklist(cl)));
          }
          setState({ ...remote, checklists: lists });
          // Limpiar datos antiguos de localStorage para usar solo la BD
          try {
            window.localStorage.removeItem(LEGACY_STORAGE_KEY);
          } catch {}
          setHydrated(true);
          return;
        }

        // BD vacía: iniciar limpio (solo con 1 perfil base, sin eventos/tareas/pagos de ejemplo)
        const cleanInitial = createInitialStoreState();
        setState(cleanInitial);
        setHydrated(true);
        await seedAllCalendarTables(cleanInitial);
        try {
          window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {}
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(id);
    };
  }, []);

  // Solo guardar en localStorage si NO hay Supabase configurado
  useEffect(() => {
    if (!hydrated || isSupabaseConfigured()) return;
    writeStorage(LEGACY_STORAGE_KEY, state);
  }, [state, hydrated]);

  // Suscripción Realtime a las 8 tablas para sincronizar cambios de otros familiares al instante
  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured()) return;
    let debounceTimer: number | null = null;

    const unsubscribe = subscribeToCalendarTables(() => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void fetchAllCalendarTables().then((remote) => {
          if (remote && remote.profiles.length > 0) {
            setState(remote);
          }
        });
      }, 250);
    });

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [hydrated]);

  // Motor en vivo de Alarmas + Recordatorios de Eventos y Tareas (cada 15 segundos)
  useEffect(() => {
    if (!hydrated) return;

    const checkAlarmsAndReminders = () => {
      const now = new Date();
      const hhmm = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const dow = now.getDay();
      const dateKey = toDateKey(now);

      for (const alarm of state.alarms) {
        if (!alarm.enabled || alarm.time !== hhmm) continue;
        const matchesDay = alarm.days.length === 0 || alarm.days.includes(dow);
        if (!matchesDay) continue;

        const triggerKey = `${alarm.id}:${dateKey}:${hhmm}`;
        if (lastTriggeredAlarmKeysRef.current.has(triggerKey)) continue;
        lastTriggeredAlarmKeysRef.current.add(triggerKey);

        if (state.preferences.soundEnabled) {
          playAlarmSound(alarm.sound, state.preferences.volume);
        }
        setRingingAlarm({ alarm, triggeredAt: hhmm });

        const notif: NotificationItem = {
          id: generateId("ntf"),
          title: `Alarma: ${alarm.label}`,
          body: `Programada para las ${alarm.time}`,
          timestamp: now.toISOString(),
          read: false,
          kind: "alarm",
          link: "/alarmas",
        };
        void dbInsertNotification(notif);

        if (alarm.days.length === 0) {
          void dbUpsertAlarm({ ...alarm, enabled: false });
        }

        setState((prev) => ({
          ...prev,
          alarms:
            alarm.days.length === 0
              ? prev.alarms.map((a) =>
                  a.id === alarm.id ? { ...a, enabled: false } : a,
                )
              : prev.alarms,
          notifications: [notif, ...prev.notifications].slice(0, 40),
        }));

        if (
          state.preferences.browserNotificationsEnabled &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          new window.Notification(`Alarma: ${alarm.label}`, {
            body: `Sonando a las ${alarm.time}`,
          });
        }
      }

      for (const event of state.events) {
        if (
          event.allDay ||
          !event.startTime ||
          event.reminderMinutes === null ||
          event.reminderMinutes === undefined
        ) {
          continue;
        }
        if (projectEventOccurrences(event, dateKey, dateKey).length === 0) {
          continue;
        }
        const [eh, em] = event.startTime.split(":").map(Number);
        if (Number.isNaN(eh) || Number.isNaN(em)) continue;
        if (nowMinutes !== eh * 60 + em - event.reminderMinutes) continue;

        const remKey = `evt:${event.id}:${dateKey}:${event.startTime}`;
        if (lastTriggeredReminderKeysRef.current.has(remKey)) continue;
        lastTriggeredReminderKeysRef.current.add(remKey);

        const icon = inferVisualIcon(event.title, "event", event.visualIcon);
        const leadText =
          event.reminderMinutes === 0
            ? `Comienza ahora (${event.startTime})`
            : `En ${event.reminderMinutes} min (${event.startTime})`;
        const body = event.location
          ? `${leadText} · ${event.location}`
          : leadText;

        if (state.preferences.soundEnabled) {
          playAlarmSound(
            state.preferences.defaultSound,
            state.preferences.volume,
          );
        }
        setActiveReminder({
          id: remKey,
          title: event.title,
          body,
          icon,
          link: "/",
        });

        const notif: NotificationItem = {
          id: generateId("ntf"),
          title: `Recordatorio: ${event.title}`,
          body,
          timestamp: now.toISOString(),
          read: false,
          kind: "event",
          link: "/",
        };
        void dbInsertNotification(notif);
        setState((prev) => ({
          ...prev,
          notifications: [notif, ...prev.notifications].slice(0, 40),
        }));

        if (
          state.preferences.browserNotificationsEnabled &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          new window.Notification(`Recordatorio: ${event.title}`, { body });
        }
      }

      for (const task of state.tasks) {
        if (task.completed || task.dueDate !== dateKey || !task.dueTime) {
          continue;
        }
        const [th, tm] = task.dueTime.split(":").map(Number);
        if (Number.isNaN(th) || Number.isNaN(tm)) continue;
        if (
          nowMinutes !==
          th * 60 + tm - state.preferences.defaultEventLeadMinutes
        ) {
          continue;
        }

        const remKey = `tsk:${task.id}:${dateKey}:${task.dueTime}`;
        if (lastTriggeredReminderKeysRef.current.has(remKey)) continue;
        lastTriggeredReminderKeysRef.current.add(remKey);

        const icon = inferVisualIcon(task.title, "task", task.visualIcon);
        const body = `Tarea programada a las ${task.dueTime}`;

        if (state.preferences.soundEnabled) {
          playAlarmSound(
            state.preferences.defaultSound,
            state.preferences.volume,
          );
        }
        setActiveReminder({
          id: remKey,
          title: task.title,
          body,
          icon,
          link: "/tareas",
        });

        const notif: NotificationItem = {
          id: generateId("ntf"),
          title: `Pendiente próximo: ${task.title}`,
          body,
          timestamp: now.toISOString(),
          read: false,
          kind: "task",
          link: "/tareas",
        };
        void dbInsertNotification(notif);
        setState((prev) => ({
          ...prev,
          notifications: [notif, ...prev.notifications].slice(0, 40),
        }));

        if (
          state.preferences.browserNotificationsEnabled &&
          typeof window !== "undefined" &&
          "Notification" in window &&
          window.Notification.permission === "granted"
        ) {
          new window.Notification(`Pendiente: ${task.title}`, { body });
        }
      }
    };

    const interval = window.setInterval(checkAlarmsAndReminders, 15_000);
    return () => window.clearInterval(interval);
  }, [hydrated, state.alarms, state.events, state.tasks, state.preferences]);

  const openQuickAdd = useCallback(
    (tab: QuickAddTab = "event", defaultDate?: string) => {
      setQuickAdd({ open: true, tab, defaultDate });
    },
    [],
  );

  const closeQuickAdd = useCallback(() => {
    setQuickAdd((prev) => ({ ...prev, open: false }));
  }, []);

  const setShowBillsOnCalendar = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, showBillsOnCalendar: value }));
    void dbUpdateSettings({ showBillsOnCalendar: value });
  }, []);

  const setShowTasksOnCalendar = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, showTasksOnCalendar: value }));
    void dbUpdateSettings({ showTasksOnCalendar: value });
  }, []);

  // Profiles
  const addProfile = useCallback((profile: Omit<Profile, "id">) => {
    const created: Profile = { ...profile, id: generateId("prf") };
    const idx = stateRef.current.profiles.length;
    setState((prev) => ({
      ...prev,
      profiles: [...prev.profiles, created],
    }));
    void dbUpsertProfile(created, idx);
  }, []);

  const updateProfile = useCallback(
    (id: string, patch: Partial<Omit<Profile, "id">>) => {
      const idx = stateRef.current.profiles.findIndex((p) => p.id === id);
      const current = stateRef.current.profiles[idx];
      if (!current) return;
      const updated = { ...current, ...patch };
      if (current.customImage && updated.customImage !== current.customImage) {
        void deleteIconFromSupabase(current.customImage);
      }
      setState((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) => (p.id === id ? updated : p)),
      }));
      void dbUpsertProfile(updated, idx);
    },
    [],
  );

  const deleteProfile = useCallback((id: string) => {
    const cur = stateRef.current;
    if (cur.profiles.length <= 1) return;
    const targetProfile = cur.profiles.find((p) => p.id === id);
    if (targetProfile?.customImage) {
      void deleteIconFromSupabase(targetProfile.customImage);
    }
    const remaining = cur.profiles.filter((p) => p.id !== id);
    const fallbackId = remaining[0]?.id ?? "";

    const movedEvents = cur.events
      .filter((e) => e.profileId === id)
      .map((e) => ({ ...e, profileId: fallbackId }));
    const movedTasks = cur.tasks
      .filter((t) => t.profileId === id)
      .map((t) => ({ ...t, profileId: fallbackId }));
    const movedChecklists = cur.checklists
      .filter((cl) => cl.profileId === id)
      .map((cl) => ({ ...cl, profileId: fallbackId }));

    setState((prev) => ({
      ...prev,
      profiles: remaining,
      events: prev.events.map((e) =>
        e.profileId === id ? { ...e, profileId: fallbackId } : e,
      ),
      tasks: prev.tasks.map((t) =>
        t.profileId === id ? { ...t, profileId: fallbackId } : t,
      ),
      checklists: prev.checklists.map((cl) =>
        cl.profileId === id ? { ...cl, profileId: fallbackId } : cl,
      ),
    }));

    void dbDeleteProfile(id);
    movedEvents.forEach((e) => void dbUpsertEvent(e));
    movedTasks.forEach((t) => void dbUpsertTask(t));
    movedChecklists.forEach((cl) => void dbUpsertChecklist(cl));
  }, []);

  const toggleProfileVisibility = useCallback((id: string) => {
    const idx = stateRef.current.profiles.findIndex((p) => p.id === id);
    const current = stateRef.current.profiles[idx];
    if (!current) return;
    const updated = { ...current, visible: !current.visible };
    setState((prev) => ({
      ...prev,
      profiles: prev.profiles.map((p) => (p.id === id ? updated : p)),
    }));
    void dbUpsertProfile(updated, idx);
  }, []);

  const showAllProfiles = useCallback(() => {
    const updatedProfiles = stateRef.current.profiles.map((p) => ({
      ...p,
      visible: true,
    }));
    setState((prev) => ({
      ...prev,
      showBillsOnCalendar: true,
      showTasksOnCalendar: true,
      profiles: updatedProfiles,
    }));
    updatedProfiles.forEach((p, idx) => void dbUpsertProfile(p, idx));
    void dbUpdateSettings({
      showBillsOnCalendar: true,
      showTasksOnCalendar: true,
    });
  }, []);

  // Events
  const addEvent = useCallback((event: Omit<CalendarEvent, "id">) => {
    const id = generateId("evt");
    const created: CalendarEvent = { ...event, id };
    const notif: NotificationItem = {
      id: generateId("ntf"),
      title: "Evento agendado",
      body: `${event.title} · ${event.date}${event.startTime ? ` a las ${event.startTime}` : ""}`,
      timestamp: new Date().toISOString(),
      read: true,
      kind: "event",
      link: "/",
    };
    setState((prev) => ({
      ...prev,
      events: [...prev.events, created],
      notifications: [notif, ...prev.notifications].slice(0, 40),
    }));
    void (async () => {
      let finalEvent = created;
      if (created.visualIcon?.startsWith("data:image/")) {
        const url = await uploadIconToSupabase(created.visualIcon, "item");
        finalEvent = { ...created, visualIcon: url };
        setState((prev) => ({
          ...prev,
          events: prev.events.map((e) => (e.id === id ? finalEvent : e)),
        }));
      }
      await dbUpsertEvent(finalEvent);
    })();
    void dbInsertNotification(notif);
  }, []);

  const updateEvent = useCallback(
    (id: string, patch: Partial<Omit<CalendarEvent, "id">>) => {
      const current = stateRef.current.events.find((e) => e.id === id);
      if (!current) return;
      const updated = { ...current, ...patch };
      if (current.visualIcon && updated.visualIcon !== current.visualIcon) {
        void deleteIconFromSupabase(current.visualIcon);
      }
      setState((prev) => ({
        ...prev,
        events: prev.events.map((e) => (e.id === id ? updated : e)),
      }));
      void dbUpsertEvent(updated);
    },
    [],
  );

  const deleteEvent = useCallback((id: string) => {
    const target = stateRef.current.events.find((e) => e.id === id);
    if (target?.visualIcon) {
      void deleteIconFromSupabase(target.visualIcon);
    }
    setState((prev) => ({
      ...prev,
      events: prev.events.filter((e) => e.id !== id),
    }));
    void dbDeleteEvent(id);
  }, []);

  // Tasks
  const addTask = useCallback((task: Omit<TaskItem, "id" | "createdAt">) => {
    const id = generateId("tsk");
    const created: TaskItem = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, tasks: [created, ...prev.tasks] }));
    void (async () => {
      let finalTask = created;
      if (created.visualIcon?.startsWith("data:image/")) {
        const url = await uploadIconToSupabase(created.visualIcon, "item");
        finalTask = { ...created, visualIcon: url };
        setState((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) => (t.id === id ? finalTask : t)),
        }));
      }
      await dbUpsertTask(finalTask);
    })();
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Omit<TaskItem, "id">>) => {
      const current = stateRef.current.tasks.find((t) => t.id === id);
      if (!current) return;
      const updated = { ...current, ...patch };
      if (current.visualIcon && updated.visualIcon !== current.visualIcon) {
        void deleteIconFromSupabase(current.visualIcon);
      }
      setState((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
      }));
      void dbUpsertTask(updated);
    },
    [],
  );

  const toggleTask = useCallback((id: string) => {
    const current = stateRef.current.tasks.find((t) => t.id === id);
    if (!current) return;
    const updated = { ...current, completed: !current.completed };
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? updated : t)),
    }));
    void dbUpsertTask(updated);
  }, []);

  const deleteTask = useCallback((id: string) => {
    const target = stateRef.current.tasks.find((t) => t.id === id);
    if (target?.visualIcon) {
      void deleteIconFromSupabase(target.visualIcon);
    }
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
    void dbDeleteTask(id);
  }, []);

  // Checklists
  const addChecklist = useCallback((checklist: Omit<Checklist, "id">) => {
    const created: Checklist = {
      ...checklist,
      id: generateId("chk"),
      lastResetKey: toDateKey(new Date()),
    };
    setState((prev) => ({
      ...prev,
      checklists: [...prev.checklists, created],
    }));
    void dbUpsertChecklist(created);
  }, []);

  const updateChecklist = useCallback(
    (id: string, patch: Partial<Omit<Checklist, "id">>) => {
      const current = stateRef.current.checklists.find((cl) => cl.id === id);
      if (!current) return;
      const updated = { ...current, ...patch };
      setState((prev) => ({
        ...prev,
        checklists: prev.checklists.map((cl) => (cl.id === id ? updated : cl)),
      }));
      void dbUpsertChecklist(updated);
    },
    [],
  );

  const deleteChecklist = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      checklists: prev.checklists.filter((cl) => cl.id !== id),
    }));
    void dbDeleteChecklist(id);
  }, []);

  const toggleChecklistStep = useCallback(
    (checklistId: string, stepId: string) => {
      const current = stateRef.current.checklists.find(
        (cl) => cl.id === checklistId,
      );
      if (!current) return;
      const updated: Checklist = {
        ...current,
        steps: current.steps.map((s) =>
          s.id === stepId ? { ...s, done: !s.done } : s,
        ),
      };
      setState((prev) => ({
        ...prev,
        checklists: prev.checklists.map((cl) =>
          cl.id === checklistId ? updated : cl,
        ),
      }));
      void dbUpsertChecklist(updated);
    },
    [],
  );

  const addChecklistStep = useCallback((checklistId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const current = stateRef.current.checklists.find(
      (cl) => cl.id === checklistId,
    );
    if (!current) return;
    const updated: Checklist = {
      ...current,
      steps: [
        ...current.steps,
        { id: generateId("st"), label: trimmed, done: false },
      ],
    };
    setState((prev) => ({
      ...prev,
      checklists: prev.checklists.map((cl) =>
        cl.id === checklistId ? updated : cl,
      ),
    }));
    void dbUpsertChecklist(updated);
  }, []);

  const removeChecklistStep = useCallback(
    (checklistId: string, stepId: string) => {
      const current = stateRef.current.checklists.find(
        (cl) => cl.id === checklistId,
      );
      if (!current) return;
      const updated: Checklist = {
        ...current,
        steps: current.steps.filter((s) => s.id !== stepId),
      };
      setState((prev) => ({
        ...prev,
        checklists: prev.checklists.map((cl) =>
          cl.id === checklistId ? updated : cl,
        ),
      }));
      void dbUpsertChecklist(updated);
    },
    [],
  );

  const resetChecklist = useCallback((checklistId: string) => {
    const current = stateRef.current.checklists.find(
      (cl) => cl.id === checklistId,
    );
    if (!current) return;
    const updated: Checklist = {
      ...current,
      lastResetKey: toDateKey(new Date()),
      steps: current.steps.map((s) => ({ ...s, done: false })),
    };
    setState((prev) => ({
      ...prev,
      checklists: prev.checklists.map((cl) =>
        cl.id === checklistId ? updated : cl,
      ),
    }));
    void dbUpsertChecklist(updated);
  }, []);

  // Bills
  const addBill = useCallback(
    (bill: Omit<RecurringBill, "id" | "paidOccurrences">) => {
      const id = generateId("bill");
      const created: RecurringBill = {
        ...bill,
        id,
        paidOccurrences: [],
      };
      setState((prev) => ({ ...prev, bills: [...prev.bills, created] }));
      void (async () => {
        let finalBill = created;
        if (created.visualIcon?.startsWith("data:image/")) {
          const url = await uploadIconToSupabase(created.visualIcon, "item");
          finalBill = { ...created, visualIcon: url };
          setState((prev) => ({
            ...prev,
            bills: prev.bills.map((b) => (b.id === id ? finalBill : b)),
          }));
        }
        await dbUpsertBill(finalBill);
      })();
    },
    [],
  );

  const updateBill = useCallback(
    (id: string, patch: Partial<Omit<RecurringBill, "id">>) => {
      const current = stateRef.current.bills.find((b) => b.id === id);
      if (!current) return;
      const updated = { ...current, ...patch };
      if (current.visualIcon && updated.visualIcon !== current.visualIcon) {
        void deleteIconFromSupabase(current.visualIcon);
      }
      setState((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === id ? updated : b)),
      }));
      void (async () => {
        let finalBill = updated;
        if (updated.visualIcon?.startsWith("data:image/")) {
          const url = await uploadIconToSupabase(updated.visualIcon, "item");
          finalBill = { ...updated, visualIcon: url };
          setState((prev) => ({
            ...prev,
            bills: prev.bills.map((b) => (b.id === id ? finalBill : b)),
          }));
        }
        await dbUpsertBill(finalBill);
      })();
    },
    [],
  );

  const deleteBill = useCallback((id: string) => {
    const target = stateRef.current.bills.find((b) => b.id === id);
    if (target?.visualIcon) {
      void deleteIconFromSupabase(target.visualIcon);
    }
    setState((prev) => ({
      ...prev,
      bills: prev.bills.filter((b) => b.id !== id),
    }));
    void dbDeleteBill(id);
  }, []);

  const toggleBillPaid = useCallback(
    (billId: string, occurrenceKey: string) => {
      const current = stateRef.current.bills.find((b) => b.id === billId);
      if (!current) return;
      const exists = current.paidOccurrences.includes(occurrenceKey);
      const updated: RecurringBill = {
        ...current,
        paidOccurrences: exists
          ? current.paidOccurrences.filter((k) => k !== occurrenceKey)
          : [...current.paidOccurrences, occurrenceKey],
      };
      setState((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === billId ? updated : b)),
      }));
      void dbUpsertBill(updated);
    },
    [],
  );

  // Alarms
  const addAlarm = useCallback((alarm: Omit<AlarmItem, "id">) => {
    const created: AlarmItem = { ...alarm, id: generateId("alm") };
    setState((prev) => ({ ...prev, alarms: [...prev.alarms, created] }));
    void dbUpsertAlarm(created);
  }, []);

  const updateAlarm = useCallback(
    (id: string, patch: Partial<Omit<AlarmItem, "id">>) => {
      const current = stateRef.current.alarms.find((a) => a.id === id);
      if (!current) return;
      const updated = { ...current, ...patch };
      setState((prev) => ({
        ...prev,
        alarms: prev.alarms.map((a) => (a.id === id ? updated : a)),
      }));
      void dbUpsertAlarm(updated);
    },
    [],
  );

  const toggleAlarm = useCallback((id: string) => {
    const current = stateRef.current.alarms.find((a) => a.id === id);
    if (!current) return;
    const updated = { ...current, enabled: !current.enabled };
    setState((prev) => ({
      ...prev,
      alarms: prev.alarms.map((a) => (a.id === id ? updated : a)),
    }));
    void dbUpsertAlarm(updated);
  }, []);

  const deleteAlarm = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      alarms: prev.alarms.filter((a) => a.id !== id),
    }));
    void dbDeleteAlarm(id);
  }, []);

  const dismissRingingAlarm = useCallback(() => {
    setRingingAlarm(null);
  }, []);

  const snoozeRingingAlarm = useCallback(() => {
    setRingingAlarm((current) => {
      if (!current) return null;
      const snoozeMin = current.alarm.snoozeMinutes || 5;
      const future = new Date(Date.now() + snoozeMin * 60_000);
      const nextTime = `${pad2(future.getHours())}:${pad2(future.getMinutes())}`;
      const notif: NotificationItem = {
        id: generateId("ntf"),
        title: `Alarma pospuesta (${snoozeMin} min)`,
        body: `${current.alarm.label} volverá a sonar a las ${nextTime}.`,
        timestamp: new Date().toISOString(),
        read: false,
        kind: "alarm",
        link: "/alarmas",
      };
      void dbInsertNotification(notif);
      setState((prev) => ({
        ...prev,
        notifications: [notif, ...prev.notifications].slice(0, 40),
      }));
      return null;
    });
  }, []);

  const triggerAlarmTest = useCallback(
    (alarm: AlarmItem) => {
      playAlarmSound(alarm.sound, state.preferences.volume);
      setRingingAlarm({ alarm, triggeredAt: alarm.time });
    },
    [state.preferences.volume],
  );

  const dismissActiveReminder = useCallback(() => {
    setActiveReminder(null);
  }, []);

  const updatePreferences = useCallback(
    (patch: Partial<ReminderPreferences>) => {
      const nextPrefs = { ...stateRef.current.preferences, ...patch };
      setState((prev) => ({ ...prev, preferences: nextPrefs }));
      void dbUpdateSettings({ preferences: nextPrefs });
    },
    [],
  );

  const pushNotification = useCallback(
    (item: Omit<NotificationItem, "id" | "timestamp" | "read">) => {
      const notif: NotificationItem = {
        ...item,
        id: generateId("ntf"),
        timestamp: new Date().toISOString(),
        read: false,
      };
      setState((prev) => ({
        ...prev,
        notifications: [notif, ...prev.notifications].slice(0, 40),
      }));
      void dbInsertNotification(notif);
    },
    [],
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
    void dbMarkNotificationRead(id);
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
    void dbMarkAllNotificationsRead();
  }, []);

  const clearNotifications = useCallback(() => {
    setState((prev) => ({ ...prev, notifications: [] }));
    void dbClearNotifications();
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createInitialStoreState();
    setState(fresh);
    if (isSupabaseConfigured()) {
      void seedAllCalendarTables(fresh);
    } else {
      writeStorage(LEGACY_STORAGE_KEY, fresh);
    }
  }, []);

  const unreadNotificationsCount = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  );

  const value = useMemo<CalendarDataContextValue>(
    () => ({
      hydrated,
      ...state,
      unreadNotificationsCount,
      ringingAlarm,
      activeReminder,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
      setShowBillsOnCalendar,
      setShowTasksOnCalendar,
      addProfile,
      updateProfile,
      deleteProfile,
      toggleProfileVisibility,
      showAllProfiles,
      addEvent,
      updateEvent,
      deleteEvent,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      addChecklist,
      updateChecklist,
      deleteChecklist,
      toggleChecklistStep,
      addChecklistStep,
      removeChecklistStep,
      resetChecklist,
      addBill,
      updateBill,
      deleteBill,
      toggleBillPaid,
      addAlarm,
      updateAlarm,
      toggleAlarm,
      deleteAlarm,
      dismissRingingAlarm,
      snoozeRingingAlarm,
      triggerAlarmTest,
      dismissActiveReminder,
      updatePreferences,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      resetDemoData,
    }),
    [
      hydrated,
      state,
      unreadNotificationsCount,
      ringingAlarm,
      activeReminder,
      quickAdd,
      openQuickAdd,
      closeQuickAdd,
      setShowBillsOnCalendar,
      setShowTasksOnCalendar,
      addProfile,
      updateProfile,
      deleteProfile,
      toggleProfileVisibility,
      showAllProfiles,
      addEvent,
      updateEvent,
      deleteEvent,
      addTask,
      updateTask,
      toggleTask,
      deleteTask,
      addChecklist,
      updateChecklist,
      deleteChecklist,
      toggleChecklistStep,
      addChecklistStep,
      removeChecklistStep,
      resetChecklist,
      addBill,
      updateBill,
      deleteBill,
      toggleBillPaid,
      addAlarm,
      updateAlarm,
      toggleAlarm,
      deleteAlarm,
      dismissRingingAlarm,
      snoozeRingingAlarm,
      triggerAlarmTest,
      dismissActiveReminder,
      updatePreferences,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
      clearNotifications,
      resetDemoData,
    ],
  );

  return (
    <CalendarDataContext.Provider value={value}>
      {children}
    </CalendarDataContext.Provider>
  );
}

export function useCalendarData(): CalendarDataContextValue {
  const ctx = useContext(CalendarDataContext);
  if (!ctx) {
    throw new Error(
      "useCalendarData debe utilizarse dentro de CalendarDataProvider",
    );
  }
  return ctx;
}
