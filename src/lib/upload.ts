"use client";

import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1600;

/**
 * Comprime la imagen en el navegador antes de subirla:
 * las fotos de celular pesan 4-8 MB y el bucket tiene tope de 5 MB.
 */
async function compress(file: File): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/** Sube una foto de comida a `meals/{user_id}/{uuid}.jpg`. */
export async function uploadMealPhoto(file: File): Promise<UploadResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const blob = await compress(file);
  if (blob.size > MAX_BYTES) return { ok: false, error: "La foto es muy pesada (máx. 5 MB)." };

  const path = `${user.id}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from("meals").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) return { ok: false, error: "No se pudo subir la foto." };
  return { ok: true, path };
}
