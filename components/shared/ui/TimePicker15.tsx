"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Clock, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(23 * 60 + 45, totalMinutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatTime12h(hhmm: string): string {
  if (!hhmm) return "";
  const [hRaw, mRaw] = hhmm.split(":").map(Number);
  if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm;
  const period = hRaw >= 12 ? "PM" : "AM";
  const h12 = hRaw % 12 === 0 ? 12 : hRaw % 12;
  return `${String(h12).padStart(2, "0")}:${String(mRaw).padStart(2, "0")} ${period}`;
}

export function formatDurationBadge(diffMinutes: number): string {
  if (diffMinutes <= 0) return "";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

const ALL_SLOTS_15: string[] = Array.from({ length: 96 }, (_, idx) =>
  minutesToTime(idx * 15),
);

interface TimePicker15Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  /** Si se indica, filtra opciones posteriores a esta hora y muestra la duración (estilo Google Calendar) */
  minTime?: string;
  /** Permite dejar la hora vacía (útil para tareas con hora opcional) */
  allowEmpty?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

export function TimePicker15({
  id,
  value,
  onChange,
  minTime,
  allowEmpty = false,
  placeholder = "Seleccionar hora",
  ariaLabel,
}: TimePicker15Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const minMinutes = minTime ? timeToMinutes(minTime) : null;

  const options = useMemo(() => {
    if (minMinutes === null) return ALL_SLOTS_15;
    return ALL_SLOTS_15.filter((slot) => timeToMinutes(slot) > minMinutes);
  }, [minMinutes]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Auto-scroll hacia la hora seleccionada al abrir
  useEffect(() => {
    if (!open || !listRef.current) return;
    const activeEl = listRef.current.querySelector<HTMLElement>(
      '[data-selected="true"]',
    );
    if (activeEl) {
      activeEl.scrollIntoView({ block: "center" });
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "border-border bg-background text-foreground hover:bg-card-hover flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold tabular-nums transition-all",
          "focus:border-primary focus:ring-primary/25 focus:ring-2 focus:outline-none",
          open && "border-primary ring-primary/25 ring-2",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Clock className="text-primary h-4 w-4 shrink-0" />
          <span
            className={cn(
              "truncate",
              !value && "text-muted-foreground font-normal",
            )}
          >
            {value ? formatTime12h(value) : placeholder}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {allowEmpty && value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpiar hora"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-0.5 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="border-border bg-card absolute right-0 left-0 z-50 mt-1.5 max-h-56 overflow-y-auto rounded-2xl border p-1.5 shadow-xl"
        >
          {allowEmpty && (
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className={cn(
                "flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-semibold transition-colors",
                value === ""
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-card-hover hover:text-foreground",
              )}
            >
              <span>Sin hora específica</span>
              {value === "" && <Check className="h-3.5 w-3.5" />}
            </button>
          )}

          {options.map((slot) => {
            const selected = slot === value;
            const duration =
              minMinutes !== null
                ? formatDurationBadge(timeToMinutes(slot) - minMinutes)
                : "";

            return (
              <button
                key={slot}
                type="button"
                role="option"
                aria-selected={selected}
                data-selected={selected ? "true" : undefined}
                onClick={() => {
                  onChange(slot);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold tabular-nums transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-foreground hover:bg-primary-soft/60",
                )}
              >
                <span>{formatTime12h(slot)}</span>
                <span className="flex items-center gap-1.5">
                  {duration && (
                    <span
                      className={cn(
                        "text-[11px] font-semibold",
                        selected
                          ? "text-primary-foreground/85"
                          : "text-muted-foreground",
                      )}
                    >
                      {duration}
                    </span>
                  )}
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
