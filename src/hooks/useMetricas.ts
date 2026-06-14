import { supabase } from '@/integrations/supabase/client';

export function useMetricas() {
  
  // Busca visitas de um item específico
  async function getItemVisits(itemId: string) {
    const { data } = await supabase.functions.invoke('ml-proxy', {
      body: { endpoint: `/visits/items?ids=${itemId}` }
    });
    return data;
  }

  // Busca todos os anúncios ativos do vendedor
  async function getSellerItems(userId: string) {
    const { data } = await supabase.functions.invoke('ml-proxy', {
      body: { 
        endpoint: `/users/${userId}/items/search?status=active&limit=50` 
      }
    });
    return data;
  }

  // Busca detalhes de múltiplos items de uma vez (máx 20)
  async function getItemsDetails(itemIds: string[]) {
    if (!itemIds.length) return [];
    const ids = itemIds.slice(0, 20).join(',');
    const { data } = await supabase.functions.invoke('ml-proxy', {
      body: { endpoint: `/items?ids=${ids}` }
    });
    return data || [];
  }

  // Busca pedidos do vendedor com filtro de período
  async function getOrders(
    userId: string, 
    from: string, 
    to: string,
    offset: number = 0
  ) {
    const { data } = await supabase.functions.invoke('ml-proxy', {
      body: {
        endpoint: `/orders/search?seller=${userId}&sort=date_desc&order.date_created.from=${from}&order.date_created.to=${to}&limit=50&offset=${offset}`
      }
    });
    return data;
  }

  // Busca tendências de visitas da conta
  async function getVisitsTrend(userId: string, from: string, to: string) {
    const { data } = await supabase.functions.invoke('ml-proxy', {
      body: {
        endpoint: `/users/${userId}/items_visits?date_from=${from}&date_to=${to}`
      }
    });
    return data;
  }

  // Busca métricas de um anúncio específico
  async function getItemMetrics(itemId: string, from: string, to: string) {
    const [visits, orders] = await Promise.allSettled([
      supabase.functions.invoke('ml-proxy', {
        body: { endpoint: `/visits/items?ids=${itemId}&date_from=${from}&date_to=${to}` }
      }),
      supabase.functions.invoke('ml-proxy', {
        body: {
          endpoint: `/orders/search?item.id=${itemId}&sort=date_desc&order.date_created.from=${from}&order.date_created.to=${to}&limit=50`
        }
      })
    ]);

    return {
      visits: visits.status === 'fulfilled' ? visits.value.data : null,
      orders: orders.status === 'fulfilled' ? orders.value.data : null
    };
  }

  // Calcula funil de conversão
  function calcFunil(visits: number, cartAttempts: number, sales: number) {
    return {
      visits,
      cartAttempts,
      sales,
      visitToCart: visits > 0 ? ((cartAttempts / visits) * 100).toFixed(1) : '0.0',
      cartToSale: cartAttempts > 0 ? ((sales / cartAttempts) * 100).toFixed(1) : '0.0',
      visitToSale: visits > 0 ? ((sales / visits) * 100).toFixed(1) : '0.0',
    };
  }

  // Calcula posição vs mercado
  function posicaoMercado(preco: number, precoMin: number, precoMedio: number, precoMax: number) {
    if (preco <= precoMin * 1.05) return { label: 'Abaixo do mercado', color: 'text-lime-500' };
    if (preco <= precoMedio * 1.10) return { label: 'Dentro do mercado', color: 'text-cyan-400' };
    return { label: 'Acima do mercado', color: 'text-red-500' };
  }

  // Busca anúncios do Supabase (cruzamento com ML)
  async function getLocalAds() {
    const { data } = await supabase
      .from('ads')
      .select('*, products(name, sku, cost_price, keywords)')
      .eq('is_active', true);
    return data || [];
  }

  // Cache simples em memória para não refazer chamadas
  const memCache = new Map<string, { data: any; expires: number }>();
  
  async function cachedCall(key: string, fn: () => Promise<any>, ttlMs = 5 * 60 * 1000) {
    const cached = memCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.data;
    const result = await fn();
    memCache.set(key, { data: result, expires: Date.now() + ttlMs });
    return result;
  }

  return {
    getItemVisits,
    getSellerItems,
    getItemsDetails,
    getOrders,
    getVisitsTrend,
    getItemMetrics,
    calcFunil,
    posicaoMercado,
    getLocalAds,
    cachedCall
  };
}
