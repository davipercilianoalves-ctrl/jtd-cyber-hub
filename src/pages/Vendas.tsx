// Vendas — controle financeiro das vendas do Mercado Livre
import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ShoppingCart,
  RefreshCcw,
  Plug,
  ChevronDown,
  ChevronUp,
  Loader2,
  Receipt,
  Truck,
  Package,
  Box,
  Percent,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVendas, type MLOrder, type MatchedAd, type SaleOverride } from "@/hooks/useVendas";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Period = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function periodRange(p: Period, from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (p === "TODAY") {
    return { from: new Date(now.getFullYear(), now.getMonth(), now.getDate()), to: end };
  }
  if (p === "MONTH") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
  if (p === "YEAR") return { from: new Date(now.getFullYear(), 0, 1), to: end };
  const f = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const t = to ? new Date(to) : end;
  t.setHours(23, 59, 59, 999);
  return { from: f, to: t };
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-green-500/10 text-green-500" },
    pending: { label: "Pendente", cls: "bg-yellow-500/10 text-yellow-500" },
    cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-500" },
  };
  const cfg = map[status] || { label: status, cls: "bg-muted/20 text-muted-foreground" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

type ItemBreakdown = {
  itemId: string;
  title: string;
  sku?: string | null;
  qty: number;
  unitPrice: number;
  ad: MatchedAd | null;
  unitCost: number;
  defaultCost: number;
  hasOverride: boolean;
  feeBRL: number;
  shipping: number;
  packaging: number;
  transport: number;
  taxBRL: number;
  revenue: number;
  cost: number;
  profit: number;
};

type Computed = {
  order: MLOrder;
  items: ItemBreakdown[];
  totals: {
    revenue: number;
    cost: number;
    fee: number;
    shipping: number;
    packaging: number;
    transport: number;
    tax: number;
    profit: number;
  };
  hasAnyAd: boolean;
};

function computeOrder(
  order: MLOrder,
  ads: MatchedAd[],
  overridesByKey: Map<string, SaleOverride>,
  findAd: (ads: MatchedAd[], title: string, sku?: string | null) => MatchedAd | null,
  liveCosts: Record<string, number>,
): Computed {
  const items = order.order_items || [];
  const mlShippingTotal =
    Number(order.shipping?.cost ?? 0) ||
    (order.payments || []).reduce((s, p) => s + Number(p?.shipping_cost || 0), 0);
  const orderRevenueAll = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);

  const totals = { revenue: 0, cost: 0, fee: 0, shipping: 0, packaging: 0, transport: 0, tax: 0, profit: 0 };
  let hasAnyAd = false;

  const itemsBreakdown: ItemBreakdown[] = items.map((it) => {
    const itemId = String(it.item.id);
    const key = `${order.id}::${itemId}`;
    const ad = findAd(ads, it.item.title, it.item.seller_sku || null);
    if (ad) hasAnyAd = true;
    const defaultCost = Number(ad?.cost_price ?? ad?.products?.cost_price ?? 0) || 0;
    const ov = overridesByKey.get(key);
    const ovSingle = ov?.custom_cost_price != null ? Number(ov.custom_cost_price) : null;
    const baseUnitCost = ovSingle ?? defaultCost;
    const unitCost = liveCosts[key] != null ? liveCosts[key] : baseUnitCost;
    const hasOverride = ovSingle != null;

    const revenue = it.unit_price * it.quantity;
    const cost = unitCost * it.quantity;

    // Taxa ML
    const adFeePct = Number(ad?.marketplace_fee ?? 0);
    let feeBRL = 0;
    if (ad && adFeePct > 0) {
      feeBRL = revenue * (adFeePct / 100);
    } else if (it.sale_fee != null && Number(it.sale_fee) > 0) {
      feeBRL = Number(it.sale_fee) * it.quantity;
    }

    // Frete
    let shipping = 0;
    const adShippingUnit = Number(ad?.shipping_cost ?? 0);
    if (ad && adShippingUnit > 0) {
      shipping = adShippingUnit * it.quantity;
    } else if (ad && mlShippingTotal > 0 && orderRevenueAll > 0) {
      shipping = mlShippingTotal * (revenue / orderRevenueAll);
    }

    const packaging = ad ? Number(ad.packaging_cost ?? 0) * it.quantity : 0;
    const transport = ad ? Number(ad.transport_cost ?? 0) * it.quantity : 0;
    const taxPct = ad ? Number(ad.tax ?? 0) : 0;
    const taxBRL = revenue * (taxPct / 100);

    const profit = ad ? revenue - cost - feeBRL - shipping - packaging - transport - taxBRL : 0;

    totals.revenue += revenue;
    totals.cost += cost;
    totals.fee += feeBRL;
    totals.shipping += shipping;
    totals.packaging += packaging;
    totals.transport += transport;
    totals.tax += taxBRL;
    totals.profit += profit;

    return {
      itemId, title: it.item.title, sku: it.item.seller_sku, qty: it.quantity,
      unitPrice: it.unit_price, ad, unitCost, defaultCost, hasOverride,
      feeBRL, shipping, packaging, transport, taxBRL, revenue, cost, profit,
    };
  });

  return { order, items: itemsBreakdown, totals, hasAnyAd };
}

