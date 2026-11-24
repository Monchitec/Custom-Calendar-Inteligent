import { getSupabaseBrowserClient } from "./client";

const ICONS_BUCKET = "calendar-icons";

/**
 * Sube una imagen (ya comprimida como data URL WebP/PNG) al bucket `calendar-icons` de Supabase Storage
 * y retorna su URL pública. Si Supabase no está configurado o falla la subida, retorna el data URL local.
 */
export async function uploadIconToSupabase(
  dataUrl: string,
  prefix = "icon",
): Promise<string> {
  const client = getSupabaseBrowserClient();
  if (!client || !dataUrl.startsWith("data:image/")) return dataUrl;

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = blob.type.includes("webp") ? "webp" : "png";
    const filePath = `icons/${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const { error } = await client.storage
      .from(ICONS_BUCKET)
      .upload(filePath, blob, {
        contentType: blob.type || "image/webp",
        upsert: true,
      });

    if (error) return dataUrl;

    const { data: publicData } = client.storage
      .from(ICONS_BUCKET)
      .getPublicUrl(filePath);

    return publicData.publicUrl || dataUrl;
  } catch {
    return dataUrl;
  }
}

const PUBLIC_BUCKET_MARKER = `/storage/v1/object/public/${ICONS_BUCKET}/`;

/**
 * Extrae la ruta interna del bucket (ej. `icons/cat_123.webp`) desde una URL pública de Supabase Storage.
 */
function extractIconStoragePath(url?: string): string | null {
  if (!url) return null;
  const idx = url.indexOf(PUBLIC_BUCKET_MARKER);
  if (idx === -1) return null;
  const rawPath = url.slice(idx + PUBLIC_BUCKET_MARKER.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
}

/**
 * Elimina un archivo de imagen del bucket `calendar-icons` en Supabase Storage.
 * Ignora emojis, cadenas vacías o data URLs locales.
 */
export async function deleteIconFromSupabase(url?: string): Promise<void> {
  const filePath = extractIconStoragePath(url);
  if (!filePath) return;

  const client = getSupabaseBrowserClient();
  if (!client) return;

  try {
    await client.storage.from(ICONS_BUCKET).remove([filePath]);
  } catch {
    // Silencioso: no bloquear el flujo UI si falla la limpieza
  }
}
