// Hook para cruzar anúncios do Mercado Livre com anúncios cadastrados no app
import { supabase } from '@/integrations/supabase/client';

export function useMLCruzamento() {
  // Busca todos os items ativos do vendedor no ML
  async function fetchMLItems(userId: string | number): Promise<any[]> {
    try {
      const { data } = await supabase.functions.invoke('ml-proxy', {
        body: {
          endpoint: `/users/${userId}/items/search?status=active&limit=50`,
        },
      });

      const ids: string[] = data?.results || [];
      if (!ids.length) return [];

      // Buscar detalhes dos items em lote (máx 20 por vez)
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 20) {
        chunks.push(ids.slice(i, i + 20));
      }

      const results: any[] = [];
      for (const chunk of chunks) {
        const { data: items } = await supabase.functions.invoke('ml-proxy', {
          body: { endpoint: `/items?ids=${chunk.join(',')}` },
        });
        if (Array.isArray(items)) {
          // /items?ids= returns [{code, body}, ...]
          items.forEach((wrap: any) => {
            if (wrap?.body) results.push(wrap.body);
            else if (wrap?.id) results.push(wrap);
          });
        }
      }

      return results;
    } catch (e) {
      console.error('Erro ao buscar items ML:', e);
      return [];
    }
  }

  // Tenta cruzar automaticamente item ML com anúncio local
  function cruzarItem(mlItem: any, localAds: any[]): any | null {
    const mlTitle = (mlItem.title || '').toLowerCase().trim();
    const mlSku = (mlItem.seller_sku || mlItem.seller_custom_field || '')
      .toLowerCase()
      .trim();

    // 1. Por SKU exato
    if (mlSku) {
      const bySku = localAds.find(
        (ad) => (ad.products?.sku || '').toLowerCase() === mlSku,
      );
      if (bySku) return bySku;
    }

    // 2. Por título (match parcial >= 60% das palavras)
    const mlWords = mlTitle.split(/\s+/).filter((w: string) => w.length > 2);

    let bestMatch: any = null;
    let bestScore = 0;

    localAds.forEach((ad) => {
      const adTitles: string[] = ad.titles || [];
      adTitles.forEach((t) => {
        const adTitle = (t || '').toLowerCase().trim();
        const matches = mlWords.filter((w: string) => adTitle.includes(w)).length;
        const score = mlWords.length > 0 ? matches / mlWords.length : 0;

        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = ad;
        }
      });
    });

    return bestMatch;
  }

  async function vincularItem(adId: string, mlItemId: string) {
    const { error } = await supabase
      .from('ads')
      .update({ ml_item_id: mlItemId } as any)
      .eq('id', adId);
    if (error) throw error;
  }

  async function desvincularItem(adId: string) {
    const { error } = await supabase
      .from('ads')
      .update({ ml_item_id: null } as any)
      .eq('id', adId);
    if (error) throw error;
  }

  async function fetchItemVisits(mlItemId: string, from: string, to: string) {
    try {
      const { data } = await supabase.functions.invoke('ml-proxy', {
        body: {
          endpoint: `/visits/items?ids=${mlItemId}&date_from=${from}&date_to=${to}`,
        },
      });
      return data;
    } catch {
      return null;
    }
  }

  async function fetchItemOrders(mlItemId: string, from: string, to: string) {
    try {
      const { data } = await supabase.functions.invoke('ml-proxy', {
        body: {
          endpoint: `/orders/search?item.id=${mlItemId}&sort=date_desc&order.date_created.from=${from}&order.date_created.to=${to}&limit=50`,
        },
      });
      return data?.results || [];
    } catch {
      return [];
    }
  }

  return {
    fetchMLItems,
    cruzarItem,
    vincularItem,
    desvincularItem,
    fetchItemVisits,
    fetchItemOrders,
  };
}
