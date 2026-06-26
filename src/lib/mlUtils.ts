import { supabase } from "@/integrations/supabase/client";

export function extractMlbId(url: string): string | null {
  if (!url) return null;
  const s = url.trim();

  // PRIORIDADE 1: parâmetro wid=MLB
  const widMatch = s.match(/[?&#]wid=(MLB\d+)/i);
  if (widMatch) return widMatch[1].toUpperCase();

  // PRIORIDADE 2: ID puro
  if (/^MLB-?\d+$/i.test(s)) return "MLB" + s.replace(/\D/g, "");

  // PRIORIDADE 3: /p/MLB (catálogo)
  const pMatch = s.match(/\/p\/(MLB-?\d+)/i);
  if (pMatch) return "MLB" + pMatch[1].replace(/\D/g, "");

  // PRIORIDADE 4: MLB no path
  const pathMatch = s.match(/\/(MLB)-?(\d{8,12})/i);
  if (pathMatch) return "MLB" + pathMatch[2];

  // PRIORIDADE 5: MLB com 8+ dígitos (ignora MLBU/MLBA)
  const anyMatch = s.match(/\bMLB(\d{8,12})\b/i);
  if (anyMatch) return "MLB" + anyMatch[1];

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
