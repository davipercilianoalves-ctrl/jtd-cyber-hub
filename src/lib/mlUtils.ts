import { supabase } from "@/integrations/supabase/client";

export function extractMlbId(url: string): string | null {
  if (!url) return null;
  const s = url.trim();

  // ID puro: MLB1234567890 ou MLB-1234567890
  if (/^MLB-?\d+$/i.test(s)) return "MLB" + s.replace(/\D/g, "");

  // /p/MLB1234567890 (catálogo)
  const pMatch = s.match(/\/p\/MLB-?(\d+)/i);
  if (pMatch) return "MLB" + pMatch[1];

  // MLB no path (ex: produto-MLB1234567890-_JM)
  const mlbInPath = s.match(/MLB-?(\d{8,14})/i);
  if (mlbInPath) return "MLB" + mlbInPath[1];

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
