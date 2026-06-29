import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subDays, formatISO, startOfDay, endOfDay } from "date-fns";

export type FinanceiroPeriod = "7d" | "15d" | "30d" | "60d" | "90d" | "custom";

export interface FinanceiroOrder {
  order_id: number;
  payment_id: number | null;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    original_price: number;
  }>;
  buyer: {
    id: number;
    name: string;
    full_name: string;
  };
  shipping_address: {
    street: string;
    number: string;
    city: string;
    state: string;
    zip: string;
  } | null;
  date_created: string;
  date_closed: string;
  release_date: string | null;
  gross_amount: number;
  original_price: number;
  sale_price: number;
  fake_discount: number;
  fake_discount_pct: string;
  ml_fee: number;
  net_amount: number;
  order_status: string;
  payment_status: string;
  release_status: string;
  shipment_status: string | null;
  shipment_substatus: string | null;
  bank_reference: {
    payment_id: number;
    net_amount: number;
    release_date: string | null;
    release_status: string;
  };
  product_cost?: number;
  kit_items?: Array<{ name: string; sku?: string; cost: number; quantity: number; total?: number; source?: string }>;
  shipping_cost?: number;
  packaging_cost?: number;
  transport_cost?: number;
  tax_cost?: number;
  reinvestment_pct?: number;
}

export interface FinanceiroSummary {
  total_gross: number;
  total_net: number;
  total_released: number;
  total_pending: number;
  total_upcoming: number;
  total_cost: number;
  total_profit: number;
  total_ml_fees: number;
  total_reinvestment: number;
  orders_count: number;
  released_count: number;
  pending_count: number;
}

async function enrichWithAppData(orders: FinanceiroOrder[]): Promise<FinanceiroOrder[]> {
  const mlIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.id)).filter(Boolean))];
  if (!mlIds.length) return orders;

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, ml_item_id, cost_price, pricing")
    .in("ml_item_id", mlIds);

  const { data: adsDirect } = await supabase
    .from("ads")
    .select("id, titles, ml_item_id, ml_item_ids, cost_price, pricing, products(name, sku, cost_price, pricing)")
    .in("ml_item_id", mlIds);

  const { data: adsArray } = await supabase
    .from("ads")
    .select("id, titles, ml_item_id, ml_item_ids, cost_price, pricing, products(name, sku, cost_price, pricing)")
    .overlaps("ml_item_ids", mlIds);

  const productMap = new Map<string, any>();

  (products || []).forEach((p: any) => {
    if (p.ml_item_id) {
      productMap.set(p.ml_item_id, {
        id: p.id,
        name: p.name,
        sku: p.sku,
        cost_price: Number(p.cost_price) || 0,
        pricing: p.pricing,
        source: "product",
      });
    }
  });

  const setFromAd = (a: any) => {
    const data = {
      id: a.id,
      name: a.titles?.[0] || a.products?.name,
      sku: a.products?.sku,
      cost_price: Number(a.cost_price) || Number(a.products?.cost_price) || 0,
      pricing: a.pricing || a.products?.pricing,
      source: "ad",
    };
    if (a.ml_item_id) productMap.set(a.ml_item_id, data);
    if (Array.isArray(a.ml_item_ids)) {
      a.ml_item_ids.forEach((id: string) => {
        if (id && mlIds.includes(id)) productMap.set(id, data);
      });
    }
  };
  (adsDirect || []).forEach(setFromAd);
  (adsArray || []).forEach(setFromAd);

  console.log(`[enrichWithAppData] MLB buscados: ${mlIds.length}, encontrados: ${productMap.size}`);
  mlIds.forEach((id) => {
    if (!productMap.has(id)) console.log(`[enrichWithAppData] MLB sem vínculo: ${id}`);
  });

  return orders.map((order) => {
    let totalProductCost = 0;
    const kitItems: any[] = [];

    order.items.forEach((item) => {
      const product = productMap.get(item.id);
      if (product) {
        const unitCost = product.cost_price || 0;
        const totalCost = unitCost * item.quantity;
        totalProductCost += totalCost;
        kitItems.push({
          name: product.name || item.title,
          sku: product.sku,
          cost: unitCost,
          quantity: item.quantity,
          total: totalCost,
          source: product.source,
        });
      }
    });

    const firstProduct = productMap.get(order.items[0]?.id);
    const pricing = firstProduct?.pricing;
    let reinvestment_pct = 0;
    if (pricing) {
      try {
        const p = typeof pricing === "string" ? JSON.parse(pricing) : pricing;
        reinvestment_pct = Number(p?.reinvestmentPct || p?.reinvestment_pct || 0);
      } catch {
        /* ignore */
      }
    }

    return {
      ...order,
      product_cost: totalProductCost,
      kit_items: kitItems,
      reinvestment_pct,
    };
  });
}


