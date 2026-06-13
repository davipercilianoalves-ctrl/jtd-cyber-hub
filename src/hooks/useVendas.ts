import { supabase } from "@/integrations/supabase/client";

export type MLOrder = {
  id: number | string;
  date_created: string;
  status: string;
  total_amount: number;
  order_items: Array<{
    item: { id: string; title: string; seller_sku?: string | null };
    quantity: number;
    unit_price: number;
  }>;
  shipping?: { id?: number | string } | null;
  payments?: Array<{ shipping_cost?: number; total_paid_amount?: number }>;
};

export type SaleOverride = {
  id: string;
  ml_order_id: string;
  ml_item_id: string;
  custom_cost_price: number | null;
  unit_costs: number[] | null;
  notes: string | null;
};


export type MatchedAd = {
  id: string;
  cost_price: number | null;
  marketplace_fee: number | null;
  shipping_cost: number | null;
  packaging_cost: number | null;
  transport_cost: number | null;
  tax: number | null;
  titles: string[] | null;
  products?: {
    name: string | null;
    sku: string | null;
    cost_price: number | null;
  } | null;
};

export function useVendas() {
  async function fetchOrders(userId: string, fromISO: string, toISO: string) {
    const endpoint =
      `/orders/search?seller=${userId}&sort=date_desc` +
      `&order.date_created.from=${encodeURIComponent(fromISO)}` +
      `&order.date_created.to=${encodeURIComponent(toISO)}&limit=50`;
    const { data, error } = await supabase.functions.invoke("ml-proxy", {
      body: { endpoint, method: "GET" },
    });
    if (error) throw error;
    return (data?.results || []) as MLOrder[];
  }

  async function fetchOverrides(orderIds: string[]) {
    if (!orderIds.length) return [] as SaleOverride[];
    const { data, error } = await supabase
      .from("sale_overrides")
      .select("*")
      .in("ml_order_id", orderIds);
    if (error) throw error;
    return (data || []) as SaleOverride[];
  }

  async function saveOverride(orderId: string, itemId: string, customCost: number) {
    const { error } = await supabase
      .from("sale_overrides")
      .upsert(
        {
          ml_order_id: orderId,
          ml_item_id: itemId,
          custom_cost_price: customCost,
        },
        { onConflict: "ml_order_id,ml_item_id" },
      );
    if (error) throw error;
  }

  async function removeOverride(orderId: string, itemId: string) {
    const { error } = await supabase
      .from("sale_overrides")
      .delete()
      .eq("ml_order_id", orderId)
      .eq("ml_item_id", itemId);
    if (error) throw error;
  }

  async function fetchAds(): Promise<MatchedAd[]> {
    const { data, error } = await supabase
      .from("ads")
      .select(
        `id, cost_price, marketplace_fee, shipping_cost, packaging_cost, transport_cost, tax, titles,
         products ( name, sku, cost_price )`,
      );
    if (error) throw error;
    return (data || []) as unknown as MatchedAd[];
  }

  function findAd(ads: MatchedAd[], title: string, sku?: string | null): MatchedAd | null {
    const t = (title || "").toLowerCase().trim();
    const s = (sku || "").toLowerCase().trim();
    if (s) {
      const bySku = ads.find((a) => (a.products?.sku || "").toLowerCase() === s);
      if (bySku) return bySku;
    }
    if (t) {
      const byTitle = ads.find((a) =>
        (a.titles || []).some((x) => (x || "").toLowerCase().includes(t) || t.includes((x || "").toLowerCase())),
      );
      if (byTitle) return byTitle;
    }
    return null;
  }

  return { fetchOrders, fetchOverrides, saveOverride, removeOverride, fetchAds, findAd };
}
