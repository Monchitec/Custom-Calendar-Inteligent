"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { compressIconImage, isImageDataUrl } from "@/lib/imageUpload";
import { VISUAL_ICON_OPTIONS } from "@/lib/visualIcons";

interface VisualIconPickerProps {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}

export function VisualIconPicker({
  value,
  onChange,
  compact = false,
}: VisualIconPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const options = compact
    ? VISUAL_ICON_OPTIONS.slice(0, 14)
    : VISUAL_ICON_OPTIONS;

  const hasCustomImage = isImageDataUrl(value);

  // Solo comprime localmente para vista previa; se sube a Supabase al guardar el registro
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    try {
      const compressed = await compressIconImage(file, 96);
      onChange(compressed);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Error al cargar la imagen.",
      );
    }
  };

  return (
    <div className="space-y-2">
      <div className="border-border bg-surface/50 flex flex-wrap items-center gap-1.5 rounded-2xl border p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {hasCustomImage ? (
          <div className="border-primary bg-primary-soft relative flex h-9 items-center gap-1.5 rounded-xl border-2 px-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Ícono personalizado"
              className="h-6 w-6 rounded-lg object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Quitar imagen personalizada"
              className="text-primary hover:bg-primary/20 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Subir imagen propia como ícono"
            className="border-primary/50 bg-card text-primary hover:bg-primary-soft inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-dashed px-2.5 text-xs font-bold transition-colors"
          >
            <ImagePlus className="h-4 w-4 shrink-0" />
            <span>Subir imagen</span>
          </button>
        )}

        {options.map((opt) => {
          const selected = value === opt.emoji;
          return (
            <button
              key={opt.emoji}
              type="button"
              title={opt.label}
              aria-label={opt.label}
              aria-pressed={selected}
              onClick={() => onChange(selected ? "" : opt.emoji)}
              className={cn(
                "flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-lg transition-all hover:scale-105",
                selected
                  ? "border-primary bg-primary-soft border-2 shadow-xs"
                  : "bg-card hover:border-border border border-transparent",
              )}
            >
              <span aria-hidden="true">{opt.emoji}</span>
            </button>
          );
        })}
      </div>

      {uploadError && (
        <p className="text-danger text-xs font-semibold">{uploadError}</p>
      )}
    </div>
  );
}
