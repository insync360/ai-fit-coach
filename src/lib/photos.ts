import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "user-uploads";

/**
 * Resize an image File to fit within `maxDim` px on the longer edge and
 * return it as a JPEG data URL. Used to keep AI-analysis payloads under
 * Vercel's 4.5 MB serverless-function body limit — full-resolution phone
 * photos (3-8 MB) base64-encode to well over that. 1024px @ 0.85 quality
 * is typically 200-400 KB, which is plenty of detail for OpenAI's vision
 * model (it downsamples to 1568px anyway).
 */
export async function resizeImageDataUrl(
  file: File,
  maxDim = 1024,
  quality = 0.85,
): Promise<string> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image"));
      el.src = sourceUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > maxDim ? maxDim / longest : 1;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(img, 0, 0, w, h);

    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export async function uploadPhoto(file: File, kind: "food" | "progress"): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Not signed in");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileId = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${userId}/${kind}/${fileId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  return path;
}

const urlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_TTL_SEC = 3600;

export function useSignedUrl(path: string | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(() => {
    if (!path) return undefined;
    const c = urlCache.get(path);
    if (c && c.expiresAt > Date.now()) return c.url;
    return undefined;
  });

  useEffect(() => {
    if (!path) {
      setUrl(undefined);
      return;
    }
    const c = urlCache.get(path);
    if (c && c.expiresAt > Date.now()) {
      setUrl(c.url);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_TTL_SEC)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setUrl(undefined);
          return;
        }
        urlCache.set(path, {
          url: data.signedUrl,
          expiresAt: Date.now() + (SIGNED_TTL_SEC - 60) * 1000,
        });
        setUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
