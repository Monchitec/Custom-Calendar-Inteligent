"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit3,
  GripVertical,
  ImagePlus,
  Mail,
  Phone,
  Plus,
  Star,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCalendarData } from "@/components/shared/providers/CalendarDataProvider";
import { Button } from "@/components/shared/ui/Button";
import { Modal } from "@/components/shared/ui/Modal";
import {
  PROFILE_ICON_OPTIONS,
  ProfileIcon,
} from "@/components/shared/ui/ProfileIcon";
import { Switch } from "@/components/shared/ui/Switch";
import { cn } from "@/lib/cn";
import { compressIconImage } from "@/lib/imageUpload";
import { readStorage, writeStorage } from "@/lib/storage";
import { uploadIconToSupabase } from "@/lib/supabase/sync";
import { CUSTOM_COLOR_SLOTS, getProfileSlotClasses } from "@/lib/themes";
import type { Profile, ProfileCurrency, ProfileIconName } from "@/types/calendar";
import type { ProfileColorSlot } from "@/types/theme";

const MAX_PROFILE_NAME_LENGTH = 40;

type ProfileTableColumnKey = "profile" | "currency" | "email" | "phone";

const DEFAULT_PROFILE_COLUMNS: ProfileTableColumnKey[] = [
  "profile",
  "currency",
  "email",
  "phone",
];

const PROFILE_COLS_STORAGE_KEY = "calendario_profiles_cols_v1";

function normalizeProfileColumns(raw: unknown): ProfileTableColumnKey[] {
  if (!Array.isArray(raw)) return DEFAULT_PROFILE_COLUMNS;
  const valid = raw.filter((item): item is ProfileTableColumnKey =>
    DEFAULT_PROFILE_COLUMNS.includes(item as ProfileTableColumnKey),
  );
  const unique = Array.from(new Set(valid));
  for (const col of DEFAULT_PROFILE_COLUMNS) {
    if (!unique.includes(col)) unique.push(col);
  }
  return unique;
}

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

interface ProfileFormValues {
  name: string;
  currency: ProfileCurrency;
  email: string;
  phone: string;
  icon: ProfileIconName;
  colorSlot: ProfileColorSlot;
  customImage: string;
}

