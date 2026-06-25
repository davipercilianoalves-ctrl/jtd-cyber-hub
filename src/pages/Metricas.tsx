// Métricas — Redesign focado em narrativa de funil + tendências interativas
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  DollarSign,
  Eye,
  
  Package,
  Percent,
  Plug,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMetricas } from "@/hooks/useMetricas";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import { MetricsHeader, type MetricsPeriod } from "@/components/metricas/MetricsHeader";
import { FunnelHeroCard } from "@/components/metricas/FunnelHeroCard";
import { InteractiveLineChart, type InteractiveMetric } from "@/components/metricas/InteractiveLineChart";
import { MultiSeriesChart } from "@/components/metricas/MultiSeriesChart";
import { ContextStatCard } from "@/components/metricas/ContextStatCard";
import { AdCostBreakdownTable } from "@/components/metricas/AdCostBreakdownTable";
import { CostCompositionCard } from "@/components/metricas/CostCompositionCard";
import { PriceSyncCard } from "@/components/metricas/PriceSyncCard";
import { YearlySalesChart } from "@/components/metricas/YearlySalesChart";
import { TopProductsSeasonality } from "@/components/metricas/TopProductsSeasonality";
import { AdDetailView, type AdEvolutionPoint, type AdSaleRow } from "@/components/metricas/AdDetailView";
import { CostsRevenueView } from "@/components/metricas/CostsRevenueView";
import { ForecastView } from "@/components/metricas/ForecastView";
import { InventoryView } from "@/components/metricas/InventoryView";
import { cn } from "@/lib/utils";
import type { AdCostRow, PriceSyncRow, MonthlySalesPoint, TopProductRow } from "@/components/metricas/types";



const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT = (n: number) => Math.round(n).toLocaleString("pt-BR");

// CSS color tokens from the project theme
const COLOR_PRIMARY = "var(--primary)";
const COLOR_MAGENTA = "var(--magenta)";
const COLOR_CYAN = "var(--cyan)";
const COLOR_AMBER = "#FFB020";

interface MlOrder {
  id: number | string;
  date_created: string;
  date_closed?: string;
  status: string;
  total_amount: number;
  buyer?: { id?: number | string } | null;
  order_items: Array<{
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }>;
}

function daysFor(p: MetricsPeriod) {
  return p === "7D" ? 7 : p === "30D" ? 30 : 90;
}
function periodRange(p: MetricsPeriod, offset = 0) {
  const days = daysFor(p);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  if (offset > 0) to.setDate(to.getDate() - days * offset);
  const from = new Date(to);
  from.setDate(from.getDate() - days + 1);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseVisitTotal(data: any): number {
  if (!data) return 0;
  if (Array.isArray(data)) return data.reduce((s, x) => s + parseVisitTotal(x), 0);
  const direct = Number(data.total_visits ?? data.total ?? data.visits ?? 0) || 0;
  if (direct > 0) return direct;
  if (Array.isArray(data.visits_detail)) {
    return data.visits_detail.reduce((s: number, x: any) => s + (Number(x?.quantity ?? x?.total) || 0), 0);
  }
  if (Array.isArray(data.results)) return data.results.reduce((s: number, x: any) => s + parseVisitTotal(x), 0);
  return 0;
}

function parseVisitsByDay(data: any): Map<string, number> {
  const map = new Map<string, number>();
  const walk = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) return node.forEach(walk);
    if (Array.isArray(node.results)) node.results.forEach(walk);
    if (Array.isArray(node.visits_detail)) {
      node.visits_detail.forEach((v: any) => {
        const date = (v?.date || "").slice(0, 10);
        const q = Number(v?.quantity ?? v?.total) || 0;
        if (date) map.set(date, (map.get(date) || 0) + q);
      });
    }
  };
  walk(data);
  return map;
}

function aggregateByDay(orders: MlOrder[]) {
  const map = new Map<string, { orders: number; revenue: number; units: number }>();
  orders.forEach((o) => {
    const d = (o.date_created || o.date_closed || "").slice(0, 10);
    if (!d) return;
    const cur = map.get(d) || { orders: 0, revenue: 0, units: 0 };
    cur.orders += 1;
    cur.revenue += Number(o.total_amount || 0);
    cur.units += (o.order_items || []).reduce((s, it) => s + Number(it.quantity || 0), 0);
    map.set(d, cur);
  });
  return map;
}

