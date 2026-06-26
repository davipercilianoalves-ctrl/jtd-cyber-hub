import { supabase } from "@/integrations/supabase/client";

export function extractMlbId(url: string): string | null {
  if (!url) return null;
  const patterns = [/\/p\/(MLB-?\d+)/i, /MLB-?(\d+)/i];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const digits = match[1].replace(/\D/g, "");
      if (digits) return "MLB" + digits;
    }
  }
  return null;
}

export interface MlFetchedData {
  title: string;
  price: number;
  description: string;
}

async function callMl(endpoint: string) {
  const { data, error } = await supabase.functions.invoke("ml-proxy", {
    body: { endpoint, method: "GET" },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchMlItemData(mlbId: string): Promise<MlFetchedData | null> {
  try {
    const item = await callMl(`/items/${mlbId}`);
    if (!item) return null;
    let description = "";
    try {
      const desc = await callMl(`/items/${mlbId}/description`);
      description = desc?.plain_text || desc?.text || "";
    } catch {
      // descrição é opcional
    }
    return {
      title: item.title || "",
      price: Number(item.price || 0),
      description,
    };
  } catch {
    return null;
  }
}
