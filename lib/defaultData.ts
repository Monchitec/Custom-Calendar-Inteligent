import type {
  AlarmItem,
  NotificationItem,
  ReminderPreferences,
} from "@/types/alarms";
import type { RecurringBill } from "@/types/bills";
import type { CalendarEvent, Profile } from "@/types/calendar";
import type { Checklist, TaskItem } from "@/types/tasks";

export interface CalendarStoreState {
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
}

export const DEFAULT_PREFERENCES: ReminderPreferences = {
  defaultSound: "chime",
  volume: 0.7,
  soundEnabled: true,
  defaultEventLeadMinutes: 15,
  defaultBillLeadDays: 3,
  browserNotificationsEnabled: false,
};

export function createInitialProfiles(): Profile[] {
  return [
    {
      id: "prf_personal",
      name: "Personal",
      icon: "heart",
      colorSlot: "cat-2",
      visible: true,
    },
  ];
}

export function createInitialStoreState(): CalendarStoreState {
  return {
    profiles: createInitialProfiles(),
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
}