function buildSeries(
  period: MetricsPeriod,
  ordersMap: Map<string, { orders: number; revenue: number; units: number }>,
  visitsMap: Map<string, number>
) {
  const days = daysFor(period);
  const out: Array<{ date: string; orders: number; revenue: number; ticket: number; visits: number }> = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const o = ordersMap.get(iso) || { orders: 0, revenue: 0, units: 0 };
    const v = visitsMap.get(iso) || 0;
    const ticket = o.units > 0 ? o.revenue / o.units : 0;
    out.push({
      date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
      orders: o.orders,
      revenue: o.revenue,
      ticket,
      visits: v,
    });
  }
  return out;
}

type Tab = "OVERVIEW" | "BY_AD" | "COSTS" | "FORECAST" | "INVENTORY";

export default function Metricas() {
  const m = useMetricas();
  const [period, setPeriod] = useState<MetricsPeriod>("30D");
  const [token, setToken] = useState<any>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  const [orders, setOrders] = useState<MlOrder[]>([]);
  const [prevOrders, setPrevOrders] = useState<MlOrder[]>([]);
  const [visitsData, setVisitsData] = useState<any>(null);
  const [prevVisitsTotal, setPrevVisitsTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  // Novos blocos
  const [localAds, setLocalAds] = useState<any[]>([]);
  const [mlPrices, setMlPrices] = useState<Map<string, { price: number | null }>>(new Map());
  const [mlItems, setMlItems] = useState<Map<string, { title: string; price: number | null; sku: string | null }>>(new Map());
  const [yearOrders, setYearOrders] = useState<{ current: MlOrder[]; previous: MlOrder[] }>({ current: [], previous: [] });
  const [yearLoading, setYearLoading] = useState(false);


  useEffect(() => {
    (async () => {
      setTokenLoading(true);
      try {
        const { data } = await supabase.from("ml_tokens").select("*").maybeSingle();
        setToken(data);
      } finally {
        setTokenLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cur = periodRange(period, 0);
        const prev = periodRange(period, 1);
        const [curOrders, prvOrders, curVisits, prvVisits] = await Promise.all([
          m.getOrders(token.user_id, cur.from, cur.to, 0).catch(() => null),
          m.getOrders(token.user_id, prev.from, prev.to, 0).catch(() => null),
          m.getVisitsTrend(token.user_id, cur.from, cur.to).catch(() => null),
          m.getVisitsTrend(token.user_id, prev.from, prev.to).catch(() => null),
        ]);
        if (cancelled) return;
        setOrders((curOrders?.results || []) as MlOrder[]);
        setPrevOrders((prvOrders?.results || []) as MlOrder[]);
        setVisitsData(curVisits);
        setPrevVisitsTotal(parseVisitTotal(prvVisits));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period, tick]);

  // Load local ads + ML seller items (titles + prices)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      const ads = await m.getLocalAds().catch(() => []);
      if (cancelled) return;
      setLocalAds(ads);

      // 1) IDs known from local ads
      const localIds = ads
        .flatMap((a: any) => (Array.isArray(a.ml_item_ids) ? a.ml_item_ids : []).concat(a.ml_item_id || []))
        .filter(Boolean) as string[];

      // 2) IDs from seller's ML catalog
      let sellerIds: string[] = [];
      try {
        const res = await m.getSellerItems(token.user_id);
        sellerIds = (res?.results || []) as string[];
      } catch {
        sellerIds = [];
      }

      const allIds = Array.from(new Set([...localIds, ...sellerIds].filter(Boolean)));
      if (allIds.length === 0) {
        if (!cancelled) {
          setMlPrices(new Map());
          setMlItems(new Map());
        }
        return;
      }

      // Fetch item details (title + price + sku) in chunks of 20
      const chunks: string[][] = [];
      for (let i = 0; i < allIds.length; i += 20) chunks.push(allIds.slice(i, i + 20));
      const results = await Promise.allSettled(chunks.map((c) => m.getItemsDetails(c)));
      if (cancelled) return;

      const itemsMap = new Map<string, { title: string; price: number | null; sku: string | null }>();
      const pricesMap = new Map<string, { price: number | null }>();
      results.forEach((r) => {
        if (r.status !== "fulfilled") return;
        const arr = Array.isArray(r.value) ? r.value : [];
        arr.forEach((entry: any) => {
          const body = entry?.body || entry;
          const id = body?.id || entry?.code;
          if (!id) return;
          const price = typeof body?.price === "number" ? body.price : null;
          const title = body?.title || id;
          const sku =
            body?.seller_sku ||
            body?.seller_custom_field ||
            body?.attributes?.find?.((x: any) => x.id === "SELLER_SKU")?.value_name ||
            null;
          itemsMap.set(id, { title, price, sku });
          pricesMap.set(id, { price });
        });
      });
      if (cancelled) return;
      setMlItems(itemsMap);
      setMlPrices(pricesMap);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick]);


  // Load yearly orders once per token/tick (cached)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setYearLoading(true);
      try {
        const data = await m.cachedCall(
          `year:${token.user_id}`,
          () => m.getYearOrders(token.user_id),
          10 * 60 * 1000
        );
        if (cancelled) return;
        setYearOrders({
          current: (data.current || []) as MlOrder[],
          previous: (data.previous || []) as MlOrder[],
        });
      } catch {
        if (!cancelled) setYearOrders({ current: [], previous: [] });
      } finally {
        if (!cancelled) setYearLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tick]);


  const visitsTotal = useMemo(() => parseVisitTotal(visitsData), [visitsData]);
  const visitsByDay = useMemo(() => parseVisitsByDay(visitsData), [visitsData]);

  const current = useMemo(() => aggregate(orders), [orders]);
  const previous = useMemo(() => aggregate(prevOrders), [prevOrders]);

  const series = useMemo(
    () => buildSeries(period, aggregateByDay(orders), visitsByDay),
    [period, orders, visitsByDay]
  );

  // Funnel stages (approximate using available signals)
  const funnel = useMemo(() => {
    const visits = visitsTotal;
    const uniqueVisitors = Math.round(visits * 0.7); // approximation
    const intent = Math.max(current.orderCount * 4, Math.round(visits * 0.08));
    const buyers = current.buyers;
    const sales = current.orderCount;
    return [
      { label: "Visitas", value: visits, color: COLOR_CYAN },
      { label: "Únicos", value: uniqueVisitors, color: COLOR_CYAN },
      { label: "Intenção", value: intent, color: COLOR_AMBER },
      { label: "Compradores", value: buyers, color: COLOR_MAGENTA },
      { label: "Vendas", value: sales, color: COLOR_PRIMARY },
    ];
  }, [visitsTotal, current]);

  const interactiveMetrics: InteractiveMetric[] = useMemo(
    () => [
      {
        key: "orders",
        label: "Vendas",
        color: COLOR_PRIMARY,
        value: current.orderCount,
        previous: previous.orderCount,
        format: INT,
      },
      {
        key: "revenue",
        label: "Faturamento",
        color: COLOR_MAGENTA,
        value: current.revenue,
        previous: previous.revenue,
        format: BRL,
      },
      {
        key: "ticket",
        label: "Ticket Médio",
        color: COLOR_AMBER,
        value: current.avgTicket,
        previous: previous.avgTicket,
        format: BRL,
      },
      {
        key: "visits",
        label: "Visitas",
        color: COLOR_CYAN,
        value: visitsTotal,
        previous: prevVisitsTotal,
        format: INT,
      },
    ],
    [current, previous, visitsTotal, prevVisitsTotal]
  );

  const conv = visitsTotal > 0 ? (current.orderCount / visitsTotal) * 100 : 0;
  const prevConv = prevVisitsTotal > 0 ? (previous.orderCount / prevVisitsTotal) * 100 : 0;
  const convDelta = prevConv > 0 ? ((conv - prevConv) / prevConv) * 100 : 0;

  // Units sold per ml_item_id in the current period
  const unitsByItem = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number }>();
    orders.forEach((o) => {
      (o.order_items || []).forEach((it) => {
        const id = it.item?.id;
        if (!id) return;
        const cur = map.get(id) || { units: 0, revenue: 0 };
        cur.units += Number(it.quantity || 0);
        cur.revenue += Number(it.quantity || 0) * Number(it.unit_price || 0);
        map.set(id, cur);
      });
    });
    return map;
  }, [orders]);

  // Titles from current-period orders (fallback when ML catalog doesn't include the item)
  const titlesFromOrders = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      (o.order_items || []).forEach((it) => {
        if (it.item?.id && it.item?.title) map.set(it.item.id, it.item.title);
      });
    });
    return map;
  }, [orders]);

  // Cost breakdown rows — local ads first, then ML-only items (no local pricing)
  const adCostRows: AdCostRow[] = useMemo(() => {
    const coveredIds = new Set<string>();
    const rows: AdCostRow[] = [];

    localAds.forEach((a: any) => {
      const ids: string[] = Array.from(
        new Set([a.ml_item_id, ...(Array.isArray(a.ml_item_ids) ? a.ml_item_ids : [])].filter(Boolean))
      );
      ids.forEach((id) => coveredIds.add(id));
      let unitsSold = 0;
      let revenue = 0;
      ids.forEach((id) => {
        const v = unitsByItem.get(id);
        if (v) {
          unitsSold += v.units;
          revenue += v.revenue;
        }
      });
      const unitCost = Number(a.cost_price || a.products?.cost_price || 0);
      const fee = Number(a.marketplace_fee || 0);
      const shipping = Number(a.shipping_cost || 0);
      const packaging = Number(a.packaging_cost || 0);
      const transport = Number(a.transport_cost || 0);
      const tax = Number(a.tax || 0);
      const finalPrice = Number(a.final_price || 0);
      const totalProductCost = unitCost * unitsSold;
      const totalFee = fee * unitsSold;
      const totalShipping = shipping * unitsSold;
      const totalPackaging = packaging * unitsSold;
      const totalTransport = transport * unitsSold;
      const totalTax = tax * unitsSold;
      const totalCost = totalProductCost + totalFee + totalShipping + totalPackaging + totalTransport + totalTax;
      const grossProfit = revenue - totalCost;
      const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      const fallbackId = ids[0] || null;
      const mlTitle = fallbackId ? mlItems.get(fallbackId)?.title : null;
      const title =
        (Array.isArray(a.titles) && a.titles[0]) || a.products?.name || mlTitle || "Anúncio";
      rows.push({
        adId: a.id,
        mlItemId: fallbackId,
        title,
        sku: a.products?.sku || (fallbackId ? mlItems.get(fallbackId)?.sku || null : null),
        unitsSold,
        revenue,
        unitCost,
        marketplaceFee: fee,
        shippingCost: shipping,
        packagingCost: packaging,
        transportCost: transport,
        tax,
        finalPrice: finalPrice || (fallbackId ? mlItems.get(fallbackId)?.price || 0 : 0),
        totalProductCost,
        totalFee,
        totalShipping,
        totalPackaging,
        totalTransport,
        totalTax,
        totalCost,
        grossProfit,
        margin,
      });
    });

    // ML-only items: from ML catalog OR from sold orders not yet covered
    const extraIds = new Set<string>();
    mlItems.forEach((_v, id) => {
      if (!coveredIds.has(id)) extraIds.add(id);
    });
    unitsByItem.forEach((_v, id) => {
      if (!coveredIds.has(id)) extraIds.add(id);
    });

    extraIds.forEach((id) => {
      const sold = unitsByItem.get(id);
      const info = mlItems.get(id);
      const unitsSold = sold?.units || 0;
      const revenue = sold?.revenue || 0;
      const finalPrice = info?.price ?? (unitsSold > 0 ? revenue / unitsSold : 0);
      const title = info?.title || titlesFromOrders.get(id) || id;
      rows.push({
        adId: `ml:${id}`,
        mlItemId: id,
        title,
        sku: info?.sku || null,
        unitsSold,
        revenue,
        unitCost: 0,
        marketplaceFee: 0,
        shippingCost: 0,
        packagingCost: 0,
        transportCost: 0,
        tax: 0,
        finalPrice,
        totalProductCost: 0,
        totalFee: 0,
        totalShipping: 0,
        totalPackaging: 0,
        totalTransport: 0,
        totalTax: 0,
        totalCost: 0,
        grossProfit: revenue,
        margin: revenue > 0 ? 100 : 0,
      });
    });

    return rows;
  }, [localAds, unitsByItem, mlItems, titlesFromOrders]);


  // Composition aggregates
  const composition = useMemo(() => {
    const sum = (key: keyof AdCostRow) => adCostRows.reduce((s, r) => s + (r[key] as number), 0);
    const totalRevenue = sum("revenue");
    return {
      revenue: totalRevenue,
      slices: [
        { label: "Custo do Produto", value: sum("totalProductCost"), color: COLOR_PRIMARY },
        { label: "Taxa Mercado Livre", value: sum("totalFee"), color: COLOR_MAGENTA },
        { label: "Frete", value: sum("totalShipping"), color: COLOR_CYAN },
        { label: "Embalagem", value: sum("totalPackaging"), color: COLOR_AMBER },
        { label: "Transporte", value: sum("totalTransport"), color: "#8B5CF6" },
        { label: "Imposto", value: sum("totalTax"), color: "#F43F5E" },
      ],
    };
  }, [adCostRows]);

  // Price sync rows
  const priceSyncRows: PriceSyncRow[] = useMemo(() => {
    const out: PriceSyncRow[] = [];
    localAds.forEach((a: any) => {
      const ids: string[] = Array.from(
        new Set([a.ml_item_id, ...(Array.isArray(a.ml_item_ids) ? a.ml_item_ids : [])].filter(Boolean))
      );
      if (ids.length === 0) return;
      const title = (Array.isArray(a.titles) && a.titles[0]) || a.products?.name || "Anúncio";
      const appPrice = Number(a.final_price || 0);
      ids.forEach((id) => {
        const ml = mlPrices.get(id);
        const mlPrice = ml?.price ?? null;
        const diff = mlPrice !== null ? mlPrice - appPrice : 0;
        const diffPct = mlPrice !== null && appPrice > 0 ? (diff / appPrice) * 100 : 0;
        let status: PriceSyncRow["status"] = "missing";
        if (mlPrice !== null) {
          const abs = Math.abs(diffPct);
          status = abs < 1 ? "ok" : abs <= 5 ? "warn" : "alert";
        }
        out.push({ adId: `${a.id}:${id}`, mlItemId: id, title, appPrice, mlPrice, diff, diffPct, status });
      });
    });
    return out;
  }, [localAds, mlPrices]);

  // Monthly sales (last 12 months current vs previous year)
  const monthlySales: MonthlySalesPoint[] = useMemo(() => {
    const monthsLabel = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const now = new Date();
    const buckets: MonthlySalesPoint[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        month: monthsLabel[d.getMonth()],
        monthKey: key,
        current: 0,
        previous: 0,
        orders: 0,
        units: 0,
      });
    }
    const idx = new Map(buckets.map((b, i) => [b.monthKey, i]));
    yearOrders.current.forEach((o: any) => {
      const dStr = (o.date_created || o.date_closed || "").slice(0, 7);
      const i = idx.get(dStr);
      if (i === undefined) return;
      buckets[i].current += Number(o.total_amount || 0);
      buckets[i].orders += 1;
      (o.order_items || []).forEach((it: any) => {
        buckets[i].units += Number(it.quantity || 0);
      });
    });
    yearOrders.previous.forEach((o: any) => {
      const d = new Date(o.date_created || o.date_closed || 0);
      if (!d.getTime()) return;
      // shift by +12 months to align with current period bucket
      const aligned = new Date(d.getFullYear() + 1, d.getMonth(), 1);
      const key = `${aligned.getFullYear()}-${String(aligned.getMonth() + 1).padStart(2, "0")}`;
      const i = idx.get(key);
      if (i === undefined) return;
      buckets[i].previous += Number(o.total_amount || 0);
    });
    return buckets;
  }, [yearOrders]);

  // Top products with seasonality
  const topProducts: TopProductRow[] = useMemo(() => {
    const map = new Map<string, { title: string; units: number; revenue: number; monthly: number[] }>();
    const monthIdx = new Map(monthlySales.map((b, i) => [b.monthKey, i]));
    yearOrders.current.forEach((o: any) => {
      const dStr = (o.date_created || o.date_closed || "").slice(0, 7);
      const mi = monthIdx.get(dStr);
      (o.order_items || []).forEach((it: any) => {
        const id = it.item?.id;
        if (!id) return;
        const cur = map.get(id) || { title: it.item?.title || id, units: 0, revenue: 0, monthly: new Array(12).fill(0) };
        const qty = Number(it.quantity || 0);
        cur.units += qty;
        cur.revenue += qty * Number(it.unit_price || 0);
        if (mi !== undefined) cur.monthly[mi] += qty;
        if (it.item?.title) cur.title = it.item.title;
        map.set(id, cur);
      });
    });
    return Array.from(map.entries())
      .map(([itemId, v]) => ({
        itemId,
        title: v.title,
        units: v.units,
        revenue: v.revenue,
        monthly: v.monthly,
        peakMonth: v.monthly.reduce((bestIdx, val, i, arr) => (val > arr[bestIdx] ? i : bestIdx), 0),
      }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 10);
  }, [yearOrders, monthlySales]);

  // Totals + monthly evolution for Costs view
  const grossRevenue = useMemo(
    () => orders.reduce((s, o) => s + Number(o.total_amount || 0), 0),
    [orders]
  );
  const totalCostSum = useMemo(
    () => adCostRows.reduce((s, r) => s + r.totalCost, 0),
    [adCostRows]
  );

  const monthlySeries = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number }>();
    orders.forEach((o) => {
      const d = new Date(o.date_created || (o as any).date_closed || 0);
      if (!d.getTime()) return;
      const key = `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const cur = map.get(key) || { month: key, revenue: 0 };
      cur.revenue += Number(o.total_amount || 0);
      map.set(key, cur);
    });
    const ratio = grossRevenue > 0 ? totalCostSum / grossRevenue : 0;
    return Array.from(map.values())
      .sort((a, b) => {
        const [am, ay] = a.month.split("/").map(Number);
        const [bm, by] = b.month.split("/").map(Number);
        return ay !== by ? ay - by : am - bm;
      })
      .map((v) => ({
        month: v.month,
        faturamento: v.revenue,
        custos: v.revenue * ratio,
        lucro: v.revenue * (1 - ratio),
      }));
  }, [orders, grossRevenue, totalCostSum]);

  const selectedAdRow = useMemo(
    () => (selectedAdId ? adCostRows.find((r) => r.adId === selectedAdId) || null : null),
    [selectedAdId, adCostRows]
  );

  // Resolve ml_item_ids covered by the selected ad
  const selectedAdMlIds = useMemo(() => {
    if (!selectedAdId) return new Set<string>();
    if (selectedAdId.startsWith("ml:")) return new Set([selectedAdId.slice(3)]);
    const ad = localAds.find((a: any) => a.id === selectedAdId);
    if (!ad) return new Set<string>();
    return new Set<string>(
      [ad.ml_item_id, ...(Array.isArray(ad.ml_item_ids) ? ad.ml_item_ids : [])].filter(Boolean) as string[]
    );
  }, [selectedAdId, localAds]);

  const adSales: AdSaleRow[] = useMemo(() => {
    if (selectedAdMlIds.size === 0) return [];
    const out: AdSaleRow[] = [];
    orders.forEach((o) => {
      (o.order_items || []).forEach((it) => {
        if (!selectedAdMlIds.has(it.item?.id)) return;
        const qty = Number(it.quantity || 0);
        const unit = Number(it.unit_price || 0);
        out.push({
          orderId: String(o.id),
          date: o.date_created || (o as any).date_closed || "",
          quantity: qty,
          unitPrice: unit,
          total: qty * unit,
        });
      });
    });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [orders, selectedAdMlIds]);

  const adEvolution: AdEvolutionPoint[] = useMemo(() => {
    if (!selectedAdRow || selectedAdMlIds.size === 0) return [];
    const days = daysFor(period);
    const map = new Map<string, { receita: number; qty: number }>();
    orders.forEach((o) => {
      const day = (o.date_created || (o as any).date_closed || "").slice(0, 10);
      if (!day) return;
      (o.order_items || []).forEach((it) => {
        if (!selectedAdMlIds.has(it.item?.id)) return;
        const qty = Number(it.quantity || 0);
        const rev = qty * Number(it.unit_price || 0);
        const cur = map.get(day) || { receita: 0, qty: 0 };
        cur.receita += rev;
        cur.qty += qty;
        map.set(day, cur);
      });
    });
    const marginRatio = selectedAdRow.revenue > 0 ? selectedAdRow.grossProfit / selectedAdRow.revenue : 0;
    const out: AdEvolutionPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const v = map.get(iso) || { receita: 0, qty: 0 };
      out.push({
        date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
        receita: v.receita,
        lucro: v.receita * marginRatio,
      });
    }
    return out;
  }, [orders, selectedAdRow, selectedAdMlIds, period]);

  // Forecast inputs: daily history (last 90 days from yearOrders.current)
  const dailyHistory = useMemo(() => {
    const map = new Map<string, { revenue: number; units: number }>();
    yearOrders.current.forEach((o: any) => {
      const d = (o.date_created || o.date_closed || "").slice(0, 10);
      if (!d) return;
      const cur = map.get(d) || { revenue: 0, units: 0 };
      cur.revenue += Number(o.total_amount || 0);
      cur.units += (o.order_items || []).reduce((s: number, it: any) => s + Number(it.quantity || 0), 0);
      map.set(d, cur);
    });
    const out: Array<{ date: string; revenue: number; units: number }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 89; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const v = map.get(iso) || { revenue: 0, units: 0 };
      out.push({ date: iso, revenue: v.revenue, units: v.units });
    }
    return out;
  }, [yearOrders]);

  const forecastMarginPct = useMemo(() => {
    return grossRevenue > 0 ? ((grossRevenue - totalCostSum) / grossRevenue) * 100 : 0;
  }, [grossRevenue, totalCostSum]);

  // Inventory: sales/30d per product_id (via local ads → ml_item_ids → orders)
  const salesByProduct = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const unitsByMl = new Map<string, number>();
    yearOrders.current.forEach((o: any) => {
      const d = new Date(o.date_created || o.date_closed || 0);
      if (!d.getTime() || d < cutoff) return;
      (o.order_items || []).forEach((it: any) => {
        const id = it.item?.id;
        if (!id) return;
        unitsByMl.set(id, (unitsByMl.get(id) || 0) + Number(it.quantity || 0));
      });
    });
    const byProduct = new Map<string, { monthlyUnits: number }>();
    localAds.forEach((a: any) => {
      if (!a.product_id) return;
      const ids = [a.ml_item_id, ...(Array.isArray(a.ml_item_ids) ? a.ml_item_ids : [])].filter(Boolean) as string[];
      const sum = ids.reduce((s, id) => s + (unitsByMl.get(id) || 0), 0);
      if (sum === 0) return;
      const cur = byProduct.get(a.product_id) || { monthlyUnits: 0 };
      cur.monthlyUnits += sum;
      byProduct.set(a.product_id, cur);
    });
    return byProduct;
  }, [yearOrders, localAds]);




  if (tokenLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!token) {
    return (
      <Card className="p-8">
        <CardContent className="flex flex-col items-center gap-4 text-center">
          <div className="size-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Plug className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Conta Mercado Livre não conectada</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Conecte sua conta para visualizar as métricas em tempo real.
            </p>
          </div>
          <Link
            to="/api"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plug className="size-4" /> Conectar agora
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <MetricsHeader
        period={period}
        onPeriodChange={setPeriod}
        onRefresh={() => {
          setTick((x) => x + 1);
          toast.success("Atualizando métricas...");
        }}
        loading={loading}
        subtitle="Visão completa da operação no Mercado Livre"
      />

      <div className="flex items-center gap-1 border-b border-border">
        {([
          ["OVERVIEW", "Visão Geral"],
          ["BY_AD", "Por Anúncio"],
          ["COSTS", "Custos & Receita"],
        ] as Array<[Tab, string]>).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              if (t !== "BY_AD") setSelectedAdId(null);
            }}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors",
              tab === t
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {loading && orders.length === 0 ? (
        <div className="grid gap-4">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : tab === "OVERVIEW" ? (
        <>
          <FunnelHeroCard
            title="Funil de Conversão"
            subtitle="Da visita à venda concluída"
            funnel={funnel}
            kpis={[
              { label: "Faturamento", value: current.revenue, previous: previous.revenue, format: BRL },
              { label: "Vendas", value: current.orderCount, previous: previous.orderCount, format: INT },
            ]}
            secondary={[
              {
                label: "Taxa de conversão",
                value: `${conv.toFixed(2)}%`,
                icon: <Percent className="size-4 text-muted-foreground" />,
                pill: {
                  value: `${convDelta >= 0 ? "+" : ""}${convDelta.toFixed(1)}%`,
                  positive: convDelta >= 0,
                },
              },
              { label: "Ticket médio", value: BRL(current.avgTicket), icon: <DollarSign className="size-4 text-muted-foreground" /> },
              { label: "Unidades vendidas", value: INT(current.units), icon: <Package className="size-4 text-muted-foreground" /> },
              { label: "Compradores únicos", value: INT(current.buyers), icon: <Users className="size-4 text-muted-foreground" /> },
            ]}
          />

          <InteractiveLineChart metrics={interactiveMetrics} data={series} defaultKey="revenue" />

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <MultiSeriesChart
                title="Vendas vs Visitas"
                series={[
                  { key: "orders", label: "Vendas", color: COLOR_PRIMARY },
                  { key: "visits", label: "Visitas", color: COLOR_CYAN },
                ]}
                data={series}
                primaryKey="orders"
              />
            </div>

            <div className="grid gap-4">
              <ContextStatCard
                label="Taxa de Conversão"
                value={`${conv.toFixed(2)}%`}
                icon={TrendingUp}
                tone="primary"
                delta={prevConv > 0 ? { value: convDelta, positive: convDelta >= 0 } : undefined}
                context={`vs ${prevConv.toFixed(2)}% no período anterior`}
              />
              <ContextStatCard
                label="Visitas Totais"
                value={INT(visitsTotal)}
                icon={Eye}
                tone="cyan"
                delta={
                  prevVisitsTotal > 0
                    ? { value: ((visitsTotal - prevVisitsTotal) / prevVisitsTotal) * 100, positive: visitsTotal >= prevVisitsTotal }
                    : undefined
                }
                context="Tráfego em todos os anúncios ativos"
              />
              <ContextStatCard
                label="Pedidos no Período"
                value={INT(current.orderCount)}
                icon={ShoppingCart}
                tone="magenta"
                delta={
                  previous.orderCount > 0
                    ? { value: ((current.orderCount - previous.orderCount) / previous.orderCount) * 100, positive: current.orderCount >= previous.orderCount }
                    : undefined
                }
              />
            </div>
          </div>

          {visitsTotal === 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-500/90 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div>
                Dados de visitas indisponíveis via API para este período. Métricas baseadas em visitas podem aparecer zeradas.
              </div>
            </div>
          )}

          {yearLoading && yearOrders.current.length === 0 ? (
            <Skeleton className="h-80 w-full" />
          ) : (
            <YearlySalesChart data={monthlySales} />
          )}

          <TopProductsSeasonality rows={topProducts} />

          <div className="grid gap-4 lg:grid-cols-2">
            <CostCompositionCard revenue={composition.revenue} slices={composition.slices} />
            <PriceSyncCard rows={priceSyncRows} />
          </div>
        </>
      ) : tab === "BY_AD" ? (
        selectedAdRow ? (
          <AdDetailView row={selectedAdRow} onBack={() => setSelectedAdId(null)} />
        ) : (
          <AdCostBreakdownTable rows={adCostRows} onSelect={(id) => setSelectedAdId(id)} />
        )
      ) : (
        <CostsRevenueView
          rows={adCostRows}
          grossRevenue={grossRevenue}
          ordersCount={current.orderCount}
          monthly={monthlySeries}
          onSelectAd={(id) => {
            setSelectedAdId(id);
            setTab("BY_AD");
          }}
        />
      )}

    </div>
  );
}


function aggregate(orders: MlOrder[]) {
  let revenue = 0;
  let units = 0;
  const buyers = new Set<string>();
  orders.forEach((o) => {
    revenue += Number(o.total_amount || 0);
    (o.order_items || []).forEach((it) => {
      units += Number(it.quantity || 0);
    });
    const bid = o.buyer?.id ? String(o.buyer.id) : "";
    if (bid) buyers.add(bid);
  });
  return {
    revenue,
    units,
    buyers: buyers.size,
    orderCount: orders.length,
    avgTicket: orders.length > 0 ? revenue / orders.length : 0,
  };
}
