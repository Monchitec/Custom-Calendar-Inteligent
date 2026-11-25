import type { CalendarColorSlot, ProfileColorSlot } from "./theme";

export type CalendarView = "month" | "week" | "agenda" | "day";

export type RecurrenceFrequency =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "yearly"
  | `days:${string}`;

export type ProfileIconName =
  | "briefcase"
  | "graduation-cap"
  | "stethoscope"
  | "sparkles"
  | "home"
  | "check-square"
  | "heart"
  | "star"
  | "dumbbell"
  | "car"
  | "utensils"
  | "music";

export type ProfileCurrency = "PEN" | "USD";

export interface Profile {
  id: string;
  name: string;
  icon: ProfileIconName;
  colorSlot: ProfileColorSlot;
  visible: boolean;
  /** Marca el perfil principal (no se puede eliminar y es el perfil por defecto en finanzas) */
  isPrimary?: boolean;
  /** Moneda preferida del perfil: Soles (PEN) o Dólares (USD) */
  currency?: ProfileCurrency;
  /** Correo electrónico para futuras notificaciones */
  email?: string;
  /** Teléfono / WhatsApp para futuras notificaciones */
  phone?: string;
  /** Imagen personalizada (URL de Storage o data URL) subida por el usuario para identificar el perfil */
  customImage?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  allDay: boolean;
  profileId: string;
  visualIcon?: string;
  location?: string;
  notes?: string;
  recurrence: RecurrenceFrequency;
  reminderMinutes: number | null;
  completed?: boolean;
  /** Fechas (YYYY-MM-DD) excluidas de un evento repetitivo */
  excludedDates?: string[];
}

export interface ProjectedCalendarItem {
  id: string;
  source: "event" | "bill" | "task";
  sourceId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  colorSlot: CalendarColorSlot;
  profileId: string;
  profileLabel: string;
  visualIcon?: string;
  location?: string;
  notes?: string;
  amount?: number;
  currency?: string;
  billPaid?: boolean;
  completed?: boolean;
  recurrence?: RecurrenceFrequency;
  reminderMinutes?: number | null;
}
