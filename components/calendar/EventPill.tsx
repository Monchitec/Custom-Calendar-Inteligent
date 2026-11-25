"use client";

import { Bell, Check, Edit3, Repeat, Trash2 } from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/dates";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

interface EventPillProps {
  item: ProjectedCalendarItem;
  compact?: boolean;
  showActions?: boolean;
  onClick: (item: ProjectedCalendarItem) => void;
  onDelete?: (item: ProjectedCalendarItem) => void;
}

export function EventPill({
  item,
  compact = false,
  showActions = false,
  onClick,
  onDelete,
}: EventPillProps) {
  const { toggleTask } = useCalendarData();
  const slot = getProfileSlotClasses(item.colorSlot);
  const isDone = item.completed || item.billPaid;
  const visual = inferVisualIcon(item.title, item.source, item.visualIcon);

  // Superficies diferenciadas con fondos especiales (cero cajas blancas vacías):
  // - Evento: relleno pastel de categoría
  // - Tarea: fondo especial de nota/checklist (surface + borde izq secondary, o verde al completar)
  // - Pago: fondo especial de recibo cálido (warning-soft, o verde al pagar)
  const surfaceClass =
    item.source === "task"
      ? item.completed
        ? "bg-success-soft/45 border border-success/30 border-l-4 border-l-success text-foreground"
        : "bg-surface/90 border border-secondary/25 border-l-4 border-l-secondary text-foreground hover:bg-surface"
      : item.source === "bill"
        ? item.billPaid
          ? "bg-success-soft/45 border border-success/35 border-l-4 border-l-success text-foreground"
          : "bg-warning-soft/55 border border-warning/35 border-l-4 border-l-cat-bills text-foreground hover:brightness-98"
        : cn("border-l-4 hover:brightness-96", slot.block);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick(item);
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-2 rounded-xl text-left transition-all",
        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
        compact ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs",
        surfaceClass,
        isDone && "opacity-75",
      )}
    >
      {/* Cuadro de checklist táctil interactivo para Tareas */}
      {item.source === "task" && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleTask(item.sourceId);
          }}
          aria-label={
            item.completed
              ? `Reabrir tarea ${item.title}`
              : `Completar tarea ${item.title}`
          }
          className={cn(
            "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 transition-all",
            item.completed
              ? "border-success bg-success text-primary-foreground"
              : "border-secondary/60 bg-card hover:border-secondary hover:bg-secondary-soft text-transparent",
          )}
        >
          <Check className="h-3 w-3 stroke-[3]" />
        </button>
      )}

      {/* Hora SIEMPRE a la izquierda antes del título */}
      {!item.allDay && item.startTime && (
        <span className="text-foreground/75 shrink-0 font-mono text-[11px] font-extrabold tabular-nums">
          {item.startTime}
        </span>
      )}

      {/* Imagen subida o sticker visual */}
      <VisualThumb
        value={visual}
        alt={item.title}
        sizeClass={compact ? "h-4 w-4" : "h-5 w-5"}
        textClass={compact ? "text-xs" : "text-base"}
      />

      <span
        className={cn(
          "text-foreground min-w-0 flex-1 truncate font-bold",
          isDone && "line-through",
        )}
      >
        {item.title}
      </span>

      {/* Indicador de categoría sutil en Tareas */}
      {item.source === "task" && !compact && (
        <span className="bg-muted text-muted-foreground inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold">
          <span className={cn("h-1.5 w-1.5 rounded-full", slot.dot)} />
          Tarea
        </span>
      )}

      {/* Insignia financiera destacada solo para Pagos */}
      {item.source === "bill" && typeof item.amount === "number" && (
        <span
          className={cn(
            "shrink-0 rounded-lg px-2 py-0.5 font-extrabold tabular-nums",
            item.billPaid
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning",
          )}
        >
          {formatCurrency(item.amount, item.currency, compact)}
        </span>
      )}

      {!compact &&
        !showActions &&
        item.source === "event" &&
        item.reminderMinutes !== null &&
        item.reminderMinutes !== undefined && (
          <Bell
            className="text-primary h-3 w-3 shrink-0 opacity-75"
            aria-label="Tiene recordatorio activo"
          />
        )}

      {!compact &&
        !showActions &&
        item.recurrence &&
        item.recurrence !== "none" && (
          <Repeat className="h-3 w-3 shrink-0 opacity-65" aria-hidden="true" />
        )}

      {showActions && (
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClick(item);
            }}
            aria-label={`Editar ${item.title}`}
            title="Editar"
            className="text-muted-foreground hover:bg-card hover:text-foreground flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg transition-colors"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              aria-label={`Eliminar ${item.title}`}
              title="Eliminar"
              className="text-muted-foreground hover:bg-danger-soft hover:text-danger flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