function ProfileFormFields({
  idPrefix,
  values,
  layout = "modal",
  onChange,
  error,
  onError,
}: {
  idPrefix: string;
  values: ProfileFormValues;
  layout?: "wide" | "modal";
  onChange: (patch: Partial<ProfileFormValues>) => void;
  error: string;
  onError: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Solo comprime localmente para vista previa; se sube a Supabase únicamente al guardar
  const handleSelectImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    onError("");
    try {
      const compressed = await compressIconImage(file, 96);
      onChange({ customImage: compressed });
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "No se pudo procesar la imagen.",
      );
    }
  };

  const nameField = (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor={`${idPrefix}-name`}
          className="text-muted-foreground block text-xs font-semibold tracking-wide uppercase"
        >
          Nombre del perfil
        </label>
        <span className="text-muted-foreground text-[11px] font-medium tabular-nums">
          {values.name.length}/{MAX_PROFILE_NAME_LENGTH}
        </span>
      </div>
      <input
        id={`${idPrefix}-name`}
        type="text"
        maxLength={MAX_PROFILE_NAME_LENGTH}
        value={values.name}
        onChange={(e) =>
          onChange({ name: e.target.value.slice(0, MAX_PROFILE_NAME_LENGTH) })
        }
        placeholder="Ej. Rubi, Azucena, Familia, Trabajo..."
        className={INPUT_CLASS}
      />
    </div>
  );

  const colorField = (
    <div>
      <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wide uppercase">
        Color armónico de la temática
      </span>
      <div className="flex flex-wrap gap-2">
        {CUSTOM_COLOR_SLOTS.map((s) => {
          const classes = getProfileSlotClasses(s.slot);
          const selected = values.colorSlot === s.slot;
          return (
            <button
              key={s.slot}
              type="button"
              onClick={() => onChange({ colorSlot: s.slot })}
              aria-label={s.label}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-2xl border-2 transition-transform hover:scale-105",
                classes.iconBg,
                selected
                  ? "border-foreground ring-primary/30 ring-2"
                  : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full",
                  classes.dot,
                )}
              >
                {selected && (
                  <Check className="text-primary-foreground h-3.5 w-3.5" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const photoField =
    layout === "wide" ? (
      <div className="flex flex-col items-center">
        <span className="text-muted-foreground mb-2 block text-center text-xs font-semibold tracking-wide uppercase">
          Foto (opcional)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectImage}
          className="hidden"
        />
        {values.customImage ? (
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Cambiar foto del perfil"
              className="group border-primary/35 relative h-24 w-24 cursor-pointer overflow-hidden rounded-full border-2 shadow-xs transition-transform hover:scale-105"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={values.customImage}
                alt="Foto del perfil"
                className="h-full w-full object-cover"
              />
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary cursor-pointer text-xs font-bold hover:underline"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onChange({ customImage: "" })}
                className="text-danger inline-flex cursor-pointer items-center gap-0.5 text-xs font-bold hover:underline"
              >
                <X className="h-3 w-3" />
                Quitar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="border-primary/45 bg-surface/60 text-primary hover:bg-primary-soft flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-full border-2 border-dashed text-center transition-all hover:scale-105"
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px] leading-tight font-bold">
              Subir foto
            </span>
          </button>
        )}
      </div>
    ) : (
      <div>
        <span className="text-muted-foreground mb-1.5 block text-xs font-semibold tracking-wide uppercase">
          Foto o imagen (opcional)
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleSelectImage}
          className="hidden"
        />
        <div className="border-border bg-surface/50 flex items-center gap-3 rounded-2xl border p-3">
          {values.customImage ? (
            <div className="flex w-full items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={values.customImage}
                alt="Vista previa de foto del perfil"
                className="border-border h-12 w-12 shrink-0 rounded-full border object-cover shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-xs font-bold">
                  Foto lista para este perfil
                </p>
                <div className="mt-1 flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary cursor-pointer text-xs font-bold hover:underline"
                  >
                    Cambiar
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ customImage: "" })}
                    className="text-danger inline-flex cursor-pointer items-center gap-0.5 text-xs font-bold hover:underline"
                  >
                    <X className="h-3 w-3" />
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-primary/45 bg-card text-primary hover:bg-primary-soft flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-xs font-bold transition-colors"
            >
              <ImagePlus className="h-4 w-4" />
              <span>Subir foto o logo desde tu dispositivo</span>
            </button>
          )}
        </div>
      </div>
    );

  const currencyField = (
    <div>
      <span className="text-muted-foreground mb-1.5 block text-xs font-semibold tracking-wide uppercase">
        Moneda del perfil
      </span>
      <div
        role="group"
        aria-label="Seleccionar moneda del perfil"
        className="border-border bg-surface grid grid-cols-2 gap-1 rounded-2xl border p-1"
      >
        <button
          type="button"
          onClick={() => onChange({ currency: "PEN" })}
          aria-pressed={values.currency === "PEN"}
          className={cn(
            "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
            values.currency === "PEN"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>S/</span>
          <span>Soles (PEN)</span>
        </button>
        <button
          type="button"
          onClick={() => onChange({ currency: "USD" })}
          aria-pressed={values.currency === "USD"}
          className={cn(
            "inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition-all",
            values.currency === "USD"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>$</span>
          <span>Dólares (USD)</span>
        </button>
      </div>
    </div>
  );

  const contactFields = (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-email`}
            className="text-muted-foreground mb-1.5 flex items-center gap-1 text-xs font-semibold tracking-wide uppercase"
          >
            <Mail className="h-3.5 w-3.5" />
            Correo (opcional)
          </label>
          <input
            id={`${idPrefix}-email`}
            type="email"
            value={values.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="Ej. correo@ejemplo.com"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-phone`}
            className="text-muted-foreground mb-1.5 flex items-center gap-1 text-xs font-semibold tracking-wide uppercase"
          >
            <Phone className="h-3.5 w-3.5" />
            Teléfono (opcional)
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            value={values.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="Ej. +51 999 999 999"
            className={cn(INPUT_CLASS, "tabular-nums")}
          />
        </div>
      </div>
      <p className="text-muted-foreground mt-1.5 text-[11px]">
        Se usarán próximamente para enviarte alertas y notificaciones.
      </p>
    </div>
  );

  return (
    <>
      {layout === "wide" ? (
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-4">
            {nameField}
            {colorField}
          </div>
          <div className="sm:px-2">{photoField}</div>
        </div>
      ) : (
        <>
          {nameField}
          {photoField}
          {colorField}
        </>
      )}

      {currencyField}
      {contactFields}

      <div>
        <span className="text-muted-foreground mb-2 block text-xs font-semibold tracking-wide uppercase">
          Ícono por defecto (si no subes foto)
        </span>
        <div
          className={cn(
            "grid gap-2",
            layout === "wide" ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-4",
          )}
        >
          {PROFILE_ICON_OPTIONS.map((opt) => {
            const selected = values.icon === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ icon: opt.id })}
                title={opt.label}
                className={cn(
                  "flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border p-2 text-[10px] font-semibold transition-all",
                  selected
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-card-hover hover:text-foreground",
                )}
              >
                <ProfileIcon name={opt.id} className="h-4 w-4" />
                <span className="max-w-full truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="bg-danger-soft text-danger rounded-xl px-3 py-2 text-xs font-semibold">
          {error}
        </p>
      )}
    </>
  );
}

const INITIAL_CREATE_VALUES: ProfileFormValues = {
  name: "",
  currency: "PEN",
  email: "",
  phone: "",
  icon: "sparkles",
  colorSlot: "cat-2",
  customImage: "",
};

export function ProfileCustomizer() {
  const {
    profiles,
    addProfile,
    updateProfile,
    setPrimaryProfile,
    deleteProfile,
    toggleProfileVisibility,
  } = useCalendarData();

  const primaryProfileId =
    profiles.find((p) => p.isPrimary)?.id ?? profiles[0]?.id ?? "";

  // Estado exclusivo para CREAR nuevo perfil en Modal dedicado
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createValues, setCreateValues] = useState<ProfileFormValues>(
    INITIAL_CREATE_VALUES,
  );
  const [createError, setCreateError] = useState("");

  // Estado exclusivo para EDITAR perfil en Modal dedicado
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editValues, setEditValues] = useState<ProfileFormValues>(
    INITIAL_CREATE_VALUES,
  );
  const [editError, setEditError] = useState("");

  // Estado para confirmar eliminación de perfil
  const [deletingProfile, setDeletingProfile] = useState<Profile | null>(null);

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [columnOrder, setColumnOrder] = useState<ProfileTableColumnKey[]>(
    DEFAULT_PROFILE_COLUMNS,
  );
  const [draggedCol, setDraggedCol] = useState<ProfileTableColumnKey | null>(
    null,
  );
  const [dragOverCol, setDragOverCol] = useState<ProfileTableColumnKey | null>(
    null,
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = readStorage<ProfileTableColumnKey[] | null>(
        PROFILE_COLS_STORAGE_KEY,
        null,
      );
      if (saved) {
        setColumnOrder(normalizeProfileColumns(saved));
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const handleColumnDrop = (targetCol: ProfileTableColumnKey) => {
    if (!draggedCol || draggedCol === targetCol) {
      setDraggedCol(null);
      setDragOverCol(null);
      return;
    }
    setColumnOrder((prev) => {
      const fromIdx = prev.indexOf(draggedCol);
      const toIdx = prev.indexOf(targetCol);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggedCol);
      writeStorage(PROFILE_COLS_STORAGE_KEY, next);
      return next;
    });
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const openCreateModal = () => {
    setCreateValues(INITIAL_CREATE_VALUES);
    setCreateError("");
    setCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateError("");
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setEditValues({
      name: profile.name,
      currency: profile.currency ?? "PEN",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      icon: profile.icon,
      colorSlot: profile.colorSlot,
      customImage: profile.customImage ?? "",
    });
    setEditError("");
  };

  const closeEditModal = () => {
    setEditingProfile(null);
    setEditError("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingCreate) return;
    if (!createValues.name.trim()) {
      setCreateError("Escribe un nombre para el perfil.");
      return;
    }

    setSavingCreate(true);
    try {
      let finalImage: string | undefined =
        createValues.customImage || undefined;
      if (finalImage && finalImage.startsWith("data:image/")) {
        finalImage = await uploadIconToSupabase(finalImage, "prf");
      }

      addProfile({
        name: createValues.name.trim(),
        currency: createValues.currency,
        email: createValues.email.trim() || undefined,
        phone: createValues.phone.trim() || undefined,
        icon: createValues.icon,
        colorSlot: createValues.colorSlot,
        visible: true,
        isPrimary: profiles.length === 0,
        customImage: finalImage,
      });
      setCreateValues(INITIAL_CREATE_VALUES);
      setCreateError("");
      setCreateModalOpen(false);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || savingEdit) return;
    if (!editValues.name.trim()) {
      setEditError("Escribe un nombre para el perfil.");
      return;
    }

    setSavingEdit(true);
    try {
      let finalImage: string | undefined = editValues.customImage || undefined;
      if (finalImage && finalImage.startsWith("data:image/")) {
        finalImage = await uploadIconToSupabase(finalImage, "prf");
      }

      updateProfile(editingProfile.id, {
        name: editValues.name.trim(),
        currency: editValues.currency,
        email: editValues.email.trim() || undefined,
        phone: editValues.phone.trim() || undefined,
        icon: editValues.icon,
        colorSlot: editValues.colorSlot,
        customImage: finalImage,
      });
      closeEditModal();
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingProfile) return;
    deleteProfile(deletingProfile.id);
    setDeletingProfile(null);
  };

  return (
    <div className="space-y-6">
      {/* Lista de perfiles existentes a ancho completo */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary-soft text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-foreground text-base font-extrabold">
                Tus perfiles del calendario
              </h2>
              <p className="text-muted-foreground text-xs">
                Administra tus perfiles (personas o áreas).
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={openCreateModal}
          >
            <Plus className="h-4 w-4" />
            Crear nuevo perfil
          </Button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-border text-muted-foreground border-b text-xs font-bold">
                {columnOrder.map((colKey) => {
                  const isDragging = draggedCol === colKey;
                  const isOver =
                    dragOverCol === colKey && draggedCol !== colKey;
                  const labelMap: Record<ProfileTableColumnKey, string> = {
                    profile: "Perfil",
                    currency: "Moneda",
                    email: "Correo",
                    phone: "Teléfono",
                  };

                  return (
                    <th
                      key={colKey}
                      scope="col"
                      draggable
                      title="Mantén presionado y arrastra para mover esta columna"
                      onDragStart={(e) => {
                        setDraggedCol(colKey);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", colKey);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOverCol !== colKey) {
                          setDragOverCol(colKey);
                        }
                      }}
                      onDragLeave={() => {
                        if (dragOverCol === colKey) {
                          setDragOverCol(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleColumnDrop(colKey);
                      }}
                      onDragEnd={() => {
                        setDraggedCol(null);
                        setDragOverCol(null);
                      }}
                      className={cn(
                        "group cursor-grab pb-2.5 whitespace-nowrap transition-all select-none active:cursor-grabbing",
                        colKey === "profile" ? "pr-4" : "px-3 text-center",
                        isDragging && "opacity-40",
                        isOver &&
                          "bg-primary-soft/75 text-primary ring-primary/50 rounded-t-lg ring-2 ring-inset",
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex items-center gap-1",
                          colKey !== "profile" && "justify-center",
                        )}
                      >
                        <GripVertical
                          aria-hidden="true"
                          className="text-muted-foreground/40 group-hover:text-muted-foreground h-3.5 w-3.5 shrink-0 transition-colors"
                        />
                        <span>{labelMap[colKey]}</span>
                      </div>
                    </th>
                  );
                })}
                <th scope="col" className="pb-2.5 pl-4 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {profiles.map((profile) => {
                const slot = getProfileSlotClasses(profile.colorSlot);
                const isPrimary = profile.id === primaryProfileId;

                const renderProfileCell = (colKey: ProfileTableColumnKey) => {
                  switch (colKey) {
                    case "profile":
                      return (
                        <td key="profile" className="py-3.5 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl",
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
                                  className="h-5 w-5"
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <p className="text-foreground truncate text-sm font-bold">
                                  {profile.name}
                                </p>
                                {isPrimary && (
                                  <span className="bg-primary-soft text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
                                    <Star className="h-2.5 w-2.5 fill-current" />
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                                    slot.badge,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-1.5 w-1.5 rounded-full",
                                      slot.dot,
                                    )}
                                  />
                                  {profile.visible
                                    ? "Visible en calendario"
                                    : "Oculto"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      );

                    case "currency":
                      return (
                        <td
                          key="currency"
                          className="px-3 py-3.5 text-center whitespace-nowrap"
                        >
                          <span className="border-border bg-surface text-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold">
                            {profile.currency === "USD" ? "$ USD" : "S/ PEN"}
                          </span>
                        </td>
                      );

                    case "email":
                      return (
                        <td key="email" className="px-3 py-3.5 text-center">
                          {profile.email ? (
                            <span className="text-foreground inline-flex max-w-56 items-center justify-center gap-1.5 text-xs font-medium">
                              <Mail className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{profile.email}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">
                              —
                            </span>
                          )}
                        </td>
                      );

                    case "phone":
                      return (
                        <td
                          key="phone"
                          className="px-3 py-3.5 text-center whitespace-nowrap"
                        >
                          {profile.phone ? (
                            <span className="text-foreground inline-flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums">
                              <Phone className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                              <span>{profile.phone}</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">
                              —
                            </span>
                          )}
                        </td>
                      );
                  }
                };

                return (
                  <tr key={profile.id}>
                    {columnOrder.map((colKey) => renderProfileCell(colKey))}

                    {/* Columna 5: Acciones */}
                    <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 sm:gap-2">
                        {!isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPrimaryProfile(profile.id)}
                            title="Marcar como Perfil Principal (protegido contra eliminación)"
                            className="text-muted-foreground hover:text-primary h-9 px-2.5 text-xs"
                          >
                            <Star className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                              Hacer principal
                            </span>
                          </Button>
                        )}
                        <Switch
                          checked={profile.visible}
                          onChange={() => toggleProfileVisibility(profile.id)}
                          ariaLabel={`Mostrar perfil ${profile.name} en el calendario`}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(profile)}
                          aria-label={`Editar ${profile.name}`}
                          className="h-9 px-3 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isPrimary || profiles.length <= 1}
                          title={
                            isPrimary
                              ? "El perfil principal no se puede eliminar"
                              : `Eliminar ${profile.name}`
                          }
                          onClick={() => setDeletingProfile(profile)}
                          aria-label={`Eliminar ${profile.name}`}
                          className="hover:text-danger h-9 w-9"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal dedicado para CREAR nuevo perfil */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Crear nuevo perfil"
        subtitle="Aparecerá en la barra de filtros con su foto o ícono"
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeCreateModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="create-profile-form"
              variant="primary"
              disabled={savingCreate}
            >
              <Plus className="h-4 w-4" />
              {savingCreate ? "Guardando..." : "Agregar perfil"}
            </Button>
          </div>
        }
      >
        <form
          id="create-profile-form"
          onSubmit={handleCreateSubmit}
          className="space-y-4"
        >
          <ProfileFormFields
            idPrefix="create-prf"
            values={createValues}
            onChange={(patch) =>
              setCreateValues((prev) => ({ ...prev, ...patch }))
            }
            error={createError}
            onError={setCreateError}
          />
        </form>
      </Modal>

      {/* Modal dedicado e inequívoco para EDITAR perfil */}
      <Modal
        open={Boolean(editingProfile)}
        onClose={closeEditModal}
        title="Editar perfil"
        subtitle={
          editingProfile ? `Modificando “${editingProfile.name}”` : undefined
        }
        maxWidthClass="max-w-lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={closeEditModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-profile-form"
              variant="primary"
              disabled={savingEdit}
            >
              <Check className="h-4 w-4" />
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        }
      >
        <form
          id="edit-profile-form"
          onSubmit={handleEditSubmit}
          className="space-y-4"
        >
          <ProfileFormFields
            idPrefix="edit-prf"
            values={editValues}
            onChange={(patch) =>
              setEditValues((prev) => ({ ...prev, ...patch }))
            }
            error={editError}
            onError={setEditError}
          />
        </form>
      </Modal>

      {/* Modal de confirmación antes de eliminar un perfil */}
      <Modal
        open={Boolean(deletingProfile)}
        onClose={() => setDeletingProfile(null)}
        title="Eliminar perfil"
        subtitle={
          deletingProfile
            ? `¿Estás seguro de eliminar “${deletingProfile.name}”?`
            : undefined
        }
        maxWidthClass="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setDeletingProfile(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirmDelete}
            >
              <Trash2 className="h-4 w-4" />
              Sí, eliminar todo
            </Button>
          </div>
        }
      >
        <div className="bg-danger-soft/75 border-danger/30 flex items-start gap-3 rounded-2xl border p-4">
          <AlertTriangle className="text-danger mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1 text-xs leading-relaxed">
            <p className="text-foreground font-bold">
              Esta acción no se puede deshacer.
            </p>
            <p className="text-muted-foreground">
              Al eliminar el perfil{" "}
              <strong className="text-foreground">
                {deletingProfile?.name}
              </strong>
              , se borrarán permanentemente todos los datos asociados a este
              perfil: eventos del calendario, tareas, rutinas, finanzas/pagos y
              alarmas.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
