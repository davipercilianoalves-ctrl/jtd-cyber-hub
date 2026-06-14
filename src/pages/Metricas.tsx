// Métricas — análise completa da operação (Visão Geral / Por Anúncio / Detalhe)
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BarChart2,
  RefreshCcw,
  Plug,
  DollarSign,
  CheckCircle2,
  Package,
  TrendingUp,
  Eye,
  Users,
  Percent,
  Search,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
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

type Marketplace = "ALL" | "ML";
type Period = "7D" | "30D" | "MONTH" | "YEAR" | "CUSTOM";
type Tab = "OVERVIEW" | "BY_AD";

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
      className={`rounded-full border px-3 py-1 text-xs font-mono uppercase tracking-wider transition-colors ${
        active
          ? "bg-[color:var(--cyan)]/15 border-[color:var(--cyan)]/50 text-[color:var(--cyan)]"
          : "border-border text-muted-foreground hover:border-[color:var(--cyan)]/40 hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function MetricCard({
  label,
  value,
  icon,
  loading,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="jtd-glass p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="opacity-80">{icon}</div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <div className={`text-2xl font-bold ${valueClass}`}>{value ?? "—"}</div>
      )}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-background/90 backdrop-blur px-3 py-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="text-[color:var(--cyan)] font-bold">{BRL(Number(payload[0].value))}</div>
    </div>
  );
}

function SalesChart({ data, loading }: { data: Array<{ date: string; total: number }>; loading?: boolean }) {
  if (loading) return <Skeleton className="h-[260px] w-full" />;
  if (!data.length) {
    return (
      <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
        Sem dados no período
      </div>
    );
  }
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="hsl(var(--foreground) / 0.08)" vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(Number(v))}`} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(0,255,255,0.2)" }} />
          <Line type="monotone" dataKey="total" stroke="#00FFFF" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: "#00FFFF" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Funnel({ visits, cartAttempts, sales, salesValue, cartValue, stages = 3 }: {
  visits: number; cartAttempts: number; sales: number; salesValue: number; cartValue: number; stages?: 2 | 3;
}) {
  const noData = visits === 0;
  const H = 120;

  if (stages === 2) {
    const conv = visits > 0 ? ((sales / visits) * 100).toFixed(1) : "0.0";
    const max = Math.max(visits, 1);
    const w1 = 100;
    const w2 = Math.max(10, (sales / max) * 100);

    function trap(x1: number, x2: number, l: number, r: number) {
      const yT1 = (H - (H * l) / 100) / 2;
      const yB1 = H - yT1;
      const yT2 = (H - (H * r) / 100) / 2;
      const yB2 = H - yT2;
      return <polygon points={`${x1},${yT1} ${x2},${yT2} ${x2},${yB2} ${x1},${yB1}`} fill="url(#funnelGrad)" />;
    }

    return (
      <div className="space-y-3">
        {noData && (
          <div className="flex items-center gap-2 text-xs text-yellow-500/80">
            <AlertTriangle size={14} /> Dados de visitas indisponíveis via API
          </div>
        )}
        <div className="w-full overflow-hidden">
          <svg viewBox="0 0 800 140" className="w-full h-auto">
            <defs>
              <linearGradient id="funnelGrad" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#BFFF00" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {trap(0, 780, w1, w2)}
            <g>
              <rect x={390 - 32} y="125" width="64" height="14" rx="7" fill="hsl(var(--background))" stroke="hsl(var(--primary) / 0.4)" />
              <text x={390} y="135" textAnchor="middle" fontSize="10" fill="#00FFFF" fontFamily="monospace">{conv}%</text>
            </g>
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Visitas Únicas</div>
            <div className="text-lg font-bold text-[color:var(--cyan)]">{noData ? "—" : visits.toLocaleString("pt-BR")}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground">Vendas</div>
            <div className="text-lg font-bold text-[color:var(--lime)]">{sales.toLocaleString("pt-BR")}</div>
            <div className="text-[10px] text-muted-foreground">{BRL(salesValue)}</div>
          </div>
        </div>
      </div>
    );
  }

  const v2c = visits > 0 ? ((cartAttempts / visits) * 100).toFixed(1) : "0.0";
  const c2s = cartAttempts > 0 ? ((sales / cartAttempts) * 100).toFixed(1) : "0.0";

  const max = Math.max(visits, 1);
  const w1 = 100;
  const w2 = Math.max(20, (cartAttempts / max) * 100);
  const w3 = Math.max(10, (sales / max) * 100);
  const cx1 = 0, cx2 = 260, cx3 = 520, cx4 = 780;

  function trapezoid(x1: number, x2: number, leftPct: number, rightPct: number, color: string) {
    const yTop1 = (H - (H * leftPct) / 100) / 2;
    const yBot1 = H - yTop1;
    const yTop2 = (H - (H * rightPct) / 100) / 2;
    const yBot2 = H - yTop2;
    return <polygon points={`${x1},${yTop1} ${x2},${yTop2} ${x2},${yBot2} ${x1},${yBot1}`} fill={color} />;
  }

  return (
    <div className="space-y-3">
      {noData && (
        <div className="flex items-center gap-2 text-xs text-yellow-500/80">
          <AlertTriangle size={14} /> Dados de visitas indisponíveis via API
        </div>
      )}
      <div className="w-full overflow-hidden">
        <svg viewBox="0 0 800 140" className="w-full h-auto">
          <defs>
            <linearGradient id="funnelGrad" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#BFFF00" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          {trapezoid(cx1, cx2, w1, w2, "url(#funnelGrad)")}
          {trapezoid(cx2, cx3, w2, w3, "url(#funnelGrad)")}
          {trapezoid(cx3, cx4, w3, Math.max(8, w3 * 0.85), "url(#funnelGrad)")}
          <g>
            <rect x={cx2 - 30} y="125" width="60" height="14" rx="7" fill="hsl(var(--background))" stroke="hsl(var(--primary) / 0.4)" />
            <text x={cx2} y="135" textAnchor="middle" fontSize="10" fill="#00FFFF" fontFamily="monospace">{v2c}%</text>
            <rect x={cx3 - 30} y="125" width="60" height="14" rx="7" fill="hsl(var(--background))" stroke="hsl(var(--primary) / 0.4)" />
            <text x={cx3} y="135" textAnchor="middle" fontSize="10" fill="#BFFF00" fontFamily="monospace">{c2s}%</text>
          </g>
        </svg>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Visitas Únicas</div>
          <div className="text-lg font-bold text-[color:var(--cyan)]">{noData ? "—" : visits.toLocaleString("pt-BR")}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Intenção de Compra</div>
          <div className="text-lg font-bold text-foreground">{noData ? "—" : cartAttempts.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">{noData ? "" : BRL(cartValue)}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted-foreground">Vendas</div>
          <div className="text-lg font-bold text-[color:var(--lime)]">{sales.toLocaleString("pt-BR")}</div>
          <div className="text-[10px] text-muted-foreground">{BRL(salesValue)}</div>
        </div>
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
    // Inicializa com todos os anúncios ativos
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
        if (!ad) return;
        const row = map.get(ad.id);
        if (!row) return;
        const revenue = it.unit_price * it.quantity;
        const unitCost = Number(ad.cost_price ?? ad.products?.cost_price ?? 0) || 0;
        const feePct = Number(ad.marketplace_fee ?? 0);
        const fee = feePct > 0 ? revenue * (feePct / 100) : Number(it.sale_fee ?? 0) * it.quantity;
        const adShip = Number(ad.shipping_cost ?? 0);
        const ship = adShip > 0 ? adShip * it.quantity : (mlShip > 0 && orderRev > 0 ? mlShip * (revenue / orderRev) : 0);
        const pack = Number(ad.packaging_cost ?? 0) * it.quantity;
        const trans = Number(ad.transport_cost ?? 0) * it.quantity;
        const taxPct = Number(ad.tax ?? 0);
        const taxV = taxPct > 0 ? revenue * (taxPct / 100) : 0;
        const totalCost = unitCost * it.quantity + fee + ship + pack + trans + taxV;
        row.sales += 1;
        row.units += Number(it.quantity || 0);
        row.revenue += revenue;
        row.profit += revenue - totalCost;
        // intenção de compra: usamos pelo menos o nº de pedidos como proxy se não houver outro
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
      <div className="jtd-glass p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 className="text-[color:var(--cyan)]" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-foreground">Métricas</h2>
              <p className="text-sm text-muted-foreground">Análise completa da sua operação</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={ordersLoading}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-mono uppercase tracking-wider hover:border-[color:var(--cyan)]/50 hover:text-[color:var(--cyan)] transition-colors disabled:opacity-50"
          >
            {ordersLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCcw size={14} />}
            Atualizar
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-1">Marketplace</span>
          <PillButton active={marketplace === "ALL"} onClick={() => setMarketplace("ALL")}>Todos</PillButton>
          <PillButton active={marketplace === "ML"} onClick={() => setMarketplace("ML")}>Mercado Livre</PillButton>
          <span className="mx-3 h-4 w-px bg-border" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-1">Período</span>
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
        <div className="jtd-glass p-8 text-center space-y-4">
          <Plug className="mx-auto text-muted-foreground" size={36} />
          <div>
            <h3 className="text-lg font-bold">Mercado Livre não conectado</h3>
            <p className="text-sm text-muted-foreground">Conecte sua conta para visualizar as métricas.</p>
          </div>
          <Link to="/api" className="inline-flex items-center gap-2 rounded-md bg-[color:var(--cyan)]/15 border border-[color:var(--cyan)]/40 text-[color:var(--cyan)] px-4 py-2 text-sm font-mono uppercase tracking-wider hover:bg-[color:var(--cyan)]/25">
            Ir para API
          </Link>
        </div>
      )}

      {mlConnected && (
        <>
          {/* TABS */}
          <div className="flex items-center gap-2">
            <PillButton active={tab === "OVERVIEW"} onClick={() => { setTab("OVERVIEW"); setSelectedAdId(null); }}>Visão Geral</PillButton>
            <PillButton active={tab === "BY_AD"} onClick={() => setTab("BY_AD")}>Por Anúncio</PillButton>
          </div>

          {ordersError && (
            <div className="jtd-glass p-4 flex items-start gap-3 border border-yellow-500/30">
              <AlertTriangle className="text-yellow-500 mt-0.5 shrink-0" size={18} />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-yellow-500">Dados parcialmente indisponíveis</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{ordersError}</p>
              </div>
              <button onClick={loadOrders} disabled={ordersLoading}
                className="rounded-md border border-yellow-500/40 text-yellow-500 px-3 py-1 text-xs font-mono uppercase tracking-wider hover:bg-yellow-500/10 disabled:opacity-50">
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
        <MetricCard label="Vendas Brutas" value={BRL(overview.grossSales)} icon={<DollarSign className="text-[color:var(--cyan)]" size={18} />} loading={ordersLoading} valueClass="text-[color:var(--cyan)]" />
        <MetricCard label="Vendas Concluídas" value={BRL(overview.paidSales)} icon={<CheckCircle2 className="text-[color:var(--lime)]" size={18} />} loading={ordersLoading} valueClass="text-[color:var(--lime)]" />
        <MetricCard label="Unidades Vendidas" value={overview.units} icon={<Package className="text-pink-400" size={18} />} loading={ordersLoading} valueClass="text-pink-400" />
        <MetricCard label="Preço Médio / Un." value={BRL(overview.avgUnit)} icon={<TrendingUp size={18} />} loading={ordersLoading} />
        <MetricCard label="Visitas Únicas" value={visitsTotal ?? "—"} icon={<Eye className="text-[color:var(--cyan)]" size={18} />} loading={visitsLoading} valueClass="text-[color:var(--cyan)]" />
        <MetricCard label="Total de Visitas" value={visitsTotal ?? "—"} icon={<Eye className="text-muted-foreground" size={18} />} loading={visitsLoading} />
        <MetricCard label="Compradores Únicos" value={overview.buyers} icon={<Users className="text-pink-400" size={18} />} loading={ordersLoading} valueClass="text-pink-400" />
        <div title="Vendas ÷ Visitas Únicas">
          <MetricCard label="Conversão da Conta" value={conv != null ? `${conv.toFixed(1)}%` : "—"} icon={<Percent className="text-[color:var(--lime)]" size={18} />} loading={visitsLoading} valueClass="text-[color:var(--lime)]" />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground italic -mt-2">* Dados de visitas agregados da conta via API do ML</p>

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
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs font-mono text-muted-foreground">SKU {row.sku || "—"}</span>
          <span className="text-2xl font-bold text-[color:var(--cyan)]">{BRL(adCosts.price)}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${ad.is_active ? "bg-green-500/10 text-green-500" : "bg-muted/20 text-muted-foreground"}`}>
            {ad.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Receita" value={BRL(row.revenue)} icon={<DollarSign className="text-[color:var(--cyan)]" size={18} />} valueClass="text-[color:var(--cyan)]" />
        <MetricCard label="Vendas" value={row.sales} icon={<CheckCircle2 className="text-[color:var(--lime)]" size={18} />} valueClass="text-[color:var(--lime)]" />
        <MetricCard label="Unidades" value={row.units} icon={<Package className="text-pink-400" size={18} />} valueClass="text-pink-400" />
        <MetricCard label="Lucro" value={BRL(row.profit)} icon={<TrendingUp size={18} />} valueClass={row.profit >= 0 ? "text-[color:var(--lime)]" : "text-red-500"} />
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
