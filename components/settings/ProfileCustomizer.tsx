"use client";

import { useRef, useState } from "react";
import { Check, Edit3, ImagePlus, Plus, Trash2, Users, X } from "lucide-react";
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
import { uploadIconToSupabase } from "@/lib/supabase/sync";
import { CUSTOM_COLOR_SLOTS, getProfileSlotClasses } from "@/lib/themes";
import type { Profile, ProfileIconName } from "@/types/calendar";
import type { ProfileColorSlot } from "@/types/theme";

const MAX_PROFILE_NAME_LENGTH = 40;

const INPUT_CLASS =
  "w-full rounded-xl bg-background border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25";

interface ProfileFormValues {
  name: string;
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
  icon: "sparkles",
  colorSlot: "cat-2",
  customImage: "",
};

export function ProfileCustomizer() {
  const {
    profiles,
    addProfile,
    updateProfile,
    deleteProfile,
    toggleProfileVisibility,
  } = useCalendarData();

  // Estado exclusivo para CREAR nuevo perfil (panel derecho)
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

  const [savingCreate, setSavingCreate] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setEditValues({
      name: profile.name,
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
        icon: createValues.icon,
        colorSlot: createValues.colorSlot,
        visible: true,
        customImage: finalImage,
      });
      setCreateValues(INITIAL_CREATE_VALUES);
      setCreateError("");
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
        icon: editValues.icon,
        colorSlot: editValues.colorSlot,
        customImage: finalImage,
      });
      closeEditModal();
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Lista de perfiles existentes */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs lg:col-span-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary-soft text-primary flex h-10 w-10 items-center justify-center rounded-2xl">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Tus perfiles del calendario
            </h2>
            <p className="text-muted-foreground text-xs">
              Crea perfiles por persona o área (ej. Rubi, Azucena, Trabajo,
              Casa) con foto y color para clasificar y filtrar eventos y tareas.
            </p>
          </div>
        </div>

        <ul className="divide-border mt-5 divide-y">
          {profiles.map((profile) => {
            const slot = getProfileSlotClasses(profile.colorSlot);

            return (
              <li
                key={profile.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3.5"
              >
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
                      <ProfileIcon name={profile.icon} className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-bold">
                      {profile.name}
                    </p>
                    <span
                      className={cn(
                        "mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                        slot.badge,
                      )}
                    >
                      <span
                        className={cn("h-1.5 w-1.5 rounded-full", slot.dot)}
                      />
                      {profile.visible ? "Visible en calendario" : "Oculto"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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
                    disabled={profiles.length <= 1}
                    onClick={() => deleteProfile(profile.id)}
                    aria-label={`Eliminar ${profile.name}`}
                    className="hover:text-danger h-9 w-9"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Panel derecho dedicado exclusivamente a CREAR nuevo perfil */}
      <section className="border-border bg-card rounded-3xl border p-5 shadow-xs lg:col-span-6">
        <div className="flex items-center gap-2">
          <span className="bg-primary-soft text-primary flex h-8 w-8 items-center justify-center rounded-xl">
            <Plus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-foreground text-base font-extrabold">
              Crear nuevo perfil
            </h2>
            <p className="text-muted-foreground text-xs">
              Aparecerá en la barra de filtros con su foto o ícono
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
          <ProfileFormFields
            idPrefix="create-prf"
            layout="wide"
            values={createValues}
            onChange={(patch) =>
              setCreateValues((prev) => ({ ...prev, ...patch }))
            }
            error={createError}
            onError={setCreateError}
          />

          <div className="border-border flex items-center justify-end gap-2 border-t pt-4">
            <Button
              type="submit"
              variant="primary"
              disabled={savingCreate}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              {savingCreate ? "Guardando..." : "Agregar perfil"}
            </Button>
          </div>
        </form>
      </section>

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
    </div>
  );
}