function calculateSummary(orders: FinanceiroOrder[]): FinanceiroSummary {
  const now = new Date();
  const next7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  let total_gross = 0,
    total_net = 0,
    total_released = 0,
    total_pending = 0,
    total_upcoming = 0,
    total_cost = 0,
    total_profit = 0,
    total_ml_fees = 0,
    total_reinvestment = 0,
    released_count = 0,
    pending_count = 0;

  orders.forEach((o) => {
    total_gross += o.gross_amount;
    total_net += o.net_amount;
    total_ml_fees += o.ml_fee;

    const cost = o.product_cost || 0;
    total_cost += cost;

    const profit = o.net_amount - cost;
    total_profit += profit;

    const reinvest = profit * ((o.reinvestment_pct || 0) / 100);
    total_reinvestment += reinvest;

    if (o.release_status === "released") {
      total_released += o.net_amount;
      released_count++;
    } else {
      total_pending += o.net_amount;
      pending_count++;
      if (o.release_date) {
        const rd = new Date(o.release_date);
        if (rd <= next7days) total_upcoming += o.net_amount;
      }
    }
  });

  return {
    total_gross,
    total_net,
    total_released,
    total_pending,
    total_upcoming,
    total_cost,
    total_profit,
    total_ml_fees,
    total_reinvestment,
    orders_count: orders.length,
    released_count,
    pending_count,
  };
}

export function useFinanceiro() {
  const [orders, setOrders] = useState<FinanceiroOrder[]>([]);
  const [summary, setSummary] = useState<FinanceiroSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const callFinanceiro = useCallback(async (action: string, params: any) => {
    const { data, error } = await supabase.functions.invoke("ml-financeiro", {
      body: { action, params },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const fetchOrders = useCallback(
    async (
      period: FinanceiroPeriod = "30d",
      customFrom?: Date,
      customTo?: Date,
      append = false
    ) => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let dateFrom: Date;
        let dateTo: Date = endOfDay(now);

        switch (period) {
          case "7d":
            dateFrom = subDays(now, 7);
            break;
          case "15d":
            dateFrom = subDays(now, 15);
            break;
          case "30d":
            dateFrom = subDays(now, 30);
            break;
          case "60d":
            dateFrom = subDays(now, 60);
            break;
          case "90d":
            dateFrom = subDays(now, 90);
            break;
          case "custom":
            dateFrom = customFrom || subDays(now, 30);
            dateTo = customTo ? endOfDay(customTo) : dateTo;
            break;
          default:
            dateFrom = subDays(now, 30);
        }

        const currentOffset = append ? offset : 0;

        const result = await callFinanceiro("get_orders", {
          date_from: formatISO(startOfDay(dateFrom)),
          date_to: formatISO(dateTo),
          offset: currentOffset,
          limit: 50,
        });

        const enriched = await enrichWithAppData(result.orders || []);

        const merged = append ? [...orders, ...enriched] : enriched;
        setOrders(merged);

        const total = result.paging?.total || 0;
        const nextOffset = currentOffset + (result.orders?.length || 0);
        setHasMore(nextOffset < total);
        setOffset(nextOffset);

        setSummary(calculateSummary(merged));
      } catch (err: any) {
        setError(err.message || "Erro ao buscar dados financeiros");
      } finally {
        setLoading(false);
      }
    },
    [offset, orders, callFinanceiro]
  );

  const fetchBalance = useCallback(() => callFinanceiro("get_balance", {}), [callFinanceiro]);

  const fetchMovements = useCallback(
    (dateFrom: string, dateTo: string) =>
      callFinanceiro("get_movements", { date_from: dateFrom, date_to: dateTo }),
    [callFinanceiro]
  );

  return {
    orders,
    summary,
    loading,
    error,
    hasMore,
    fetchOrders,
    fetchBalance,
    fetchMovements,
    loadMore: () => fetchOrders("30d", undefined, undefined, true),
  };
}
