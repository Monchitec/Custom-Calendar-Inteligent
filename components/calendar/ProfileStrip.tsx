"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckSquare,
  CreditCard,
  Layers,
  RotateCcw,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { ProfileIcon } from "@/components/shared/ui/ProfileIcon";
import { cn } from "@/lib/cn";
import { getProfileSlotClasses } from "@/lib/themes";
import type { Profile, ProjectedCalendarItem } from "@/types/calendar";

export type CalendarFilterState =
  | { mode: "all" }
  | { mode: "solo-bills" }
  | { mode: "solo-tasks" }
  | { mode: "solo-profile"; profileId: string }
  | {
      mode: "custom";
      profileIds: string[];
      includeBills: boolean;
      includeTasks: boolean;
    };

interface ProfileStripProps {
  profiles: Profile[];
  unfilteredItems: ProjectedCalendarItem[];
  filter: CalendarFilterState;
  onChangeFilter: (next: CalendarFilterState) => void;
}

const MAX_INLINE_PROFILES = 4;

export function ProfileStrip({
  profiles,
  unfilteredItems,
  filter,
  onChangeFilter,
}: ProfileStripProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popoverOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setPopoverOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopoverOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onEsc);
    };
  }, [popoverOpen]);

  const countByProfile = new Map<string, number>();
  let billsTotal = 0;
  let tasksTotal = 0;
  let tasksDone = 0;

  for (const item of unfilteredItems) {
    if (item.source === "bill") {
      billsTotal += 1;
      continue;
    }
    if (item.source === "task") {
      tasksTotal += 1;
      if (item.completed) tasksDone += 1;
    }
    countByProfile.set(
      item.profileId,
      (countByProfile.get(item.profileId) ?? 0) + 1,
    );
  }

  const baseInline = profiles.slice(0, MAX_INLINE_PROFILES);
  const extraProfiles = profiles.slice(MAX_INLINE_PROFILES);
  const activeExtraProfile =
    filter.mode === "solo-profile"
      ? extraProfiles.find((p) => p.id === filter.profileId)
      : undefined;
  const inlineProfiles = activeExtraProfile
    ? [...baseInline, activeExtraProfile]
    : baseInline;
  const hiddenCount = profiles.length - inlineProfiles.length;

  const getCurrentMultiSelection = () => {
    if (filter.mode === "all") {
      return {
        profileIds: profiles.map((p) => p.id),
        includeBills: true,
        includeTasks: true,
      };
    }
    if (filter.mode === "solo-bills") {
      return { profileIds: [], includeBills: true, includeTasks: false };
    }
    if (filter.mode === "solo-tasks") {
      return {
        profileIds: [],
        includeBills: false,
        includeTasks: true,
      };
    }
    if (filter.mode === "solo-profile") {
      return {
        profileIds: [filter.profileId],
        includeBills: false,
        includeTasks: false,
      };
    }
    return {
      profileIds: filter.profileIds,
      includeBills: filter.includeBills,
      includeTasks: filter.includeTasks,
    };
  };

  const applyMultiUpdate = (next: {
    profileIds: string[];
    includeBills: boolean;
    includeTasks: boolean;
  }) => {
    const allProfilesSelected = profiles.every((p) =>
      next.profileIds.includes(p.id),
    );
    if (allProfilesSelected && next.includeBills && next.includeTasks) {
      onChangeFilter({ mode: "all" });
    } else {
      onChangeFilter({ mode: "custom", ...next });
    }
  };

  const toggleMultiLayer = (layer: "includeBills" | "includeTasks") => {
    const cur = getCurrentMultiSelection();
    applyMultiUpdate({ ...cur, [layer]: !cur[layer] });
  };

  const toggleMultiProfile = (profileId: string) => {
    const cur = getCurrentMultiSelection();
    const exists = cur.profileIds.includes(profileId);
    const profileIds = exists
      ? cur.profileIds.filter((id) => id !== profileId)
      : [...cur.profileIds, profileId];
    applyMultiUpdate({ ...cur, profileIds });
  };

  const multiState = getCurrentMultiSelection();
  const isCustomMulti = filter.mode === "custom";
  const showBillsChip = billsTotal > 0 || filter.mode === "solo-bills";
  const showTasksChip = tasksTotal > 0 || filter.mode === "solo-tasks";
  const hasAnyModuleChip = showBillsChip || showTasksChip;

  return (
    <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5 sm:gap-2 sm:px-6 sm:py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Botón Todo */}
        <button
          type="button"
          onClick={() => onChangeFilter({ mode: "all" })}
          aria-pressed={filter.mode === "all"}
          className={cn(
            "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all",
            filter.mode === "all"
              ? "border-primary bg-primary text-primary-foreground shadow-xs"
              : "border-border bg-card text-muted-foreground hover:bg-card-hover hover:text-foreground",
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Todo</span>
        </button>

        {/* Accesos directos de herramientas: solo visible cuando hay Tareas en el periodo */}
        {showTasksChip && (
          <button
            type="button"
            onClick={() =>
              onChangeFilter(
                filter.mode === "solo-tasks"
                  ? { mode: "all" }
                  : { mode: "solo-tasks" },
              )
            }
            aria-pressed={filter.mode === "solo-tasks"}
            title="Ver solo Mis Tareas"
            className={cn(
              "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all",
              filter.mode === "solo-tasks"
                ? "border-secondary bg-secondary-soft text-foreground ring-secondary/30 ring-2"
                : "border-border bg-card text-foreground hover:bg-card-hover",
            )}
          >
            <span aria-hidden="true" className="text-sm leading-none">
              📝
            </span>
            <span>Mis Tareas</span>
            {tasksTotal > 0 && (
              <span className="text-muted-foreground hidden text-[11px] font-extrabold tabular-nums sm:inline">
                {tasksDone}/{tasksTotal}
              </span>
            )}
          </button>
        )}

        {showTasksChip && (
          <span
            className="bg-border mx-0.5 hidden h-5 w-px md:inline-block"
            aria-hidden="true"
          />
        )}

        {/* Mis Perfiles personalizados con foto o ícono */}
        {inlineProfiles.map((profile) => {
          const slot = getProfileSlotClasses(profile.colorSlot);
          const count = countByProfile.get(profile.id) ?? 0;
          const isSolo =
            filter.mode === "solo-profile" && filter.profileId === profile.id;
          const isIncluded =
            filter.mode === "all" ||
            isSolo ||
            (isCustomMulti && multiState.profileIds.includes(profile.id));

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() =>
                onChangeFilter(
                  isSolo
                    ? { mode: "all" }
                    : { mode: "solo-profile", profileId: profile.id },
                )
              }
              aria-pressed={isSolo}
              title={`Clic para ver solo ${profile.name}`}
              className={cn(
                "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all",
                isSolo
                  ? cn(slot.activeChip, "ring-primary/35 shadow-xs ring-2")
                  : isIncluded
                    ? cn(slot.activeChip, "hover:brightness-96")
                    : "border-border bg-card text-muted-foreground opacity-50 hover:opacity-90",
              )}
            >
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
              <span className="whitespace-nowrap">{profile.name}</span>
              {count > 0 && (
                <span className="text-muted-foreground text-[11px] font-extrabold tabular-nums">
                  {count}
                </span>
              )}
            </button>
          );
        })}

        {/* Menú desplegable de Filtros */}
        <div ref={popoverRef} className="relative">
          <button
            type="button"
            onClick={() => setPopoverOpen((v) => !v)}
            aria-expanded={popoverOpen}
            className={cn(
              "inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all",
              isCustomMulti || popoverOpen
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-card text-foreground hover:bg-card-hover",
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>
              {isCustomMulti
                ? "Filtro combinado"
                : hiddenCount > 0
                  ? `Filtros (+${hiddenCount})`
                  : "Filtros"}
            </span>
          </button>

          {popoverOpen && (
            <div className="border-border bg-card absolute right-0 z-40 mt-2 w-76 overflow-hidden rounded-2xl border shadow-2xl sm:right-auto sm:left-0">
              <div className="border-border bg-surface/70 flex items-center justify-between border-b px-3.5 py-2.5">
                <div>
                  <p className="text-foreground text-xs font-extrabold">
                    Filtrar calendario
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    Elige qué mostrar en el calendario
                  </p>
                </div>
                {filter.mode !== "all" && (
                  <button
                    type="button"
                    onClick={() => onChangeFilter({ mode: "all" })}
                    className="text-primary hover:bg-primary-soft inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Todo
                  </button>
                )}
              </div>

              <div className="divide-border/70 max-h-80 divide-y overflow-y-auto p-1.5">
                {/* Módulos integrados (solo visibles si hay pagos o tareas) */}
                {hasAnyModuleChip && (
                  <div className="space-y-0.5 pb-2">
                    <p className="text-muted-foreground px-2 py-1 text-[10px] font-extrabold tracking-wider uppercase">
                      Módulos
                    </p>

                    {[
                      ...(showBillsChip
                        ? [
                            {
                              key: "includeBills" as const,
                              label: "Pagos del hogar",
                              icon: CreditCard,
                            },
                          ]
                        : []),
                      ...(showTasksChip
                        ? [
                            {
                              key: "includeTasks" as const,
                              label: "Mis tareas con fecha",
                              icon: CheckSquare,
                            },
                          ]
                        : []),
                    ].map((layer) => {
                      const LayerIcon = layer.icon;
                      const checked = multiState[layer.key];
                      return (
                        <div
                          key={layer.key}
                          className="hover:bg-muted/60 flex items-center justify-between rounded-xl px-2 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggleMultiLayer(layer.key)}
                            className="text-foreground flex flex-1 cursor-pointer items-center gap-2.5 text-left text-xs font-bold"
                          >
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border",
                                checked
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background",
                              )}
                            >
                              {checked && <Check className="h-3 w-3" />}
                            </span>
                            <LayerIcon className="text-muted-foreground h-3.5 w-3.5" />
                            <span>{layer.label}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mis perfiles */}
                <div className="space-y-0.5 pt-1.5">
                  <p className="text-muted-foreground px-2 py-1 text-[10px] font-extrabold tracking-wider uppercase">
                    Mis perfiles ({profiles.length})
                  </p>
                  {profiles.map((profile) => {
                    const slot = getProfileSlotClasses(profile.colorSlot);
                    const checked = multiState.profileIds.includes(profile.id);
                    const count = countByProfile.get(profile.id) ?? 0;

                    return (
                      <div
                        key={profile.id}
                        className="hover:bg-muted/60 flex items-center justify-between gap-2 rounded-xl px-2 py-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => toggleMultiProfile(profile.id)}
                          className="text-foreground flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left text-xs font-semibold"
                        >
                          <span
                            className={cn(
                              "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                              checked
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background",
                            )}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
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
                              <ProfileIcon
                                name={profile.icon}
                                className="h-3 w-3"
                              />
                            )}
                          </span>
                          <span className="truncate">{profile.name}</span>
                          {count > 0 && (
                            <span className="text-muted-foreground text-[11px] font-bold tabular-nums">
                              ({count})
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-border bg-surface/60 border-t px-3 py-2">
                <Link
                  href="/configuracion?tab=perfiles"
                  onClick={() => setPopoverOpen(false)}
                  className="text-primary hover:bg-primary-soft flex items-center justify-center gap-1.5 rounded-xl py-1 text-xs font-bold"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Personalizar perfiles y fotos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {filter.mode !== "all" && (
        <button
          type="button"
          onClick={() => onChangeFilter({ mode: "all" })}
          className="bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Ver todo
        </button>
      )}
    </div>
  );
}
