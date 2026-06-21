import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "kit-images";
const SIGNED_URL_EXPIRES = 3600;

export interface KitImageRecord {
  id: string;
  kit_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  position: number;
  created_at: string;
  url: string;
}

async function signRows(rows: any[]): Promise<KitImageRecord[]> {
  if (!rows?.length) return [];
  const paths = rows.map((r) => r.storage_path);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRES);
  if (error) throw error;
  return rows.map((r, i) => ({
    id: r.id,
    kit_id: r.kit_id,
    storage_path: r.storage_path,
    file_name: r.file_name,
    file_size: r.file_size ?? 0,
    position: r.position ?? 0,
    created_at: r.created_at,
    url: signed?.[i]?.signedUrl ?? "",
  }));
}

export async function getKitImages(kitId: string): Promise<KitImageRecord[]> {
  const { data, error } = await (supabase as any)
    .from("kit_images")
    .select("*")
    .eq("kit_id", kitId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return signRows(data ?? []);
}

export function useKitImages(kitId?: string) {
  const [images, setImages] = useState<KitImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!kitId) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      setImages(await getKitImages(kitId));
    } finally {
      setLoading(false);
    }
  }, [kitId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadImages = useCallback(
    async (pid: string, files: File[] | FileList) => {
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(true);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) throw userErr || new Error("Não autenticado");
        const userId = userData.user.id;

        // figure out next position
        const { data: maxRow } = await (supabase as any)
          .from("kit_images")
          .select("position")
          .eq("kit_id", pid)
          .order("position", { ascending: false })
          .limit(1)
          .maybeSingle();
        let nextPos = (maxRow?.position ?? -1) + 1;

        for (const file of list) {
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${userId}/${pid}/${Date.now()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });
          if (upErr) throw upErr;

          const { error: insErr } = await (supabase as any)
            .from("kit_images")
            .insert({
              kit_id: pid,
              user_id: userId,
              storage_path: path,
              file_name: file.name,
              file_size: file.size,
              position: nextPos++,
            });
          if (insErr) {
            await supabase.storage.from(BUCKET).remove([path]);
            throw insErr;
          }
        }
        await refresh();
      } finally {
        setUploading(false);
      }
    },
    [refresh],
  );

  const deleteImage = useCallback(
    async (imageId: string, storagePath: string) => {
      const { error: delErr } = await (supabase as any)
        .from("kit_images")
        .delete()
        .eq("id", imageId);
      if (delErr) throw delErr;
      await supabase.storage.from(BUCKET).remove([storagePath]);
      await refresh();
    },
    [refresh],
  );

  const reorderImages = useCallback(
    async (orderedIds: string[]) => {
      // optimistic
      setImages((prev) => {
        const map = new Map(prev.map((i) => [i.id, i]));
        return orderedIds
          .map((id, idx) => {
            const it = map.get(id);
            return it ? { ...it, position: idx } : null;
          })
          .filter(Boolean) as KitImageRecord[];
      });
      await Promise.all(
        orderedIds.map((id, idx) =>
          (supabase as any)
            .from("kit_images")
            .update({ position: idx })
            .eq("id", id),
        ),
      );
    },
    [],
  );

  return { images, loading, uploading, uploadImages, deleteImage, reorderImages, refresh };
}
