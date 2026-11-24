/**
 * Convierte un archivo de imagen subido por el usuario en un data URL cuadrado y liviano (96x96)
 * para guardarlo de forma segura en localStorage sin afectar el rendimiento.
 */
export async function compressIconImage(
  file: File,
  size = 96,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido (PNG, JPG, WebP).");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
    image.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  // Recorte centrado (object-cover) para que cualquier foto quede nítida en formato cuadrado/circular
  const minSide = Math.min(img.width, img.height);
  const sx = (img.width - minSide) / 2;
  const sy = (img.height - minSide) / 2;
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

  return canvas.toDataURL("image/webp", 0.82);
}

export function isImageDataUrl(value?: string): boolean {
  return Boolean(
    value &&
    (value.startsWith("data:image/") ||
      value.startsWith("https://") ||
      value.startsWith("http://")),
  );
}
