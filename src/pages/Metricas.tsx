// Métricas — análise completa da operação (Visão Geral / Por Anúncio / Detalhe)
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  RefreshCcw,
  Plug,
  Search,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMetricas } from "@/hooks/useMetricas";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { TopRankings } from "@/components/metricas/TopRankings";
import { YearlyProductChart, ProductPicker } from "@/components/metricas/YearlyProductChart";


type Marketplace = "ALL" | "ML";
type Period = "7D" | "30D" | "MONTH" | "YEAR" | "CUSTOM";
type Tab = "OVERVIEW" | "BY_AD" | "PRODUCT";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function startOfPeriod(p: Period, from?: string): Date {
  const now = new Date();
  const d = new Date(now);
  if (p === "7D") { d.setDate(d.getDate() - 7); d.setHours(0,0,0,0); return d; }
  if (p === "30D") { d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; }
  if (p === "MONTH") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "YEAR") return new Date(now.getFullYear(), 0, 1);
  return from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
}
function endOfPeriod(p: Period, to?: string): Date {
  if (p === "CUSTOM" && to) { const d = new Date(to); d.setHours(23,59,59,999); return d; }
  const n = new Date(); n.setHours(23,59,59,999); return n;
}

function fmtDM(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}`;
}

// ============= Componentes auxiliares =============

function PillButton({ active, onClick, children, disabled }: { active?: boolean; onClick?: () => void; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary/10 border-primary/40 text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  label,
  value,
  loading,
  highlight = false,
  delta,
}: {
  label: string;
  value: string | number | null;
  loading?: boolean;
  highlight?: boolean;
  delta?: { value: number; positive: boolean } | null;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 transition-colors hover:border-border/80">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      {loading ? (
        <Skeleton className="h-8 w-28 mt-2" />
      ) : (
        <div className={`text-3xl font-bold mt-1 tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
          {value ?? "—"}
        </div>
      )}
      {delta && !loading && (
        <div className={`text-xs mt-1 font-medium ${delta.positive ? "text-emerald-500" : "text-red-500"}`}>
          {delta.positive ? "↑" : "↓"} {Math.abs(delta.value).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-xs">
      <div className="text-muted-foreground mb-0.5">{label}</div>
      <div className="text-primary font-semibold tabular-nums">{BRL(Number(payload[0].value))}</div>
    </div>
  );
}

function SalesChart({ data, loading }: { data: Array<{ date: string; total: number }>; loading?: boolean }) {
  if (loading) return <Skeleton className="h-[220px] w-full" />;
  if (!data.length) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        Sem dados no período
      </div>
    );
  }
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="salesArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(Number(v))}`} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--primary) / 0.3)" }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            fill="url(#salesArea)"
            dot={false}
            activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelShape({ stages }: { stages: Array<{ label: string; value: number; amount?: string }> }) {
  const W = 800;
  const H = 160;
  const maxVal = stages[0]?.value || 1;
  const heights = stages.map((s) => Math.max(0.08, (s.value || 0) / maxVal) * H);
  const segW = W / stages.length;

  const topPoints = stages.map((_, i) => ({ x: i * segW, y: (H - heights[i]) / 2 }));
  topPoints.push({ x: W, y: (H - heights[stages.length - 1]) / 2 });
  const botPoints = stages.map((_, i) => ({ x: i * segW, y: H - (H - heights[i]) / 2 }));
  botPoints.push({ x: W, y: H - (H - heights[stages.length - 1]) / 2 });

  let path = `M ${topPoints[0].x} ${topPoints[0].y}`;
  for (let i = 0; i < topPoints.length - 1; i++) {
    const cp = (topPoints[i].x + topPoints[i + 1].x) / 2;
    path += ` C ${cp} ${topPoints[i].y} ${cp} ${topPoints[i + 1].y} ${topPoints[i + 1].x} ${topPoints[i + 1].y}`;
  }
  path += ` L ${botPoints[botPoints.length - 1].x} ${botPoints[botPoints.length - 1].y}`;
  for (let i = botPoints.length - 1; i > 0; i--) {
    const cp = (botPoints[i].x + botPoints[i - 1].x) / 2;
    path += ` C ${cp} ${botPoints[i].y} ${cp} ${botPoints[i - 1].y} ${botPoints[i - 1].x} ${botPoints[i - 1].y}`;
  }
  path += " Z";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="funnelFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <path d={path} fill="url(#funnelFill)" />
    </svg>
  );
}

