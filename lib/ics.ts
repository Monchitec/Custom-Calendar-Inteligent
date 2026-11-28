import type { CalendarEvent } from "@/types/calendar";

export interface IcsEventInput {
  id?: string;
  title: string;
  date: string; // YYYY-MM-DD
  allDay?: boolean;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  location?: string;
  notes?: string;
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function unescapeIcsText(value: string): string {
  return value
    .replaceAll("\\n", "\n")
    .replaceAll("\\,", ",")
    .replaceAll("\\;", ";")
    .replaceAll("\\\\", "\\");
}

function formatIcsDate(dateKey: string): string {
  return dateKey.replaceAll("-", "");
}

function formatIcsDateTime(dateKey: string, time: string): string {
  const [hh = "09", mm = "00"] = time.split(":");
  return `${formatIcsDate(dateKey)}T${hh.padStart(2, "0")}${mm.padStart(2, "0")}00`;
}

function formatUtcStamp(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function nextDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

function buildVEventLines(ev: IcsEventInput, stamp: string): string[] {
  const uid = `${ev.id ?? Math.random().toString(36).slice(2)}@micalendario.local`;
  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:${escapeIcsText(ev.title)}`,
  ];

  if (ev.allDay || !ev.startTime) {
    lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(ev.date)}`);
    lines.push(`DTEND;VALUE=DATE:${formatIcsDate(nextDayKey(ev.date))}`);
  } else {
    const start = formatIcsDateTime(ev.date, ev.startTime);
    const end = formatIcsDateTime(ev.date, ev.endTime || ev.startTime);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
  }

  if (ev.location?.trim()) {
    lines.push(`LOCATION:${escapeIcsText(ev.location.trim())}`);
  }
  if (ev.notes?.trim()) {
    lines.push(`DESCRIPTION:${escapeIcsText(ev.notes.trim())}`);
  }

  lines.push("END:VEVENT");
  return lines;
}

export function buildIcsCalendar(events: IcsEventInput[]): string {
  const stamp = formatUtcStamp();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mi Calendario Personal//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((ev) => buildVEventLines(ev, stamp)),
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function buildIcsEvent(event: IcsEventInput): string {
  return buildIcsCalendar([event]);
}

function parseIcsDateValue(raw: string): {
  date: string;
  time?: string;
  allDay: boolean;
} | null {
  const clean = raw.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(clean);
  if (dateOnly) {
    return {
      date: `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`,
      allDay: true,
    };
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/.exec(clean);
  if (dateTime) {
    return {
      date: `${dateTime[1]}-${dateTime[2]}-${dateTime[3]}`,
      time: `${dateTime[4]}:${dateTime[5]}`,
      allDay: false,
    };
  }
  return null;
}

export function parseIcsEvents(
  icsText: string,
): Array<Omit<CalendarEvent, "id" | "profileId">> {
  const unfolded = icsText.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);

  const result: Array<Omit<CalendarEvent, "id" | "profileId">> = [];
  let current: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }
    if (line === "END:VEVENT" && current) {
      const start = current.DTSTART
        ? parseIcsDateValue(current.DTSTART)
        : null;
      if (start && current.SUMMARY?.trim()) {
        const end = current.DTEND ? parseIcsDateValue(current.DTEND) : null;
        result.push({
          title: unescapeIcsText(current.SUMMARY.trim()),
          date: start.date,
          allDay: start.allDay,
          startTime: start.allDay ? undefined : start.time,
          endTime: start.allDay ? undefined : end?.time,
          location: current.LOCATION
            ? unescapeIcsText(current.LOCATION.trim())
            : undefined,
          notes: current.DESCRIPTION
            ? unescapeIcsText(current.DESCRIPTION.trim())
            : undefined,
          recurrence: "none",
          reminderMinutes: null,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const rawKey = line.slice(0, colonIdx);
    const key = rawKey.split(";")[0]?.toUpperCase();
    const val = line.slice(colonIdx + 1);
    if (key) current[key] = val;
  }

  return result;
}
