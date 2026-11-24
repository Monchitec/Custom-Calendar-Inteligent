export type TaskPriority = "low" | "medium" | "high";

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  profileId: string;
  visualIcon?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  notes?: string;
  showOnCalendar: boolean;
  createdAt: string;
}

export interface ChecklistStep {
  id: string;
  label: string;
  done: boolean;
  visualIcon?: string;
}

export type ChecklistResetSchedule = "none" | "daily" | "weekly";

export interface Checklist {
  id: string;
  title: string;
  description?: string;
  profileId: string;
  resetSchedule: ChecklistResetSchedule;
  lastResetKey?: string;
  steps: ChecklistStep[];
}
