// Hook para cruzar anúncios do Mercado Livre com anúncios cadastrados no app
import { supabase } from '@/integrations/supabase/client';

export function useMLCruzamento() {
  // Busca TODOS os items ativos do vendedor no ML (paginado via scan)
  async function fetchMLItems(userId: string | number): Promise<any[]> {
    try {
      const ids: string[] = [];
      let scrollId: string | null = null;
      for (let page = 0; page < 50; page++) {
        const qs = scrollId
          ? `search_type=scan&scroll_id=${encodeURIComponent(scrollId)}`
          : `search_type=scan&status=active&limit=100`;
        const { data } = await supabase.functions.invoke('ml-proxy', {
          body: { endpoint: `/users/${userId}/items/search?${qs}` },
        });
        const pageIds: string[] = data?.results || [];
        ids.push(...pageIds);
        scrollId = data?.scroll_id || null;
        if (!scrollId || pageIds.length === 0) break;
      }

      if (!ids.length) return [];

      const results: any[] = [];
      for (let i = 0; i < ids.length; i += 20) {
        const chunk = ids.slice(i, i + 20);
        const { data: items } = await supabase.functions.invoke('ml-proxy', {
          body: {
            endpoint: `/items?ids=${chunk.join(',')}&attributes=id,title,thumbnail,price,seller_sku,seller_custom_field,available_quantity,status,permalink`,
          },
        });
        if (Array.isArray(items)) {
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
