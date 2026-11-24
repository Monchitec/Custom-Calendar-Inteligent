"use client";

import { cn } from "@/lib/cn";
import { isImageDataUrl } from "@/lib/imageUpload";

interface VisualThumbProps {
  value: string;
  alt?: string;
  sizeClass?: string;
  textClass?: string;
  roundedClass?: string;
  className?: string;
}

/**
 * Renderiza una imagen personalizada subida por el usuario (data URL)
 * o un ícono visual/emoji manteniendo dimensiones consistentes.
 */
export function VisualThumb({
  value,
  alt = "",
  sizeClass = "h-5 w-5",
  textClass = "text-sm",
  roundedClass = "rounded-md",
  className,
}: VisualThumbProps) {
  if (isImageDataUrl(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt={alt}
        className={cn(
          "shrink-0 object-cover select-none",
          sizeClass,
          roundedClass,
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none select-none",
        textClass,
        className,
      )}
    >
      {value}
    </span>
  );
}
