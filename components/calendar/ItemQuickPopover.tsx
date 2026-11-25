"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Edit3,
  MapPin,
  Maximize2,
  Trash2,
  X,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { VisualThumb } from "@/components/shared/ui/VisualThumb";
import { cn } from "@/lib/cn";
import {
  formatCurrency,
  formatDateWithWeekday,
  formatTimeDisplay,
} from "@/lib/dates";
import { getBillOccurrenceKey } from "@/lib/recurrence";
import { getProfileSlotClasses } from "@/lib/themes";
import { inferVisualIcon } from "@/lib/visualIcons";
import type { ProjectedCalendarItem } from "@/types/calendar";

export interface PopoverAnchorRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface ItemQuickPopoverProps {
  item: ProjectedCalendarItem | null;
  anchorRect: PopoverAnchorRect | null;
  onClose: () => void;
  onOpenFullModal: (item: ProjectedCalendarItem, startEditing: boolean) => void;
}

const POPOVER_WIDTH = 330;
const POPOVER_EST_HEIGHT = 215;
const GAP = 12;
const VIEWPORT_PAD = 12;

export function ItemQuickPopover({
  item,
  anchorRect,
  onClose,
  onOpenFullModal,
}: ItemQuickPopoverProps) {
  const {
    profiles,
    events,
    bills,
    updateEvent,
    deleteEvent,
    deleteTask,
    toggleTask,
    toggleBillPaid,
  } = useCalendarData();
  const cardRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteItemId, setConfirmDeleteItemId] = useState<string | null>(
    null,
  );
  const confirmDeleteRecurring = confirmDeleteItemId === item?.id;

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handlePointerDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      window.addEventListener("mousedown", handlePointerDown);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [item, onClose]);

  const placement = useMemo(() => {
    if (!anchorRect || typeof window === "undefined") {
      return {
        top: 120,
        left: 120,
        side: "right" as const,
        arrowTop: 32,
      };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = Math.min(POPOVER_WIDTH, vw - VIEWPORT_PAD * 2);

    const spaceRight = vw - anchorRect.right;
    const spaceLeft = anchorRect.left;

    // Preferimos a la derecha; si está pegado al borde derecho, abrimos al lado opuesto (izquierda)
    let side: "right" | "left" = "right";
    let left = anchorRect.right + GAP;

    if (spaceRight < width + GAP + VIEWPORT_PAD && spaceLeft >= width + GAP + VIEWPORT_PAD) {
      side = "left";
      left = anchorRect.left - width - GAP;
    } else if (spaceRight < width + GAP + VIEWPORT_PAD) {
      side = spaceLeft > spaceRight ? "left" : "right";
      left = Math.max(
        VIEWPORT_PAD,
        Math.min(vw - width - VIEWPORT_PAD, anchorRect.left),
      );
    }

    const rawTop = anchorRect.top - 14;
    const top = Math.max(
      VIEWPORT_PAD,
      Math.min(vh - POPOVER_EST_HEIGHT - VIEWPORT_PAD, rawTop),
    );

    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const arrowTop = Math.max(20, Math.min(140, anchorCenterY - top));

    return { top, left, side, arrowTop, width };
  }, [anchorRect]);

  if (!item || !anchorRect) return null;

  const profile = profiles.find((p) => p.id === item.profileId);
  const slot = getProfileSlotClasses(item.colorSlot);
  const visualIcon = inferVisualIcon(item.title, item.source, item.visualIcon);
  const sourceBill =
    item.source === "bill"
      ? bills.find((b) => b.id === item.sourceId)
      : undefined;

  const subtitleText =
    item.source === "bill"
      ? `${formatDateWithWeekday(item.date)} · ${formatCurrency(item.amount ?? 0, item.currency)} · ${
          item.billPaid ? "Pagado" : "Pendiente"
        }`
      : item.allDay || !item.startTime
        ? `${formatDateWithWeekday(item.date)} · Todo el día`
        : `${formatDateWithWeekday(item.date)}, de ${formatTimeDisplay(item.startTime)}${
            item.endTime ? ` a ${formatTimeDisplay(item.endTime)}` : ""
          }`;

  const isRecurringEvent = Boolean(
    item.source === "event" && item.recurrence && item.recurrence !== "none",
  );

  const handleDelete = () => {
    if (item.source === "event") {
      if (isRecurringEvent && !confirmDeleteRecurring) {
        setConfirmDeleteItemId(item.id);
        return;
      }
      deleteEvent(item.sourceId);
      setConfirmDeleteItemId(null);
      onClose();
    } else if (item.source === "task") {
      deleteTask(item.sourceId);
      onClose();
    }
  };

  const handleDeleteSingleOccurrence = () => {
    const sourceEvent = events.find((e) => e.id === item.sourceId);
    if (!sourceEvent) return;
    const prevExcluded = sourceEvent.excludedDates ?? [];
    if (!prevExcluded.includes(item.date)) {
      updateEvent(sourceEvent.id, {
        excludedDates: [...prevExcluded, item.date],
      });
    }
    setConfirmDeleteItemId(null);
    onClose();
  };

  const handleToggleBill = () => {
    if (!sourceBill) return;
    const occKey = getBillOccurrenceKey(sourceBill, item.date);
    toggleBillPaid(sourceBill.id, occKey);
    onClose();
  };

  const handleToggleTask = () => {
    toggleTask(item.sourceId);
    onClose();
  };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Detalle rápido de ${item.title}`}
      style={{
        top: `${placement.top}px`,
        left: `${placement.left}px`,
        width: `${placement.width ?? POPOVER_WIDTH}px`,
      }}
      className={cn(
        "border-border bg-card fixed z-50 rounded-2xl border border-t-4 shadow-xl transition-all duration-150",
        "animate-[popoverIn_140ms_ease-out]",
        slot.borderTop,
      )}
    >
      {/* Flecha lateral estilo Outlook */}
      <span
        aria-hidden="true"
        style={{ top: `${placement.arrowTop}px` }}
        className={cn(
          "border-border bg-card pointer-events-none absolute h-3 w-3 -translate-y-1/2 rotate-45",
          placement.side === "right"
            ? "-left-1.5 border-b border-l"
            : "-right-1.5 border-t border-r",
        )}
      />

      <div className="p-4">
        {/* Cabecera: Perfil + expandir / cerrar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {profile && (
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full",
                  slot.iconBg,
                )}
              >
                {profile.customImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.customImage}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ProfileIcon name={profile.icon} className="h-3 w-3" />
                )}
              </span>
            )}
            <span className="text-muted-foreground truncate text-xs font-bold">
              {profile ? profile.name : item.profileLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={() => onOpenFullModal(item, false)}
              title="Abrir vista completa"
              aria-label="Abrir vista completa"
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              aria-label="Cerrar"
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Título + ícono */}
        <div className="mt-2 flex items-center gap-2.5">
          <VisualThumb
            value={visualIcon}
            alt={item.title}
            sizeClass="h-7 w-7"
            textClass="text-lg"
          />
          <h3 className="text-foreground truncate text-base font-extrabold">
            {item.title}
          </h3>
        </div>

        {/* Fecha / Hora / Monto */}
        <p className="text-muted-foreground mt-2 text-xs font-medium tabular-nums sm:text-sm">
          {subtitleText}
        </p>

        {item.location && (
          <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs font-medium">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        )}

        {/* Acciones rápidas */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {item.source === "event" &&
            (confirmDeleteRecurring ? (
              <div className="flex w-full flex-col gap-1.5">
                <p className="text-muted-foreground text-[11px] font-semibold">
                  Evento repetitivo: ¿qué deseas eliminar?
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleDeleteSingleOccurrence}
                    className="h-7 px-2.5 text-xs"
                  >
                    Solo este día
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={handleDelete}
                    className="h-7 px-2.5 text-xs"
                  >
                    Toda la serie
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteItemId(null)}
                    className="h-7 px-2 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onOpenFullModal(item, true)}
                  className="h-8 px-3 text-xs"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDelete}
                  className="hover:text-danger hover:border-danger/40 h-8 px-3 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </Button>
              </>
            ))}

          {item.source === "bill" && (
            <>
              <Button
                type="button"
                variant={item.billPaid ? "secondary" : "primary"}
                size="sm"
                onClick={handleToggleBill}
                className="h-8 px-3 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.billPaid ? "Desmarcar" : "Marcar pagado"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenFullModal(item, false)}
                className="h-8 px-3 text-xs"
              >
                Ver detalle
              </Button>
            </>
          )}

          {item.source === "task" && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleToggleTask}
                className="h-8 px-3 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {item.completed ? "Reabrir" : "Completar"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleDelete}
                className="hover:text-danger hover:border-danger/40 h-8 px-3 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
