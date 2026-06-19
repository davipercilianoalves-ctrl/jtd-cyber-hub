import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";
const SIGNED_URL_EXPIRES = 3600;

export interface ProductImageRecord {
  id: string;
  product_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  position: number;
  created_at: string;
  url: string;
}

async function signRows(rows: any[]): Promise<ProductImageRecord[]> {
  if (!rows?.length) return [];
  const paths = rows.map((r) => r.storage_path);
  const { data: signed, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_EXPIRES);
  if (error) throw error;
  return rows.map((r, i) => ({
    id: r.id,
    product_id: r.product_id,
    storage_path: r.storage_path,
    file_name: r.file_name,
    file_size: r.file_size ?? 0,
    position: r.position ?? 0,
    created_at: r.created_at,
    url: signed?.[i]?.signedUrl ?? "",
  }));
}

export async function getImages(productId: string): Promise<ProductImageRecord[]> {
  const { data, error } = await (supabase as any)
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return signRows(data ?? []);
}

export function useProductImages(productId?: string) {
  const [images, setImages] = useState<ProductImageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    if (!productId) {
      setImages([]);
      return;
    }
    setLoading(true);
    try {
      setImages(await getImages(productId));
    } finally {
      setLoading(false);
    }
  }, [productId]);

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
          .from("product_images")
          .select("position")
          .eq("product_id", pid)
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
            .from("product_images")
            .insert({
              product_id: pid,
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
        .from("product_images")
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
          .filter(Boolean) as ProductImageRecord[];
      });
      await Promise.all(
        orderedIds.map((id, idx) =>
          (supabase as any)
            .from("product_images")
            .update({ position: idx })
            .eq("id", id),
        ),
      );
    },
    [],
  );

  return { images, loading, uploading, uploadImages, deleteImage, reorderImages, refresh };
}