export default function Vendas() {
  const { fetchOrders, fetchOverrides, saveOverride, removeOverride, fetchAds, findAd } = useVendas();

  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [mlUserId, setMlUserId] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("MONTH");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<MLOrder[]>([]);
  const [ads, setAds] = useState<MatchedAd[]>([]);
  const [overrides, setOverrides] = useState<SaleOverride[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [liveCosts, setLiveCosts] = useState<Record<string, number>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ml_tokens").select("id").maybeSingle();
      if (data) {
        setHasToken(true);
        try {
          const { data: me } = await supabase.functions.invoke("ml-proxy", {
            body: { endpoint: "/users/me", method: "GET" },
          });
          if (me?.id) setMlUserId(String(me.id));
        } catch { /* noop */ }
      }
      setTokenChecked(true);
    })();
  }, []);

  const overridesByKey = useMemo(() => {
    const m = new Map<string, SaleOverride>();
    overrides.forEach((o) => m.set(`${o.ml_order_id}::${o.ml_item_id}`, o));
    return m;
  }, [overrides]);

  async function load() {
    if (!hasToken || !mlUserId) return;
    setLoading(true);
    try {
      const { from, to } = periodRange(period, customFrom, customTo);
      const [orderList, adList] = await Promise.all([
        fetchOrders(mlUserId, from.toISOString(), to.toISOString()),
        fetchAds(),
      ]);
      setOrders(orderList);
      setAds(adList);
      const ids = orderList.map((o) => String(o.id));
      const ovs = await fetchOverrides(ids);
      setOverrides(ovs);
    } catch (e: any) {
      toast.error(e?.message || "Erro ao carregar vendas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenChecked && hasToken && mlUserId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenChecked, hasToken, mlUserId, period, customFrom, customTo]);

  // Auto-refresh a cada 30s
  useEffect(() => {
    if (!hasToken || !mlUserId) return;
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 30000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, mlUserId, period, customFrom, customTo]);

  const computed = useMemo<Computed[]>(
    () => orders.map((o) => computeOrder(o, ads, overridesByKey, findAd, liveCosts)),
    [orders, ads, overridesByKey, findAd, liveCosts],
  );

  const summary = useMemo(() => {
    const s = { revenue: 0, count: orders.length, profit: 0, fee: 0, shipping: 0, packaging: 0, transport: 0, tax: 0 };
    computed.forEach((c) => {
      s.revenue += c.totals.revenue;
      s.profit += c.totals.profit;
      s.fee += c.totals.fee;
      s.shipping += c.totals.shipping;
      s.packaging += c.totals.packaging;
      s.transport += c.totals.transport;
      s.tax += c.totals.tax;
    });
    return s;
  }, [computed, orders.length]);

  async function handleSave(orderId: string, itemId: string, qty: number) {
    const key = `${orderId}::${itemId}`;
    const cost = liveCosts[key];
    if (cost == null || !Number.isFinite(cost) || cost < 0) {
      toast.error("Custo inválido");
      return;
    }
    setSavingKey(key);
    try {
      await saveOverride(orderId, itemId, Array.from({ length: qty }, () => cost));
      const ovs = await fetchOverrides(orders.map((o) => String(o.id)));
      setOverrides(ovs);
      setLiveCosts((s) => { const n = { ...s }; delete n[key]; return n; });
      toast.success("Custo atualizado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSavingKey(null);
    }
  }

  async function handleReset(orderId: string, itemId: string) {
    const key = `${orderId}::${itemId}`;
    setSavingKey(key);
    try {
      await removeOverride(orderId, itemId);
      const ovs = await fetchOverrides(orders.map((o) => String(o.id)));
      setOverrides(ovs);
      setLiveCosts((s) => { const n = { ...s }; delete n[key]; return n; });
      toast.success("Custo restaurado");
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setSavingKey(null);
    }
  }

  // Estado sem token
  if (tokenChecked && !hasToken) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="jtd-glass p-10 text-center max-w-md">
          <Plug className="w-16 h-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-2">Conecte o Mercado Livre</h2>
          <p className="text-muted-foreground mb-6">
            Conecte o Mercado Livre para ver suas vendas
          </p>
          <Link to="/api" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-black font-bold hover:opacity-90 transition-opacity">
            Ir para API
          </Link>
        </div>
      </div>
    );
  }

  const periods: { id: Period; label: string }[] = [
    { id: "TODAY", label: "Hoje" },
    { id: "MONTH", label: "Mês" },
    { id: "YEAR", label: "Ano" },
    { id: "CUSTOM", label: "Personalizado" },
  ];

  return (
    <div className="space-y-6">
      {/* BLOCO 1 — HEADER + FILTROS */}
      <div className="jtd-glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-cyan-400" />
              Vendas
            </h1>
            <p className="text-muted-foreground mt-1">
              Controle financeiro das suas vendas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {periods.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-colors ${
                period === p.id
                  ? "bg-primary text-black"
                  : "bg-muted/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}

          {period === "CUSTOM" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm font-mono"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-muted/20 border border-border rounded-md px-3 py-1.5 text-sm font-mono"
              />
            </>
          )}

          <button
            onClick={() => load()}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Atualizar
          </button>
        </div>
      </div>

      {/* BLOCO 2 — RESUMO */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="jtd-glass p-6"><Skeleton className="h-24 w-full" /></div>
          <div className="jtd-glass p-6"><Skeleton className="h-24 w-full" /></div>
        </div>
      ) : orders.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="jtd-glass p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
              <div className="min-w-0 flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 truncate">Total vendido</div>
                <div className="text-[20px] font-extrabold tabular-nums tracking-tight text-cyan-400 truncate">{BRL(summary.revenue)}</div>
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 truncate">Nº de vendas</div>
                <div className="text-[20px] font-extrabold tabular-nums tracking-tight text-foreground truncate">{summary.count}</div>
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 truncate">Lucro líquido</div>
                <div className={`text-[20px] font-extrabold tabular-nums tracking-tight truncate ${summary.profit >= 0 ? "text-lime-500" : "text-red-500"}`}>
                  {BRL(summary.profit)}
                </div>
              </div>
              <div className="min-w-0 flex flex-col">
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-1 truncate">Ticket médio</div>
                <div className="text-[20px] font-extrabold tabular-nums tracking-tight text-pink-400 truncate">
                  {BRL(summary.count > 0 ? summary.revenue / summary.count : 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="jtd-glass p-6">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Custos do período</div>
            <div className="space-y-2 text-sm">
              {[
                { icon: Receipt, label: "Taxa ML", value: summary.fee },
                { icon: Truck, label: "Frete", value: summary.shipping },
                { icon: Package, label: "Embalagem", value: summary.packaging },
                { icon: Box, label: "Transporte", value: summary.transport },
                { icon: Percent, label: "Imposto", value: summary.tax },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </div>
                  <span className="font-mono">{BRL(value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* BLOCO 3 — TABELA */}
      <div className="jtd-glass p-0 overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-primary opacity-30" />
            <h3 className="text-lg font-bold mb-1">Nenhuma venda encontrada neste período</h3>
            <p className="text-sm text-muted-foreground">Tente selecionar um período maior</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-muted/20 border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Produto</th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Valor</th>
                <th className="text-right px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Lucro</th>
                <th className="text-center px-4 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {computed.map((c) => {
                const oid = String(c.order.id);
                const isOpen = !!expanded[oid];
                const firstItem = c.items[0];
                const extra = c.items.length - 1;
                return (
                  <Fragment key={oid}>
                    <tr
                      key={oid}
                      onClick={() => setExpanded((s) => ({ ...s, [oid]: !s[oid] }))}
                      className="border-b border-border hover:bg-muted/[0.04] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {fmtDate(c.order.date_created)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[200px] text-sm">{firstItem?.title || "-"}</span>
                          {extra > 0 && (
                            <span className="bg-muted/20 text-xs px-1.5 py-0.5 rounded font-mono">+{extra}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-cyan-400 font-mono font-bold whitespace-nowrap">
                        {BRL(c.totals.revenue)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {c.hasAnyAd ? (
                          <span className={`font-mono font-bold ${c.totals.profit >= 0 ? "text-lime-500" : "text-red-500"}`}>
                            {BRL(c.totals.profit)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusPill status={c.order.status} />
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {isOpen ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${oid}-exp`} className="bg-muted/[0.03] border-b border-border animate-in slide-in-from-top-2 duration-200">
                        <td colSpan={6} className="p-6">
                          <div className="space-y-4">
                            {c.items.map((it) => {
                              const key = `${oid}::${it.itemId}`;
                              const liveValue = liveCosts[key];
                              const inputValue = liveValue != null ? liveValue : it.unitCost;
                              const isSaving = savingKey === key;
                              return (
                                <div key={it.itemId} className="border border-border rounded-lg p-4 bg-background/40">
                                  <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1">
                                      <div className="font-bold mb-1">{it.title}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {it.ad ? (
                                          <span className="text-lime-500">✓ Anúncio: {it.ad.products?.name || it.ad.titles?.[0] || it.ad.id}</span>
                                        ) : (
                                          <span className="text-yellow-500">✗ Anúncio não encontrado</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-xs font-mono text-muted-foreground">Qtd: {it.qty}</div>
                                  </div>

                                  <div className="text-sm mb-3">
                                    <span className="text-muted-foreground">Preço de venda unit.: </span>
                                    <span className="font-mono font-bold text-cyan-400">{BRL(it.unitPrice)}</span>
                                  </div>

                                  {!it.ad && (
                                    <div className="flex items-start gap-2 p-3 mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-500">
                                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                      <span>
                                        Anúncio não encontrado no app — os custos foram zerados. Cadastre o anúncio para calcular o lucro real.
                                      </span>
                                    </div>
                                  )}

                                  <div className="mb-4">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
                                      Custo de compra (unit.)
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <input
                                        type="number"
                                        step="0.01"
                                        value={inputValue}
                                        onChange={(e) => {
                                          const v = Number(e.target.value);
                                          setLiveCosts((s) => ({ ...s, [key]: v }));
                                        }}
                                        className="bg-muted/20 border border-border rounded p-2 font-mono text-sm w-32"
                                      />
                                      <span className="text-xs text-muted-foreground">
                                        Padrão do cadastro: <span className="font-mono">{BRL(it.defaultCost)}</span>
                                      </span>
                                      <button
                                        disabled={isSaving}
                                        onClick={() => handleReset(oid, it.itemId)}
                                        className="text-xs px-3 py-1.5 rounded border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
                                      >
                                        Usar padrão
                                      </button>
                                      <button
                                        disabled={isSaving}
                                        onClick={() => handleSave(oid, it.itemId, it.qty)}
                                        className="bg-primary text-black text-xs font-bold px-3 py-1.5 rounded hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center gap-1"
                                      >
                                        {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
                                        Salvar custo
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Breakdown</div>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                                      <div>
                                        <div className="text-xs text-muted-foreground">Taxa ML</div>
                                        <div className="font-mono">{BRL(it.feeBRL)}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground">Frete</div>
                                        <div className="font-mono">{BRL(it.shipping)}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground">Embalagem</div>
                                        <div className="font-mono">{BRL(it.packaging)}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground">Transporte</div>
                                        <div className="font-mono">{BRL(it.transport)}</div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-muted-foreground">Imposto</div>
                                        <div className="font-mono">{BRL(it.taxBRL)}</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                      Lucro desta venda
                                    </span>
                                    <span className={`font-mono font-bold text-lg ${it.profit >= 0 ? "text-lime-500" : "text-red-500"}`}>
                                      {it.ad ? BRL(it.profit) : "—"}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
