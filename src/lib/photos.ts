import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "user-uploads";

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
