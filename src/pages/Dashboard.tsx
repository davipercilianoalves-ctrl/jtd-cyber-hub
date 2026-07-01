// Dashboard JTD — visão geral de produtos, anúncios, kits, vendas ML e custos
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Package,
  Megaphone,
  Layers,
  Plug,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Trophy,
  Receipt,
  Truck,
  Box,
  Wallet,
  Loader2,
  Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMercadoLivre } from "@/hooks/useMercadoLivre";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Marketplace = "ALL" | "ML";
type Period = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function todayHumanPt() {
  const d = new Date();
  return d
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    .replace(/^\w/, (c) => c.toUpperCase());
}

function startOfPeriod(p: Period, customFrom?: string): Date {
  const now = new Date();
  if (p === "TODAY") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (p === "MONTH") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "YEAR") return new Date(now.getFullYear(), 0, 1);
  return customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
}
function endOfPeriod(p: Period, customTo?: string): Date {
  const now = new Date();
  if (p === "CUSTOM" && customTo) {
    const d = new Date(customTo);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return now;
}

interface MlOrder {
  id: number | string;
  date_closed?: string;
  date_created?: string;
  status?: string;
  total_amount?: number;
  order_items?: Array<{
    item?: { id?: string; title?: string };
    quantity?: number;
    unit_price?: number;
  }>;
}

export default function Dashboard() {
  // ===== State =====
  const [marketplace, setMarketplace] = useState<Marketplace>("ALL");
  const [period, setPeriod] = useState<Period>("MONTH");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [loadingLocal, setLoadingLocal] = useState(true);
  const [productsCount, setProductsCount] = useState(0);
  const [adsCount, setAdsCount] = useState(0);
  const [kitsCount, setKitsCount] = useState(0);
  const [adsToday, setAdsToday] = useState(0);
  const [kitsToday, setKitsToday] = useState(0);
  const [adsThisMonth, setAdsThisMonth] = useState(0);
  const [localProducts, setLocalProducts] = useState<Array<{ id: string; name: string; final_price?: number }>>([]);
  const [costs, setCosts] = useState({
    marketplace_fee: 0,
    shipping_cost: 0,
    packaging_cost: 0,
    transport_cost: 0,
    tax: 0,
  });

  const [token, setToken] = useState<any>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const [orders, setOrders] = useState<MlOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  // Meta de anúncios — localStorage
  const [adsGoal, setAdsGoal] = useState<number>(() => {
    if (typeof window === "undefined") return 30;
    return Number(localStorage.getItem("jtd_ads_goal") || 30);
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("jtd_ads_goal", String(adsGoal));
  }, [adsGoal]);

  const { callML } = useMercadoLivre();

  // ===== Loaders =====
  async function loadLocal() {
    setLoadingLocal(true);
    try {
      const now = new Date();
      const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [pRes, aRes, kRes, aTodayRes, kTodayRes, aMonthRes, prodList, adsCosts] =
        await Promise.all([
          supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("ads").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("kits").select("*", { count: "exact", head: true }).eq("is_active", true),
          supabase.from("ads").select("*", { count: "exact", head: true }).gte("created_at", startToday),
          supabase.from("kits").select("*", { count: "exact", head: true }).gte("created_at", startToday),
          supabase.from("ads").select("*", { count: "exact", head: true }).gte("created_at", startMonth),
          supabase.from("products").select("id, name").eq("is_active", true).order("created_at", { ascending: false }).limit(5),
          supabase.from("ads").select("marketplace_fee, shipping_cost, packaging_cost, transport_cost, tax").eq("is_active", true),
        ]);

      setProductsCount(pRes.count || 0);
      setAdsCount(aRes.count || 0);
      setKitsCount(kRes.count || 0);
      setAdsToday(aTodayRes.count || 0);
      setKitsToday(kTodayRes.count || 0);
      setAdsThisMonth(aMonthRes.count || 0);
      setLocalProducts((prodList.data as any) || []);

      const agg = { marketplace_fee: 0, shipping_cost: 0, packaging_cost: 0, transport_cost: 0, tax: 0 };
      (adsCosts.data || []).forEach((r: any) => {
        agg.marketplace_fee += Number(r.marketplace_fee || 0);
        agg.shipping_cost += Number(r.shipping_cost || 0);
        agg.packaging_cost += Number(r.packaging_cost || 0);
        agg.transport_cost += Number(r.transport_cost || 0);
        agg.tax += Number(r.tax || 0);
      });
      setCosts(agg);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocal(false);
    }
  }

  async function loadToken() {
    setTokenLoading(true);
    try {
      const { data } = await supabase.from("ml_tokens").select("id, user_id, expires_at, owner_id, created_at").maybeSingle();
      setToken(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTokenLoading(false);
    }
  }

  async function loadOrders() {
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const from = startOfPeriod(period, customFrom).toISOString();
      const to = endOfPeriod(period, customTo).toISOString();
      const ep =
        `/orders/search?seller=${token.user_id}` +
        `&order.date_created.from=${from}` +
        `&order.date_created.to=${to}` +
        `&sort=date_desc`;
      const data = await callML(ep);
      const results: MlOrder[] = data?.results || [];
      setOrders(results);
    } catch (e: any) {
      console.error(e);
      setOrdersError(e?.message || "Falha ao carregar vendas");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    loadLocal();
    loadToken();
  }, []);

  useEffect(() => {
    if (token) loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period, customFrom, customTo]);

  // Auto-refresh ML a cada 5 min
  useEffect(() => {
    if (!token) return;
    const t = setInterval(() => loadOrders(), 5 * 60 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, period, customFrom, customTo]);

  async function handleRefreshToken() {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("ml-refresh-token");
      if (error) throw error;
      toast.success("Token renovado");
      await loadToken();
    } catch (e: any) {
      toast.error("Falha ao renovar: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }

  // ===== Derived =====
  const showML = marketplace !== "ALL" ? marketplace === "ML" : true;

  const salesMetrics = useMemo(() => {
    const total = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const count = orders.length;
    return { total, count, avg: count ? total / count : 0 };
  }, [orders]);

  const ranking = useMemo(() => {
    if (!showML || !orders.length) return [];
    const map = new Map<string, { name: string; total: number; qty: number }>();
    orders.forEach((o) => {
      (o.order_items || []).forEach((it) => {
        const id = it.item?.id || it.item?.title || "?";
        const name = it.item?.title || "Sem título";
        const v = Number(it.unit_price || 0) * Number(it.quantity || 0);
        const cur = map.get(id) || { name, total: 0, qty: 0 };
        cur.total += v;
        cur.qty += Number(it.quantity || 0);
        map.set(id, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [orders, showML]);

  const totalCost =
    costs.marketplace_fee + costs.shipping_cost + costs.packaging_cost + costs.transport_cost + costs.tax;

  const goalPct = adsGoal > 0 ? Math.min(100, Math.round((adsThisMonth / adsGoal) * 100)) : 0;
  const goalColor = goalPct >= 100 ? "bg-green-500" : goalPct >= 80 ? "bg-[color:var(--cyan)]" : "bg-[color:var(--lime)]";

  const mlConnected = !!token;
  const apiDegraded = mlConnected && !!ordersError;

  // ===== UI =====
  return (
    <div className="space-y-6">
      {/* BLOCO 1 — Header */}
      <div className="jtd-glass p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
            <p className="text-sm text-muted-foreground capitalize">{todayHumanPt()}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-1">
              Marketplace
            </span>
            <PillButton active={marketplace === "ALL"} onClick={() => setMarketplace("ALL")}>
              Todos
            </PillButton>
            <PillButton active={marketplace === "ML"} onClick={() => setMarketplace("ML")}>
              Mercado Livre
            </PillButton>
            <button
              title="Em breve"
              disabled
              className="rounded-full border border-border px-3 py-1 text-xs font-mono uppercase text-muted-foreground/60 opacity-50 cursor-not-allowed"
            >
              Shopee
            </button>
          </div>
        </div>
      </div>

      {/* BLOCO 2 — Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickCard
          label="Total de Produtos"
          value={loadingLocal ? null : productsCount}
          icon={<Package className="text-[color:var(--lime)]" />}
          accent="lime"
        />
        <QuickCard
          label="Total de Anúncios"
          value={loadingLocal ? null : adsCount}
          icon={<Megaphone className="text-[color:var(--cyan)]" />}
          accent="cyan"
        />
        <QuickCard
          label="Total de Kits"
          value={loadingLocal ? null : kitsCount}
          icon={<Layers className="text-[color:var(--magenta)]" />}
          accent="magenta"
        />
        <div className="jtd-glass p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted/20 p-2">
              <Plug className="text-foreground" size={20} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">API ML</p>
              {tokenLoading ? (
                <Skeleton className="h-5 w-24 mt-1" />
              ) : mlConnected ? (
                <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 text-xs font-bold">
                  <CheckCircle2 size={12} /> Conectado
                </span>
              ) : (
                <Link to="/api" className="inline-flex items-center gap-1 mt-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 text-xs font-bold hover:bg-red-500/20">
                  <AlertCircle size={12} /> Desconectado
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BLOCO 3 — Vendas */}
      <div className="jtd-glass p-6 space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-[color:var(--cyan)]" />
            <h3 className="text-lg font-bold text-foreground">Vendas</h3>
            {apiDegraded && (
              <span className="rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 text-[10px] font-bold uppercase">
                API temporariamente indisponível
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["TODAY", "MONTH", "YEAR", "CUSTOM"] as Period[]).map((p) => (
              <PillButton key={p} active={period === p} onClick={() => setPeriod(p)}>
                {p === "TODAY" ? "Hoje" : p === "MONTH" ? "Mês" : p === "YEAR" ? "Ano" : "Personalizado"}
              </PillButton>
            ))}
            {period === "CUSTOM" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md bg-muted/20 border border-border px-2 py-1 text-xs text-foreground"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md bg-muted/20 border border-border px-2 py-1 text-xs text-foreground"
                />
              </>
            )}
          </div>
        </div>

        {!mlConnected ? (
          <EmptyHint
            icon={<Plug />}
            title="Conecte o Mercado Livre para ver vendas"
            action={
              <Link to="/api">
                <Button className="bg-[color:var(--lime)] text-black hover:bg-[color:var(--lime)]/80">Conectar API</Button>
              </Link>
            }
          />
        ) : ordersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyHint icon={<ShoppingCart />} title="Nenhuma venda encontrada no período" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricBox label="Total Vendido" value={BRL(salesMetrics.total)} icon={<DollarSign className="text-[color:var(--lime)]" />} />
              <MetricBox label="Nº de Vendas" value={String(salesMetrics.count)} icon={<ShoppingCart className="text-[color:var(--cyan)]" />} />
              <MetricBox label="Ticket Médio" value={BRL(salesMetrics.avg)} icon={<TrendingUp className="text-[color:var(--magenta)]" />} />
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest">Data</th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest">Produto</th>
                    <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-widest">Valor</th>
                    <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id} className="border-t border-border hover:bg-muted/10">
                      <td className="px-3 py-2 text-foreground/90 whitespace-nowrap">
                        {new Date(o.date_created || o.date_closed || Date.now()).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-3 py-2 text-foreground/90 truncate max-w-[280px]">
                        {o.order_items?.[0]?.item?.title || "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{BRL(Number(o.total_amount || 0))}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-muted/20 px-2 py-0.5 text-xs">{o.status || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => toast.info("Em breve")}>
                Ver todas
              </Button>
            </div>
          </>
        )}
      </div>

      {/* BLOCO 4 — Criação */}
      <div className="jtd-glass p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-[color:var(--lime)]" />
          <h3 className="text-lg font-bold text-foreground">Criação</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MetricBox label="Anúncios criados hoje" value={loadingLocal ? "…" : String(adsToday)} icon={<Megaphone className="text-[color:var(--cyan)]" />} />
          <MetricBox label="Kits criados hoje" value={loadingLocal ? "…" : String(kitsToday)} icon={<Layers className="text-[color:var(--magenta)]" />} />
        </div>

        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Meta mensal de anúncios</p>
              <p className="text-xs text-muted-foreground">
                {adsThisMonth} de {adsGoal} anúncios este mês ({goalPct}%)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Meta</label>
              <input
                type="number"
                min={1}
                value={adsGoal}
                onChange={(e) => setAdsGoal(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 rounded-md bg-muted/20 border border-border px-2 py-1 text-sm text-foreground"
              />
            </div>
          </div>
          <div className="h-3 w-full rounded-full bg-muted/30 overflow-hidden">
            <div className={`h-full ${goalColor} transition-all`} style={{ width: `${goalPct}%` }} />
          </div>
        </div>
      </div>

      {/* BLOCO 5 — Ranking */}
      <div className="jtd-glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-[color:var(--magenta)]" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Produtos mais vendidos</h3>
            <p className="text-xs text-muted-foreground">
              {mlConnected ? "Baseado nas vendas do Mercado Livre" : "Conecte o ML para ver o ranking real"}
            </p>
          </div>
        </div>
        {mlConnected && ranking.length > 0 ? (
          <ol className="space-y-2">
            {ranking.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-bold text-[color:var(--lime)]">#{i + 1}</span>
                  <span className="text-sm text-foreground truncate">{r.name}</span>
                </div>
                <span className="font-mono text-sm font-bold text-foreground">{BRL(r.total)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="space-y-2">
            {localProducts.map((p, i) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 opacity-80">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-sm font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm text-foreground truncate">{p.name}</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground">placeholder</span>
              </li>
            ))}
            {localProducts.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem produtos cadastrados ainda.</p>
            )}
          </ol>
        )}
      </div>

      {/* BLOCO 6 — Custos */}
      <div className="jtd-glass p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet size={18} className="text-[color:var(--cyan)]" />
          <div>
            <h3 className="text-lg font-bold text-foreground">Breakdown de Custos</h3>
            <p className="text-xs text-muted-foreground">Baseado na precificação dos anúncios ativos</p>
          </div>
        </div>
        {loadingLocal ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="divide-y divide-border rounded-lg border border-border">
            <CostRow icon={<Receipt className="text-[color:var(--lime)]" />} label="Taxa marketplace" value={costs.marketplace_fee} total={totalCost} />
            <CostRow icon={<Truck className="text-[color:var(--cyan)]" />} label="Frete" value={costs.shipping_cost} total={totalCost} />
            <CostRow icon={<Box className="text-[color:var(--magenta)]" />} label="Embalagem" value={costs.packaging_cost} total={totalCost} />
            <CostRow icon={<Truck className="text-foreground" />} label="Transporte" value={costs.transport_cost} total={totalCost} />
            <CostRow icon={<Receipt className="text-foreground" />} label="Imposto" value={costs.tax} total={totalCost} />
            <div className="flex items-center justify-between p-3 bg-muted/10">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span className="font-mono font-bold text-foreground">{BRL(totalCost)}</span>
            </div>
          </div>
        )}
      </div>

      {/* BLOCO 7 — Status API */}
      <div className="jtd-glass p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Plug size={20} className="text-foreground" />
            {tokenLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : mlConnected ? (
              <div>
                <span className="rounded-full bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 text-xs font-bold">
                  ✓ API Conectada
                </span>
                <p className="mt-1 text-xs text-muted-foreground font-mono">
                  User ID: <span className="text-foreground">{token.user_id}</span> · Expira:{" "}
                  <span className="text-foreground">{new Date(token.expires_at).toLocaleString("pt-BR")}</span>
                </p>
              </div>
            ) : (
              <span className="rounded-full bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 text-xs font-bold">
                ✗ API Desconectada
              </span>
            )}
          </div>
          <div>
            {mlConnected ? (
              <Button onClick={handleRefreshToken} disabled={refreshing} variant="outline">
                {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                Renovar Token
              </Button>
            ) : (
              <Link to="/api">
                <Button className="bg-[color:var(--lime)] text-black hover:bg-[color:var(--lime)]/80">Conectar</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Sub-components =====
function PillButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wider border transition-all",
        active
          ? "bg-[color:var(--lime)] text-black border-[color:var(--lime)]"
          : "bg-transparent text-muted-foreground border-border hover:text-foreground hover:border-foreground/40",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function QuickCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  accent: "lime" | "cyan" | "magenta";
}) {
  const accentBg =
    accent === "lime" ? "bg-[color:var(--lime)]/10" : accent === "cyan" ? "bg-[color:var(--cyan)]/10" : "bg-[color:var(--magenta)]/10";
  return (
    <div className="jtd-glass p-5 flex items-center justify-between transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${accentBg}`}>{icon}</div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
          {value === null ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-bold text-foreground font-mono">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, icon, loading }: { label: string; value: string; icon: React.ReactNode; loading?: boolean }) {
  return (
    <div className="rounded-lg border border-border p-4 bg-muted/5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="opacity-80">{icon}</div>
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-16" />
      ) : (
        <p className="mt-2 text-xl font-bold text-foreground font-mono">{value}</p>
      )}
    </div>
  );
}

function CostRow({ icon, label, value, total }: { icon: React.ReactNode; label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <div className="opacity-80">{icon}</div>
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
        <span className="font-mono text-sm text-foreground">{BRL(value)}</span>
      </div>
    </div>
  );
}

function EmptyHint({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-8 text-center">
      <div className="text-muted-foreground">{icon}</div>
      <p className="text-sm text-foreground">{title}</p>
      {action}
    </div>
  );
}
