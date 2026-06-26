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
    const dateQuery = from && to ? `&date_from=${encodeURIComponent(toMlDate(from))}&date_to=${encodeURIComponent(toMlDate(to, true))}` : '';
    return callML(`/items/visits?ids=${encodeURIComponent(itemId)}${dateQuery}`);
  }

  async function getItemsVisits(itemIds: string[], from: string, to: string) {
    if (!itemIds.length) return [];
    const fromDate = toMlDate(from);
    const toDate = toMlDate(to, true);
    // ML /items/visits accepts only 1 id per request — fetch in parallel and merge
    const results = await Promise.all(
      itemIds.slice(0, 20).map(async (id) => {
        try {
          const res = await callML(
            `/items/visits?ids=${encodeURIComponent(id)}&date_from=${encodeURIComponent(fromDate)}&date_to=${encodeURIComponent(toDate)}`
          );
          return Array.isArray(res) ? res[0] : res;
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean);
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

  // Pagina getOrders até esgotar (ou até maxPages)
  async function getOrdersAllPages(userId: string, from: string, to: string, maxPages = 10) {
    const all: any[] = [];
    for (let i = 0; i < maxPages; i++) {
      const res = await getOrders(userId, from, to, i * 50).catch(() => null);
      const results = res?.results || [];
      all.push(...results);
      if (results.length < 50) break;
    }
    return all;
  }

  // Atalho: pedidos dos últimos 365 dias + 365 do ano anterior
  async function getYearOrders(userId: string) {
    const now = new Date();
    const curTo = new Date(now);
    const curFrom = new Date(now);
    curFrom.setDate(curFrom.getDate() - 365);
    const prevTo = new Date(curFrom);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - 365);
    const [current, previous] = await Promise.all([
      getOrdersAllPages(userId, curFrom.toISOString(), curTo.toISOString(), 10),
      getOrdersAllPages(userId, prevFrom.toISOString(), prevTo.toISOString(), 10),
    ]);
    return { current, previous };
  }

  // Busca preços ML de múltiplos itens (chunks de 20)
  async function getMlPricesForItems(itemIds: string[]) {
    const map = new Map<string, { price: number | null; status?: string; available_quantity?: number }>();
    if (!itemIds.length) return map;
    const unique = Array.from(new Set(itemIds.filter(Boolean)));
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 20) chunks.push(unique.slice(i, i + 20));
    const results = await Promise.allSettled(chunks.map((c) => getItemsDetails(c)));
    results.forEach((r) => {
      if (r.status !== "fulfilled") return;
      const arr = Array.isArray(r.value) ? r.value : [];
      arr.forEach((entry: any) => {
        const body = entry?.body || entry;
        const id = body?.id || entry?.code;
        if (!id) return;
        map.set(id, {
          price: typeof body?.price === "number" ? body.price : null,
          status: body?.status,
          available_quantity: body?.available_quantity,
        });
      });
    });
    return map;
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
    const fromDate = toMlDate(from);
    const toDate = toMlDate(to, true);
    const [visits, orders] = await Promise.allSettled([
      callML(`/items/visits?ids=${encodeURIComponent(itemId)}&date_from=${encodeURIComponent(fromDate)}&date_to=${encodeURIComponent(toDate)}`),
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

  // Busca itens vinculados ao ML (ads + products) — formato unificado para PriceSync
  async function getLinkedItems() {
    const [adsRes, prodRes] = await Promise.all([
      supabase
        .from('ads')
        .select('id, titles, ml_item_id, ml_item_ids, final_price, cost_price, products(name, sku)')
        .not('ml_item_id', 'is', null),
      supabase
        .from('products')
        .select('id, name, sku, ml_item_id, sale_price, cost_price')
        .not('ml_item_id', 'is', null),
    ]);

    const fromAds = ((adsRes.data as any[]) || []).map((a: any) => ({
      id: a.id,
      kind: 'ad' as const,
      label: (Array.isArray(a.titles) && a.titles[0]) || a.products?.name || 'Anúncio',
      sku: a.products?.sku || '',
      ml_item_id: a.ml_item_id as string | null,
      ml_item_ids: Array.isArray(a.ml_item_ids) ? (a.ml_item_ids as string[]) : [],
      sale_price: Number(a.final_price || 0),
      cost_price: Number(a.cost_price || 0),
    }));

    const fromProducts = ((prodRes.data as any[]) || []).map((p: any) => ({
      id: p.id,
      kind: 'product' as const,
      label: p.name || p.sku || 'Produto',
      sku: p.sku || '',
      ml_item_id: p.ml_item_id as string | null,
      ml_item_ids: [] as string[],
      sale_price: Number(p.sale_price || 0),
      cost_price: Number(p.cost_price || 0),
    }));

    return [...fromAds, ...fromProducts];
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
    getOrdersAllPages,
    getYearOrders,
    getMlPricesForItems,
    getVisitsTrend,
    getItemMetrics,
    calcFunil,
    posicaoMercado,
    getLocalAds,
    getLinkedItems,
    cachedCall
  };
}

