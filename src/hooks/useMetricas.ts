import { supabase } from '@/integrations/supabase/client';

export function useMetricas() {
  function toMlDate(value: string, clampToToday = false) {
    const date = value.slice(0, 10);
    if (!clampToToday) return date;

    const today = new Date().toISOString().slice(0, 10);
    return date > today ? today : date;
  }

  async function callML(endpoint: string) {
    const { data, error } = await supabase.functions.invoke('ml-proxy', {
      body: { endpoint }
    });
    if (error) throw new Error(error.message || 'Falha ao chamar o Mercado Livre');
    if (data?.error || data?.message) {
      const status = data?.ml_status ? ` (${data.ml_status})` : '';
      throw new Error(`${data.error || data.message}${status}`);
    }
    return data;
  }
  
  // Busca visitas de um item específico
  async function getItemVisits(itemId: string, from?: string, to?: string) {
    const dateQuery = from && to ? `&date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}` : '';
    return callML(`/items/visits?ids=${encodeURIComponent(itemId)}${dateQuery}`);
  }

  async function getItemsVisits(itemIds: string[], from: string, to: string) {
    if (!itemIds.length) return [];
    const ids = itemIds.slice(0, 20).map((id) => encodeURIComponent(id)).join(',');
    return callML(`/items/visits?ids=${ids}&date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`);
  }

  // Busca todos os anúncios ativos do vendedor
  async function getSellerItems(userId: string) {
    return callML(`/users/${userId}/items/search?status=active&limit=50`);
  }

  // Busca detalhes de múltiplos items de uma vez (máx 20)
  async function getItemsDetails(itemIds: string[]) {
    if (!itemIds.length) return [];
    const ids = itemIds.slice(0, 20).join(',');
    return await callML(`/items?ids=${ids}`) || [];
  }

  // Busca pedidos do vendedor com filtro de período
  async function getOrders(
    userId: string, 
    from: string, 
    to: string,
    offset: number = 0
  ) {
    return callML(`/orders/search?seller=${userId}&sort=date_desc&order.date_created.from=${encodeURIComponent(from)}&order.date_created.to=${encodeURIComponent(to)}&limit=50&offset=${offset}`);
  }

  // Busca tendências de visitas da conta
  async function getVisitsTrend(userId: string, from: string, to: string) {
    // ML exige YYYY-MM-DD e rejeita date_to no futuro nesse endpoint.
    const fromDate = toMlDate(from);
    const toDate = toMlDate(to, true);
    return callML(`/users/${userId}/items_visits?date_from=${encodeURIComponent(fromDate)}&date_to=${encodeURIComponent(toDate)}`);
  }

  // Busca métricas de um anúncio específico
  async function getItemMetrics(itemId: string, from: string, to: string) {
    const [visits, orders] = await Promise.allSettled([
      callML(`/items/visits?ids=${encodeURIComponent(itemId)}&date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`),
      callML(`/orders/search?item.id=${encodeURIComponent(itemId)}&sort=date_desc&order.date_created.from=${encodeURIComponent(from)}&order.date_created.to=${encodeURIComponent(to)}&limit=50`)
    ]);

    return {
      visits: visits.status === 'fulfilled' ? visits.value : null,
      orders: orders.status === 'fulfilled' ? orders.value : null
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
    getItemsVisits,
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
