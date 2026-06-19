import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "ad-images";
const SIGNED_URL_EXPIRES = 3600;

export interface AdImageRecord {
  id: string;
  ad_id: string | null;
  storage_path: string;
  file_name: string;
  file_size: number;
  sort_order: number;
  source: string;
  created_at: string;
  url: string;
}

async function signRows(rows: any[]): Promise<AdImageRecord[]> {
  if (!rows?.length) return [];
  const paths = rows.map((r) => r.storage_path);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRES);
  if (error) throw error;
  return rows.map((r, i) => ({
    id: r.id,
    ad_id: r.ad_id,
    storage_path: r.storage_path,
    file_name: r.file_name,
    file_size: r.file_size ?? 0,
    sort_order: r.sort_order ?? 0,
    source: r.source ?? "upload",
    created_at: r.created_at,
    url: signed?.[i]?.signedUrl ?? "",
  }));
}

export function useAdImages(adId?: string) {
  const [images, setImages] = useState<AdImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!adId) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("ad_images")
        .select("*")
        .eq("ad_id", adId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setImages(await signRows(data ?? []));
    } finally {
      setLoading(false);
    }
  }, [adId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const uploadImages = useCallback(
    async (files: File[] | FileList) => {
      if (!adId) throw new Error("Salve o anúncio antes de enviar imagens.");
      const list = Array.from(files);
      if (!list.length) return;
      setUploading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        if (!userId) throw new Error("Não autenticado");

        const { data: maxRow } = await (supabase as any)
          .from("ad_images")
          .select("sort_order")
          .eq("ad_id", adId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle();
        let nextPos = (maxRow?.sort_order ?? -1) + 1;

        for (const file of list) {
          const safeName = file.name.replace(/[^\w.\-]+/g, "_");
          const path = `${userId}/${adId}/${Date.now()}-${safeName}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type });
          if (upErr) throw upErr;

          const { error: insErr } = await (supabase as any)
            .from("ad_images")
            .insert({
              ad_id: adId,
              user_id: userId,
              storage_path: path,
              file_name: file.name,
              file_size: file.size,
              sort_order: nextPos++,
              source: "upload",
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
    [adId, refresh],
  );

  const deleteImage = useCallback(
    async (id: string, storagePath: string) => {
      await (supabase as any).from("ad_images").delete().eq("id", id);
      await supabase.storage.from(BUCKET).remove([storagePath]);
      await refresh();
    },
    [refresh],
  );

  const reorder = useCallback(async (orderedIds: string[]) => {
    setImages((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      return orderedIds
        .map((id, idx) => {
          const it = map.get(id);
          return it ? { ...it, sort_order: idx } : null;
        })
        .filter(Boolean) as AdImageRecord[];
    });
    await Promise.all(
      orderedIds.map((id, idx) =>
        (supabase as any).from("ad_images").update({ sort_order: idx }).eq("id", id),
      ),
    );
  }, []);

  return { images, loading, uploading, uploadImages, deleteImage, reorder, refresh };
}