function Funnel({ visits, cartAttempts, sales, salesValue, cartValue, stages = 3 }: {
  visits: number; cartAttempts: number; sales: number; salesValue: number; cartValue: number; stages?: 2 | 3;
}) {
  const noData = visits === 0;
  const isTwo = stages === 2;

  const items = isTwo
    ? [
        { label: "Visitas Únicas", value: visits, amount: undefined as string | undefined },
        { label: "Vendas", value: sales, amount: BRL(salesValue) },
      ]
    : [
        { label: "Visitas Únicas", value: visits, amount: undefined as string | undefined },
        { label: "Intenção de Compra", value: cartAttempts, amount: BRL(cartValue) },
        { label: "Vendas", value: sales, amount: BRL(salesValue) },
      ];

  return (
    <div className="space-y-4">
      {noData && (
        <div className="flex items-center gap-2 text-xs text-yellow-500/80">
          <AlertTriangle size={14} /> Dados de visitas indisponíveis via API
        </div>
      )}
      <FunnelShape stages={items} />
      <div className={`grid ${isTwo ? "grid-cols-2" : "grid-cols-3"} gap-3 text-center`}>
        {items.map((it, i) => {
          const prev = i > 0 ? items[i - 1].value : 0;
          const pct = i > 0 && prev > 0 ? ((it.value / prev) * 100).toFixed(1) : null;
          return (
            <div key={it.label}>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{it.label}</div>
              <div className="text-xl font-bold text-foreground tabular-nums mt-0.5">
                {noData && i === 0 ? "—" : it.value.toLocaleString("pt-BR")}
              </div>
              {it.amount && <div className="text-xs text-muted-foreground tabular-nums">{it.amount}</div>}
              {pct && (
                <div className="text-[11px] text-primary mt-0.5">{pct}% do anterior</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ============= Tipos =============

interface MlOrder {
  id: number | string;
  date_created: string;
  date_closed?: string;
  status: string;
  total_amount: number;
  buyer?: { id?: number | string } | null;
  order_items: Array<{
    item: { id: string; title: string; seller_sku?: string | null };
    quantity: number;
    unit_price: number;
    sale_fee?: number | null;
  }>;
  payments?: Array<{ shipping_cost?: number; marketplace_fee?: number }>;
  shipping?: { cost?: number | null } | null;
}

interface LocalAd {
  id: string;
  product_id?: string | null;
  is_active: boolean;
  final_price: number | null;
  cost_price: number | null;
  marketplace_fee: number | null;
  shipping_cost: number | null;
  packaging_cost: number | null;
  transport_cost: number | null;
  tax: number | null;
  titles: string[] | null;
  keywords: string[] | null;
  products?: { name: string | null; sku: string | null; cost_price: number | null; keywords: string[] | null } | null;
}

function findAdForItem(ads: LocalAd[], title: string, sku?: string | null): LocalAd | null {
  const t = (title || "").toLowerCase().trim();
  const s = (sku || "").toLowerCase().trim();
  if (s) {
    const bySku = ads.find((a) => (a.products?.sku || "").toLowerCase() === s);
    if (bySku) return bySku;
  }
  if (t) {
    const byTitle = ads.find((a) =>
      (a.titles || []).some((x) => {
        const xl = (x || "").toLowerCase();
        return xl && (xl.includes(t) || t.includes(xl));
      }),
    );
    if (byTitle) return byTitle;
  }
  return null;
}

// ============= Página =============

export default function Metricas() {
  const m = useMetricas();
  const [tab, setTab] = useState<Tab>("OVERVIEW");
  const [marketplace, setMarketplace] = useState<Marketplace>("ALL");
  const [period, setPeriod] = useState<Period>("30D");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [token, setToken] = useState<any>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [orders, setOrders] = useState<MlOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [visitsTotal, setVisitsTotal] = useState<number | null>(null);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [ads, setAds] = useState<LocalAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  const [refreshTick, setRefreshTick] = useState(0);

  // Por Anúncio
  const [search, setSearch] = useState("");
  const [adFilter, setAdFilter] = useState<"ALL" | "PROFIT" | "VISITS" | "LOW_CONV" | "LOSS">("ALL");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [adVisitsMap, setAdVisitsMap] = useState<Record<string, number>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

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
    loadAds();
  }, []);

  async function loadAds() {
    setAdsLoading(true);
    try {
      const data = await m.getLocalAds();
      setAds(data as unknown as LocalAd[]);
    } finally {
      setAdsLoading(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadOrders();
    loadVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period, customFrom, customTo, refreshTick]);

  async function loadOrders() {
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const from = startOfPeriod(period, customFrom).toISOString();
      const to = endOfPeriod(period, customTo).toISOString();
      const data = await m.getOrders(token.user_id, from, to, 0);
      setOrders((data?.results || []) as MlOrder[]);
    } catch (e: any) {
      setOrdersError(e?.message || "Falha ao carregar pedidos");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadVisits() {
    if (!token) return;
    setVisitsLoading(true);
    try {
      const from = startOfPeriod(period, customFrom).toISOString().slice(0, 10);
      const to = endOfPeriod(period, customTo).toISOString().slice(0, 10);
      const data = await m.getVisitsTrend(token.user_id, from, to);
      const total = Number(data?.total_visits ?? data?.total ?? 0) || 0;
      setVisitsTotal(total || null);
    } catch {
      setVisitsTotal(null);
    } finally {
      setVisitsLoading(false);
    }
  }

  function handleRefresh() {
    setRefreshTick((x) => x + 1);
    toast.success("Atualizando métricas...");
  }

  // ============= Métricas Visão Geral =============
  const overview = useMemo(() => {
    const showML = marketplace !== "ALL" ? marketplace === "ML" : true;
    const safeOrders = showML ? orders : [];
    let grossSales = 0;
    let paidSales = 0;
    let units = 0;
    const buyers = new Set<string>();
    safeOrders.forEach((o) => {
      const total = Number(o.total_amount || 0);
      grossSales += total;
      if (o.status === "paid") paidSales += total;
      (o.order_items || []).forEach((it) => { units += Number(it.quantity || 0); });
      const bid = o.buyer?.id ? String(o.buyer.id) : "";
      if (bid) buyers.add(bid);
    });
    const avgUnit = units > 0 ? grossSales / units : 0;
    const conv = visitsTotal && visitsTotal > 0 ? (safeOrders.length / visitsTotal) * 100 : null;
    return { grossSales, paidSales, units, avgUnit, buyers: buyers.size, conv, orderCount: safeOrders.length };
  }, [orders, marketplace, visitsTotal]);

  // ============= Série de vendas (gráfico) =============
  const salesSeries = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => {
      const d = (o.date_created || o.date_closed || "").slice(0, 10);
      if (!d) return;
      map.set(d, (map.get(d) || 0) + Number(o.total_amount || 0));
    });
    const arr = Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, total]) => ({ date: fmtDM(iso), total }));
    return arr;
  }, [orders]);

  // ============= Breakdown de custos =============
  const costs = useMemo(() => {
    let fee = 0, shipping = 0, packaging = 0, transport = 0, tax = 0, cost = 0;
    orders.forEach((o) => {
      const mlShip = Number(o.shipping?.cost ?? 0) ||
        (o.payments || []).reduce((s, p) => s + Number(p?.shipping_cost || 0), 0);
      const orderRev = (o.order_items || []).reduce((s, it) => s + it.unit_price * it.quantity, 0);
      (o.order_items || []).forEach((it) => {
        const ad = findAdForItem(ads, it.item.title, it.item.seller_sku || null);
        const revenue = it.unit_price * it.quantity;
        const unitCost = Number(ad?.cost_price ?? ad?.products?.cost_price ?? 0) || 0;
        cost += unitCost * it.quantity;
        const feePct = Number(ad?.marketplace_fee ?? 0);
        if (ad && feePct > 0) fee += revenue * (feePct / 100);
        else if (it.sale_fee != null) fee += Number(it.sale_fee) * it.quantity;
        const adShip = Number(ad?.shipping_cost ?? 0);
        if (ad && adShip > 0) shipping += adShip * it.quantity;
        else if (ad && mlShip > 0 && orderRev > 0) shipping += mlShip * (revenue / orderRev);
        packaging += Number(ad?.packaging_cost ?? 0) * it.quantity;
        transport += Number(ad?.transport_cost ?? 0) * it.quantity;
        const taxPct = Number(ad?.tax ?? 0);
        if (ad && taxPct > 0) tax += revenue * (taxPct / 100);
      });
    });
    const total = fee + shipping + packaging + transport + tax + cost;
    const gross = overview.grossSales;
    const profit = gross - total;
    const margin = gross > 0 ? (profit / gross) * 100 : 0;
    return { fee, shipping, packaging, transport, tax, cost, total, gross, profit, margin };
  }, [orders, ads, overview.grossSales]);

  // ============= Por anúncio: agregação =============
  const adsAgg = useMemo(() => {
    type Row = {
      ad: LocalAd;
      title: string;
      sku: string;
      sales: number;
      units: number;
      revenue: number;
      profit: number;
      visits: number;
      attempts: number;
    };
    const map = new Map<string, Row>();
    // Inicializa com todos os anúncios ativos cadastrados localmente
    ads.forEach((ad) => {
      if (!ad.is_active) return;
      const title = ad.titles?.[0] || ad.products?.name || "Sem título";
      const sku = ad.products?.sku || "";
      map.set(ad.id, {
        ad, title, sku,
        sales: 0, units: 0, revenue: 0, profit: 0,
        visits: adVisitsMap[ad.id] || 0, attempts: 0,
      });
    });
    orders.forEach((o) => {
      const mlShip = Number(o.shipping?.cost ?? 0) ||
        (o.payments || []).reduce((s, p) => s + Number(p?.shipping_cost || 0), 0);
      const orderRev = (o.order_items || []).reduce((s, it) => s + it.unit_price * it.quantity, 0);
      (o.order_items || []).forEach((it) => {
        const ad = findAdForItem(ads, it.item.title, it.item.seller_sku || null);
        const revenue = it.unit_price * it.quantity;

        // Se não há anúncio local, cria linha "fantasma" a partir do item ML
        let rowKey: string;
        let row: Row | undefined;
        if (ad) {
          rowKey = ad.id;
          row = map.get(rowKey);
        } else {
          rowKey = `ml:${it.item.id || it.item.title}`;
          row = map.get(rowKey);
          if (!row) {
            row = {
              ad: {
                id: rowKey,
                is_active: true,
                final_price: it.unit_price,
                marketplace_fee: 0,
                titles: [it.item.title],
                products: { name: it.item.title, sku: it.item.seller_sku || "" },
              } as any,
              title: it.item.title,
              sku: it.item.seller_sku || "",
              sales: 0, units: 0, revenue: 0, profit: 0,
              visits: 0, attempts: 0,
            };
            map.set(rowKey, row);
          }
        }
        if (!row) return;

        const unitCost = ad ? (Number(ad.cost_price ?? ad.products?.cost_price ?? 0) || 0) : 0;
        const feePct = ad ? Number(ad.marketplace_fee ?? 0) : 0;
        const fee = feePct > 0 ? revenue * (feePct / 100) : Number(it.sale_fee ?? 0) * it.quantity;
        const adShip = ad ? Number(ad.shipping_cost ?? 0) : 0;
        const ship = adShip > 0 ? adShip * it.quantity : (mlShip > 0 && orderRev > 0 ? mlShip * (revenue / orderRev) : 0);
        const pack = ad ? Number(ad.packaging_cost ?? 0) * it.quantity : 0;
        const trans = ad ? Number(ad.transport_cost ?? 0) * it.quantity : 0;
        const taxPct = ad ? Number(ad.tax ?? 0) : 0;
        const taxV = taxPct > 0 ? revenue * (taxPct / 100) : 0;
        const totalCost = unitCost * it.quantity + fee + ship + pack + trans + taxV;
        row.sales += 1;
        row.units += Number(it.quantity || 0);
        row.revenue += revenue;
        row.profit += revenue - totalCost;
        row.attempts += 1;
      });
    });
    let arr = Array.from(map.values());
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      arr = arr.filter((r) => r.title.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q));
    }
    if (adFilter === "PROFIT") arr.sort((a, b) => b.profit - a.profit);
    else if (adFilter === "VISITS") arr.sort((a, b) => b.visits - a.visits);
    else if (adFilter === "LOW_CONV") {
      arr = arr.map((r) => ({ ...r, _c: r.visits > 0 ? r.sales / r.visits : 0 })) as any;
      arr.sort((a: any, b: any) => a._c - b._c);
    } else if (adFilter === "LOSS") {
      arr = arr.filter((r) => r.profit < 0).sort((a, b) => a.profit - b.profit);
    } else {
      arr.sort((a, b) => b.revenue - a.revenue);
    }
    return arr;
  }, [ads, orders, adVisitsMap, search, adFilter]);

  // ============= Detalhe do anúncio =============
  const selectedRow = useMemo(() => adsAgg.find((r) => r.ad.id === selectedAdId) || null, [adsAgg, selectedAdId]);

  // Carrega visitas dos anúncios visíveis sob demanda
  useEffect(() => {
    if (tab !== "BY_AD" || !token || !adsAgg.length) return;
    const toFetch = adsAgg.slice(0, 20).filter((r) => adVisitsMap[r.ad.id] === undefined);
    if (!toFetch.length) return;
    // Mapeia ad.id -> ML item via title/sku — só podemos usar visits se conhecemos o ML item id.
    // Como local ads não armazenam ML item id, marcamos 0 e dependemos do agregado de orders.
    const next: Record<string, number> = {};
    toFetch.forEach((r) => { next[r.ad.id] = 0; });
    setAdVisitsMap((prev) => ({ ...prev, ...next }));
  }, [tab, token, adsAgg]); // eslint-disable-line

  const mlConnected = !!token;

  // ============= RENDER =============
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Métricas</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Análise completa da sua operação</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={ordersLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
          >
            {ordersLoading ? <Loader2 className="animate-spin" size={13} /> : <RefreshCcw size={13} />}
            Atualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PillButton active={marketplace === "ALL"} onClick={() => setMarketplace("ALL")}>Todos</PillButton>
          <PillButton active={marketplace === "ML"} onClick={() => setMarketplace("ML")}>Mercado Livre</PillButton>
          <span className="mx-2 h-4 w-px bg-border" />
          {(["7D","30D","MONTH","YEAR","CUSTOM"] as Period[]).map((p) => (
            <PillButton key={p} active={period === p} onClick={() => setPeriod(p)}>
              {p === "7D" ? "7 Dias" : p === "30D" ? "30 Dias" : p === "MONTH" ? "Mês" : p === "YEAR" ? "Ano" : "Personalizado"}
            </PillButton>
          ))}
          {period === "CUSTOM" && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
              <span className="text-xs text-muted-foreground">→</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
            </div>
          )}
        </div>
      </div>

      {/* Estado sem API */}
      {!tokenLoading && !mlConnected && (
        <div className="bg-card border border-border rounded-xl p-10 text-center space-y-4">
          <Plug className="mx-auto text-muted-foreground" size={36} />
          <div>
            <h3 className="text-lg font-semibold">Mercado Livre não conectado</h3>
            <p className="text-sm text-muted-foreground">Conecte sua conta para visualizar as métricas.</p>
          </div>
          <Link to="/api" className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90">
            Ir para API
          </Link>
        </div>
      )}

      {mlConnected && (
        <>
          {/* TABS — underline style */}
          <div className="flex items-center gap-6 border-b border-border">
            {([
              { id: "OVERVIEW", label: "Visão Geral" },
              { id: "BY_AD", label: "Por Anúncio" },
              { id: "PRODUCT", label: "Por Produto" },
            ] as const).map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id as Tab); if (t.id !== "BY_AD") setSelectedAdId(null); }}
                  className={`pb-3 -mb-px text-sm transition-colors ${
                    active
                      ? "text-foreground font-semibold border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {ordersError && (
            <div className="bg-card rounded-xl p-4 flex items-start gap-3 border border-yellow-500/30">
              <AlertTriangle className="text-yellow-500 mt-0.5 shrink-0" size={18} />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-yellow-500">Dados parcialmente indisponíveis</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{ordersError}</p>
              </div>
              <button onClick={loadOrders} disabled={ordersLoading}
                className="rounded-md border border-yellow-500/40 text-yellow-500 px-3 py-1 text-xs font-medium hover:bg-yellow-500/10 disabled:opacity-50">
                {ordersLoading ? <Loader2 className="inline animate-spin" size={12} /> : "Tentar novamente"}
              </button>
            </div>
          )}

          {tab === "OVERVIEW" && (
            <OverviewView
              overview={overview}
              ordersLoading={ordersLoading}
              visitsLoading={visitsLoading}
              visitsTotal={visitsTotal}
              salesSeries={salesSeries}
              costs={costs}
            />
          )}

          {tab === "BY_AD" && !selectedRow && (
            <ByAdView
              rows={adsAgg}
              loading={ordersLoading || adsLoading}
              search={search}
              setSearch={setSearch}
              adFilter={adFilter}
              setAdFilter={setAdFilter}
              onSelect={(id: string) => setSelectedAdId(id)}
            />
          )}

          {tab === "BY_AD" && selectedRow && (
            <AdDetailView row={selectedRow} orders={orders} onBack={() => setSelectedAdId(null)} />
          )}
        </>
      )}
    </div>
  );
}


// ============= Sub-views =============

function OverviewView({
  overview, ordersLoading, visitsLoading, visitsTotal, salesSeries, costs,
}: any) {
  const conv = overview.conv;
  return (
    <>
      {/* SEÇÃO 1 — Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Vendas Brutas" value={BRL(overview.grossSales)} loading={ordersLoading} />
        <MetricCard label="Vendas Concluídas" value={BRL(overview.paidSales)} loading={ordersLoading} />
        <MetricCard label="Unidades Vendidas" value={overview.units} loading={ordersLoading} />
        <MetricCard label="Preço Médio / Un." value={BRL(overview.avgUnit)} loading={ordersLoading} />
        <MetricCard label="Visitas Únicas" value={visitsTotal ?? "—"} loading={visitsLoading} />
        <MetricCard label="Total de Visitas" value={visitsTotal ?? "—"} loading={visitsLoading} />
        <MetricCard label="Compradores Únicos" value={overview.buyers} loading={ordersLoading} />
        <div title="Vendas ÷ Visitas Únicas">
          <MetricCard label="Conversão da Conta" value={conv != null ? `${conv.toFixed(1)}%` : "—"} loading={visitsLoading} highlight />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">* Dados de visitas agregados da conta via API do ML</p>


      {/* SEÇÃO 2 — Gráfico */}
      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Evolução de Vendas</h3>
        <SalesChart data={salesSeries} loading={ordersLoading} />
      </div>

      {/* SEÇÃO 3 — Funil */}
      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Funil de Conversão</h3>
        <Funnel
          stages={2}
          visits={visitsTotal || 0}
          cartAttempts={0}
          sales={overview.orderCount}
          salesValue={overview.grossSales}
          cartValue={0}
        />
      </div>

      {/* SEÇÃO 4 — Custos */}
      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold">Custos do Período</h3>
        <p className="text-xs text-muted-foreground mb-4">Baseado nas vendas cruzadas com anúncios cadastrados</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <table className="w-full text-sm">
              <thead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">R$</th>
                  <th className="text-right py-2 w-24">% Fat.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {([
                  ["Taxa ML", costs.fee],
                  ["Frete", costs.shipping],
                  ["Embalagem", costs.packaging],
                  ["Transporte", costs.transport],
                  ["Imposto", costs.tax],
                  ["Custo Produto", costs.cost],
                ] as [string, number][]).map(([label, v]) => (
                  <tr key={label}>
                    <td className="py-2 text-foreground/90">{label}</td>
                    <td className="py-2 text-right">{BRL(v)}</td>
                    <td className="py-2 text-right text-muted-foreground">{costs.gross > 0 ? ((v / costs.gross) * 100).toFixed(1) : "0.0"}%</td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2 text-foreground">TOTAL CUSTOS</td>
                  <td className="py-2 text-right text-red-500">{BRL(costs.total)}</td>
                  <td className="py-2 text-right text-red-500">{costs.gross > 0 ? ((costs.total / costs.gross) * 100).toFixed(1) : "0.0"}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Faturamento Bruto</div>
              <div className="text-3xl font-bold text-[color:var(--cyan)]">{BRL(costs.gross)}</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Total Custos</div>
              <div className="text-2xl font-bold text-red-500">{BRL(costs.total)}</div>
            </div>
            <div className="rounded-lg border border-[color:var(--lime)]/40 bg-[color:var(--lime)]/5 p-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Lucro Líquido</div>
              <div className="text-3xl font-bold text-[color:var(--lime)]">{BRL(costs.profit)}</div>
              <div className="text-sm font-bold text-[color:var(--lime)] mt-1">Margem: {costs.margin.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ByAdView({
  rows, loading, search, setSearch, adFilter, setAdFilter, onSelect,
}: any) {
  const filters: Array<{ id: any; label: string }> = [
    { id: "ALL", label: "Todos" },
    { id: "PROFIT", label: "Maior Lucro" },
    { id: "VISITS", label: "Maior Visitas" },
    { id: "LOW_CONV", label: "Menor Conversão" },
    { id: "LOSS", label: "Prejuízo" },
  ];
  return (
    <div className="space-y-4">
      <div className="jtd-glass p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou SKU..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <PillButton key={f.id} active={adFilter === f.id} onClick={() => setAdFilter(f.id)}>{f.label}</PillButton>
          ))}
        </div>
      </div>

      <div className="jtd-glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground bg-muted/10">
              <tr>
                <th className="text-left px-4 py-3">Anúncio</th>
                <th className="text-right px-4 py-3">Preço Venda</th>
                <th className="text-right px-4 py-3">Você Recebe</th>
                <th className="text-right px-4 py-3">Vendas</th>
                <th className="text-right px-4 py-3" title="Visitas disponíveis via API do ML ao vincular ML item ID">Visitas 7d</th>
                <th className="text-right px-4 py-3">Conversão</th>
                <th className="text-right px-4 py-3">Lucro</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground"><Loader2 className="inline animate-spin" size={16} /> Carregando...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">Nenhum anúncio encontrado</td></tr>
              )}
              {!loading && rows.map((r: any) => {
                const price = Number(r.ad.final_price || 0);
                const feePct = Number(r.ad.marketplace_fee || 0);
                const youGet = price * (1 - feePct / 100);
                const hasVisits = r.visits > 0;
                const conv = hasVisits ? (r.sales / r.visits) * 100 : null;
                const convColor = conv == null ? "text-muted-foreground" : conv > 2 ? "text-[color:var(--lime)]" : conv >= 1 ? "text-yellow-500" : "text-red-500";
                const hasRevenue = r.revenue > 0;
                const profitColor = !hasRevenue ? "text-muted-foreground" : r.profit >= 0 ? "text-[color:var(--lime)]" : "text-red-500";
                return (
                  <tr key={r.ad.id} onClick={() => onSelect(r.ad.id)} className="hover:bg-muted/10 cursor-pointer">
                    <td className="px-4 py-3 max-w-[280px]">
                      <div className="truncate text-foreground">{r.title}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{r.sku || "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-[color:var(--cyan)] font-bold">{BRL(price)}</td>
                    <td className="px-4 py-3 text-right">{BRL(youGet)}</td>
                    <td className="px-4 py-3 text-right">{r.sales}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground" title="Visitas disponíveis via API do ML ao vincular ML item ID">{hasVisits ? r.visits : "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${convColor}`}>{conv == null ? "—" : `${conv.toFixed(1)}%`}</td>
                    <td className={`px-4 py-3 text-right font-bold ${profitColor}`}>{hasRevenue ? BRL(r.profit) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${r.ad.is_active ? "bg-green-500/10 text-green-500" : "bg-muted/20 text-muted-foreground"}`}>
                        {r.ad.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={16} className="text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdDetailView({ row, orders, onBack }: any) {
  const ad: LocalAd = row.ad;
  const [marketPos, setMarketPos] = useState<{ label: string; color: string; min: number; avg: number; max: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ad.product_id) { setMarketPos(null); return; }
      const { data } = await supabase
        .from("product_competitors")
        .select("price")
        .eq("product_id", ad.product_id);
      if (cancelled) return;
      const prices = (data || []).map((c: any) => Number(c.price)).filter((p: number) => p > 0);
      if (!prices.length) { setMarketPos(null); return; }
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const price = Number(ad.final_price || 0);
      const pos = price <= min * 1.05
        ? { label: "Abaixo do mercado", color: "text-[color:var(--lime)]" }
        : price <= avg * 1.10
        ? { label: "Dentro do mercado", color: "text-[color:var(--cyan)]" }
        : { label: "Acima do mercado", color: "text-red-500" };
      setMarketPos({ ...pos, min, avg, max });
    })();
    return () => { cancelled = true; };
  }, [ad]);


  // Orders desse anúncio
  const adOrders = useMemo(() => {
    return orders.filter((o: MlOrder) => (o.order_items || []).some((it) => findAdForItem([ad], it.item.title, it.item.seller_sku || null)));
  }, [orders, ad]);

  const series = useMemo(() => {
    const map = new Map<string, number>();
    adOrders.forEach((o: MlOrder) => {
      const d = (o.date_created || "").slice(0, 10);
      if (!d) return;
      let v = 0;
      (o.order_items || []).forEach((it) => {
        if (findAdForItem([ad], it.item.title, it.item.seller_sku || null)) v += it.unit_price * it.quantity;
      });
      map.set(d, (map.get(d) || 0) + v);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, total]) => ({ date: fmtDM(iso), total }));
  }, [adOrders, ad]);

  const adCosts = useMemo(() => {
    const price = Number(ad.final_price || 0);
    const unitCost = Number(ad.cost_price ?? ad.products?.cost_price ?? 0);
    const fee = price * (Number(ad.marketplace_fee || 0) / 100);
    const ship = Number(ad.shipping_cost || 0);
    const pack = Number(ad.packaging_cost || 0);
    const trans = Number(ad.transport_cost || 0);
    const tax = price * (Number(ad.tax || 0) / 100);
    const total = unitCost + fee + ship + pack + trans + tax;
    const profit = price - total;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    return { price, unitCost, fee, ship, pack, trans, tax, total, profit, margin };
  }, [ad]);

  const last20 = adOrders.slice(0, 20);

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} /> Voltar para lista
      </button>

      <div className="jtd-glass p-6">
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">
          Métricas / <span className="text-foreground">{row.title}</span>
        </div>
        <h2 className="text-2xl font-bold">{row.title}</h2>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <span className="text-xs font-mono text-muted-foreground">SKU {row.sku || "—"}</span>
          <span className="text-2xl font-bold text-[color:var(--cyan)]">{BRL(adCosts.price)}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${ad.is_active ? "bg-green-500/10 text-green-500" : "bg-muted/20 text-muted-foreground"}`}>
            {ad.is_active ? "Ativo" : "Inativo"}
          </span>
          {marketPos && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase border border-current/30 ${marketPos.color}`}>
              {marketPos.label}
            </span>
          )}
        </div>
        {marketPos && (
          <p className="text-xs text-muted-foreground mt-2">
            Concorrentes: Min {BRL(marketPos.min)} · Médio {BRL(marketPos.avg)} · Máx {BRL(marketPos.max)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Receita" value={BRL(row.revenue)} />
        <MetricCard label="Vendas" value={row.sales} />
        <MetricCard label="Unidades" value={row.units} />
        <MetricCard label="Lucro" value={BRL(row.profit)} highlight={row.profit >= 0} />
      </div>


      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Evolução de Vendas do Anúncio</h3>
        <SalesChart data={series} />
      </div>

      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Funil do Anúncio</h3>
        <Funnel
          visits={row.visits || 0}
          cartAttempts={row.attempts}
          sales={row.sales}
          salesValue={row.revenue}
          cartValue={row.revenue}
        />
      </div>

      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Breakdown de Custos (por unidade)</h3>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left py-2">Item</th>
              <th className="text-right py-2">R$</th>
              <th className="text-right py-2 w-24">% Preço</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {([
              ["Custo Produto", adCosts.unitCost],
              ["Taxa ML", adCosts.fee],
              ["Frete", adCosts.ship],
              ["Embalagem", adCosts.pack],
              ["Transporte", adCosts.trans],
              ["Imposto", adCosts.tax],
            ] as [string, number][]).map(([l, v]) => (
              <tr key={l}>
                <td className="py-2">{l}</td>
                <td className="py-2 text-right">{BRL(v)}</td>
                <td className="py-2 text-right text-muted-foreground">{adCosts.price > 0 ? ((v / adCosts.price) * 100).toFixed(1) : "0.0"}%</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right text-red-500">{BRL(adCosts.total)}</td>
              <td className="py-2 text-right text-red-500">{adCosts.price > 0 ? ((adCosts.total / adCosts.price) * 100).toFixed(1) : "0.0"}%</td>
            </tr>
            <tr className="font-bold">
              <td className="py-2">Lucro / Margem</td>
              <td className={`py-2 text-right ${adCosts.profit >= 0 ? "text-[color:var(--lime)]" : "text-red-500"}`}>{BRL(adCosts.profit)}</td>
              <td className={`py-2 text-right ${adCosts.margin >= 0 ? "text-[color:var(--lime)]" : "text-red-500"}`}>{adCosts.margin.toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="jtd-glass p-6">
        <h3 className="text-lg font-bold mb-4">Histórico de Vendas</h3>
        {last20.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem vendas no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">Data</th>
                <th className="text-right py-2">Qtd</th>
                <th className="text-right py-2">Valor</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {last20.map((o: MlOrder) => {
                const qty = (o.order_items || []).reduce((s, it) => {
                  if (findAdForItem([ad], it.item.title, it.item.seller_sku || null)) return s + Number(it.quantity || 0);
                  return s;
                }, 0);
                return (
                  <tr key={String(o.id)}>
                    <td className="py-2">{fmtDM(o.date_created)}</td>
                    <td className="py-2 text-right">{qty}</td>
                    <td className="py-2 text-right">{BRL(Number(o.total_amount || 0))}</td>
                    <td className="py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${
                        o.status === "paid" ? "bg-green-500/10 text-green-500" :
                        o.status === "cancelled" ? "bg-red-500/10 text-red-500" :
                        "bg-yellow-500/10 text-yellow-500"
                      }`}>{o.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
