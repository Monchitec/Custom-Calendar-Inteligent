export type AlarmSoundId =
  "chime" | "bell" | "marimba" | "sunrise" | "pulse" | "silent";

export interface AlarmItem {
  id: string;
  label: string;
  time: string; // HH:mm
  /** 0 = Dom .. 6 = Sáb. Vacío = una sola vez */
  days: number[];
  enabled: boolean;
  sound: AlarmSoundId;
  profileId?: string;
  snoozeMinutes: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  timestamp: string; // ISO
  read: boolean;
  kind: "alarm" | "bill" | "event" | "task" | "system";
  link?: string;
}

export interface ReminderPreferences {
  defaultSound: AlarmSoundId;
  volume: number; // 0..1
  soundEnabled: boolean;
  defaultEventLeadMinutes: number;
  defaultBillLeadDays: number;
  browserNotificationsEnabled: boolean;
}
