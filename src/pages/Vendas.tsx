// Vendas — controle financeiro das vendas do Mercado Livre
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  DollarSign,
  RefreshCcw,
  Plug,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVendas, type MLOrder, type MatchedAd, type SaleOverride } from "@/hooks/useVendas";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Marketplace = "ALL" | "ML";
type Period = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function periodRange(p: Period, from?: string, to?: string): { from: Date; to: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  if (p === "TODAY") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      to: end,
    };
  }
  if (p === "MONTH") return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
  if (p === "YEAR") return { from: new Date(now.getFullYear(), 0, 1), to: end };
  const f = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const t = to ? new Date(to) : end;
  t.setHours(23, 59, 59, 999);
  return { from: f, to: t };
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    paid: { label: "Pago", cls: "bg-[var(--lime)]/15 text-[var(--lime)] border-[var(--lime)]/40" },
    pending: { label: "Pendente", cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/40" },
    cancelled: { label: "Cancelado", cls: "bg-destructive/15 text-destructive border-destructive/40" },
  };
  const cfg = map[status] || { label: status, cls: "bg-muted text-muted-foreground border-border" };
  return <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>;
}

type Computed = {
  order: MLOrder;
  itemsBreakdown: Array<{
    itemId: string;
    title: string;
    sku?: string | null;
    qty: number;
    unitPrice: number;
    ad: MatchedAd | null;
    unitCosts: number[]; // length = qty
    cost: number; // sum(unitCosts)
    defaultCost: number; // unitário do cadastro
    hasOverride: boolean;
    feePct: number;
    feeBRL: number;
    feeSource: "ad" | "ml" | "none";
    shipping: number;
    shippingSource: "ad" | "ml" | "none";
    packaging: number;
    transport: number;
    taxPct: number;
    taxBRL: number;
    revenue: number;
    profit: number;

  }>;
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
};

function computeOrder(
  order: MLOrder,
  ads: MatchedAd[],
  overridesByKey: Map<string, SaleOverride>,
  findAd: (ads: MatchedAd[], title: string, sku?: string | null) => MatchedAd | null,
): Computed {
  const items = order.order_items || [];
  // Totais do ML para fallback
  const mlShippingTotal =
    Number(order.shipping?.cost ?? 0) ||
    (order.payments || []).reduce((s, p) => s + Number(p?.shipping_cost || 0), 0);
  const orderRevenueAll = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);

  const totals = {
    revenue: 0,
    cost: 0,
    fee: 0,
    shipping: 0,
    packaging: 0,
    transport: 0,
    tax: 0,
    profit: 0,
  };
  const itemsBreakdown = items.map((it) => {
    const itemId = String(it.item.id);
    const key = `${order.id}::${itemId}`;
    const ad = findAd(ads, it.item.title, it.item.seller_sku || null);
    const defaultCost = Number(ad?.cost_price ?? ad?.products?.cost_price ?? 0) || 0;
    const ov = overridesByKey.get(key);
    const ovArr = Array.isArray(ov?.unit_costs) ? (ov!.unit_costs as number[]) : null;
    const ovSingle = ov?.custom_cost_price != null ? Number(ov!.custom_cost_price) : null;
    const unitCosts: number[] = Array.from({ length: it.quantity }, (_, i) => {
      if (ovArr && ovArr[i] != null) return Number(ovArr[i]);
      if (ovSingle != null) return ovSingle;
      return defaultCost;
    });
    const hasOverride = !!(ovArr?.length || ovSingle != null);

    const adFeePct = Number(ad?.marketplace_fee ?? 0);
    const taxPct = Number(ad?.tax ?? 0);
    const adShippingUnit = Number(ad?.shipping_cost ?? 0);
    const packaging = Number(ad?.packaging_cost ?? 0) * it.quantity;
    const transport = Number(ad?.transport_cost ?? 0) * it.quantity;
    const revenue = it.unit_price * it.quantity;

    // Taxa ML — preferir cadastro; senão usar sale_fee do próprio ML
    let feeBRL = 0;
    let feePct = 0;
    let feeSource: "ad" | "ml" | "none" = "none";
    if (adFeePct > 0) {
      feePct = adFeePct;
      feeBRL = revenue * (adFeePct / 100);
      feeSource = "ad";
    } else if (it.sale_fee != null && Number(it.sale_fee) > 0) {
      feeBRL = Number(it.sale_fee) * it.quantity;
      feePct = revenue > 0 ? (feeBRL / revenue) * 100 : 0;
      feeSource = "ml";
    }

    // Frete — preferir cadastro; senão ratear o frete pago no ML por participação na receita
    let shipping = 0;
    let shippingSource: "ad" | "ml" | "none" = "none";
    if (adShippingUnit > 0) {
      shipping = adShippingUnit * it.quantity;
      shippingSource = "ad";
    } else if (mlShippingTotal > 0 && orderRevenueAll > 0) {
      shipping = mlShippingTotal * (revenue / orderRevenueAll);
      shippingSource = "ml";
    }

    const taxBRL = revenue * (taxPct / 100);
    const cost = unitCosts.reduce((s, n) => s + n, 0);
    const profit = revenue - cost - feeBRL - shipping - packaging - transport - taxBRL;

    totals.revenue += revenue;
    totals.cost += cost;
    totals.fee += feeBRL;
    totals.shipping += shipping;
    totals.packaging += packaging;
    totals.transport += transport;
    totals.tax += taxBRL;
    totals.profit += profit;

    return {
      itemId,
      title: it.item.title,
      sku: it.item.seller_sku,
      qty: it.quantity,
      unitPrice: it.unit_price,
      ad,
      unitCosts,
      cost,
      defaultCost,
      hasOverride,
      feePct,
      feeBRL,
      feeSource,
      shipping,
      shippingSource,
      packaging,
      transport,
      taxPct,
      taxBRL,
      revenue,
      profit,
    };

  });
  return { order, itemsBreakdown, totals };
}


export default function Vendas() {
  const { fetchOrders, fetchOverrides, saveOverride, removeOverride, fetchAds, findAd, fetchOrderDetails } =
    useVendas();


  const [tokenChecked, setTokenChecked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [mlUserId, setMlUserId] = useState<string | null>(null);

  const [marketplace, setMarketplace] = useState<Marketplace>("ALL");
  const [period, setPeriod] = useState<Period>("MONTH");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<MLOrder[]>([]);
  const [ads, setAds] = useState<MatchedAd[]>([]);
  const [overrides, setOverrides] = useState<SaleOverride[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<Record<string, string[]>>({});
  const [editMode, setEditMode] = useState<Record<string, "uniform" | "individual">>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [detailsLoading, setDetailsLoading] = useState<Record<string, boolean>>({});



  async function toggleExpand(oid: string, order: MLOrder) {
    setExpanded((s) => ({ ...s, [oid]: !s[oid] }));
    if (!expanded[oid] && !details[oid] && !detailsLoading[oid]) {
      setDetailsLoading((s) => ({ ...s, [oid]: true }));
      try {
        const d = await fetchOrderDetails(order.id, order.shipping?.id || null, order.buyer?.id || null);
        setDetails((s) => ({ ...s, [oid]: d }));
      } catch (e: any) {
        toast.error("Não foi possível buscar detalhes do ML");
      } finally {
        setDetailsLoading((s) => ({ ...s, [oid]: false }));
      }
    }
  }




  // Verifica token ML e busca o seller_id via /users/me
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
        } catch {
          // ignora — tela mostra vazio
        }
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
    if (tokenChecked && hasToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenChecked, hasToken, mlUserId, period, customFrom, customTo]);

  const computed = useMemo<Computed[]>(
    () => orders.map((o) => computeOrder(o, ads, overridesByKey, findAd)),
    [orders, ads, overridesByKey, findAd],
  );

  const summary = useMemo(() => {
    const s = {
      revenue: 0,
      count: orders.length,
      profit: 0,
      fee: 0,
      shipping: 0,
      packaging: 0,
      transport: 0,
      tax: 0,
    };
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

  async function handleSaveOverride(orderId: string, itemId: string, qty: number, fallback: number) {
    const key = `${orderId}::${itemId}`;
    const raw = editing[key] || [];
    const arr: number[] = [];
    for (let i = 0; i < qty; i++) {
      const v = (raw[i] ?? "").toString().replace(",", ".").trim();
      const n = v === "" ? fallback : Number(v);
      if (!Number.isFinite(n) || n < 0) {
        toast.error(`Custo inválido na unidade ${i + 1}`);
        return;
      }
      arr.push(n);
    }
    setSavingKey(key);
    try {
      await saveOverride(orderId, itemId, arr);
      const ovs = await fetchOverrides(orders.map((o) => String(o.id)));
      setOverrides(ovs);
      setEditing((s) => {
        const n = { ...s };
        delete n[key];
        return n;
      });
      toast.success("Custo atualizado");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    } finally {
      setSavingKey(null);
    }
  }


  async function handleRemoveOverride(orderId: string, itemId: string) {
    const key = `${orderId}::${itemId}`;
    setSavingKey(key);
    try {
      await removeOverride(orderId, itemId);
      const ovs = await fetchOverrides(orders.map((o) => String(o.id)));
      setOverrides(ovs);
      toast.success("Padrão restaurado");
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
          <Plug className="w-16 h-16 mx-auto mb-4 text-[var(--cyan)]" />
          <h2 className="text-2xl font-bold mb-2">Conecte o Mercado Livre</h2>
          <p className="text-muted-foreground mb-6">
            Para visualizar suas vendas, conecte sua conta do Mercado Livre.
          </p>
          <Button asChild>
            <Link to="/api">Ir para API</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER + FILTROS */}
      <div className="jtd-glass p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-[var(--lime)]" />
              Vendas
            </h1>
            <p className="text-muted-foreground mt-1">
              Controle financeiro das suas vendas
            </p>
          </div>
          <Button onClick={load} disabled={loading} variant="outline">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCcw className="w-4 h-4" />
            )}
            Atualizar
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <div className="flex gap-1 bg-internal-20 rounded-md p-1">
            {(["ALL", "ML"] as Marketplace[]).map((m) => (
              <button
                key={m}
                onClick={() => setMarketplace(m)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  marketplace === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "ALL" ? "Todos" : "Mercado Livre"}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-internal-20 rounded-md p-1">
            {(["TODAY", "MONTH", "YEAR", "CUSTOM"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "TODAY"
                  ? "Hoje"
                  : p === "MONTH"
                    ? "Mês"
                    : p === "YEAR"
                      ? "Ano"
                      : "Personalizado"}
              </button>
            ))}
          </div>

          {period === "CUSTOM" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-internal-20 border border-sidebar-border rounded-md px-3 py-1.5 text-sm"
              />
              <span className="text-muted-foreground">até</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-internal-20 border border-sidebar-border rounded-md px-3 py-1.5 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* RESUMO */}
      <div className="jtd-glass p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard label="Total Vendido" value={BRL(summary.revenue)} color="cyan" />
              <SummaryCard label="Total de Vendas" value={String(summary.count)} color="foreground" />
              <SummaryCard label="Lucro Líquido" value={BRL(summary.profit)} color="lime" />
              <SummaryCard
                label="Ticket Médio"
                value={BRL(summary.count ? summary.revenue / summary.count : 0)}
                color="magenta"
              />
            </div>
            <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>Taxa ML: <strong className="text-foreground">{BRL(summary.fee)}</strong></span>
              <span>Frete: <strong className="text-foreground">{BRL(summary.shipping)}</strong></span>
              <span>Imposto: <strong className="text-foreground">{BRL(summary.tax)}</strong></span>
              <span>Embalagem: <strong className="text-foreground">{BRL(summary.packaging)}</strong></span>
              <span>Transporte: <strong className="text-foreground">{BRL(summary.transport)}</strong></span>
            </div>
          </>
        )}
      </div>

      {/* TABELA */}
      <div className="jtd-glass p-6">
        <h2 className="text-xl font-bold mb-4">Vendas do Período</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : computed.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma venda encontrada no período selecionado.</p>
            <p className="text-sm mt-2">Tente alterar o período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Produto(s)</th>
                  <th className="py-2 pr-4 text-right">Valor Venda</th>
                  <th className="py-2 pr-4 text-right">Custo Real</th>
                  <th className="py-2 pr-4 text-right">Lucro</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {computed.map((c) => {
                  const oid = String(c.order.id);
                  const isOpen = !!expanded[oid];
                  const items = c.order.order_items || [];
                  const totalCost =
                    c.totals.cost +
                    c.totals.fee +
                    c.totals.shipping +
                    c.totals.packaging +
                    c.totals.transport +
                    c.totals.tax;
                  return (
                    <>
                      <tr key={oid} className="border-b border-border/60 hover:bg-internal-20">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {fmtDateTime(c.order.date_created)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1">{items[0]?.item.title || "—"}</span>
                            {items.length > 1 && (
                              <Badge variant="secondary">+{items.length - 1}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[var(--cyan)]">
                          {BRL(c.totals.revenue)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-destructive">
                          {BRL(totalCost)}
                        </td>
                        <td
                          className={`py-3 pr-4 text-right font-mono ${
                            c.totals.profit >= 0 ? "text-[var(--lime)]" : "text-destructive"
                          }`}
                        >
                          {BRL(c.totals.profit)}
                        </td>
                        <td className="py-3 pr-4">{statusBadge(c.order.status)}</td>
                        <td className="py-3 pr-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setExpanded((s) => ({ ...s, [oid]: !s[oid] }))
                            }
                          >
                            {isOpen ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            Detalhes
                          </Button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={oid + "-exp"}>
                          <td colSpan={7} className="bg-internal-20 p-4">
                            <div className="space-y-3">
                              {c.itemsBreakdown.map((b) => {
                                const key = `${oid}::${b.itemId}`;
                                const editArr = editing[key];
                                const displayUnits: string[] = Array.from(
                                  { length: b.qty },
                                  (_, i) =>
                                    editArr?.[i] ??
                                    (b.unitCosts[i] ?? b.defaultCost).toFixed(2),
                                );
                                return (
                                  <div key={key} className="jtd-glass p-4 rounded-lg">
                                    {/* Header */}
                                    <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-border/60">
                                      <div className="min-w-0">
                                        <div className="font-semibold line-clamp-2">{b.title}</div>
                                        <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                                          <span>SKU: {b.ad?.products?.sku || b.sku || "—"}</span>
                                          <span>Venda unit.: <span className="font-mono text-[var(--cyan)]">{BRL(b.unitPrice)}</span></span>
                                          <span>Receita total: <span className="font-mono text-[var(--cyan)]">{BRL(b.revenue)}</span></span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline">Qtd: {b.qty}</Badge>
                                        {b.hasOverride && (
                                          <Badge variant="outline" className="border-[var(--magenta)]/50 text-[var(--magenta)]">custom</Badge>
                                        )}
                                      </div>
                                    </div>

                                    {!b.ad && (
                                      <div className="mt-3 flex items-start gap-2 text-xs text-yellow-500">
                                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                        <span>
                                          Cadastre um anúncio com este título/SKU para puxar
                                          taxas, frete, embalagem e imposto automaticamente.
                                        </span>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mt-4">
                                      {/* Per-unit cost editor */}
                                      <div>
                                        <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                                          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                            Custo de compra
                                          </div>
                                          <div className="flex items-center gap-1 bg-internal-20 rounded-md p-0.5 border border-sidebar-border">
                                            {(() => {
                                              const allEqual = b.unitCosts.every((u) => u === b.unitCosts[0]);
                                              const mode = editMode[key] ?? (b.qty > 1 && !allEqual ? "individual" : "uniform");
                                              return (["uniform", "individual"] as const).map((m) => (
                                                <button
                                                  key={m}
                                                  onClick={() => {
                                                    setEditMode((s) => ({ ...s, [key]: m }));
                                                    setEditing((s) => {
                                                      const n = { ...s };
                                                      delete n[key];
                                                      return n;
                                                    });
                                                  }}
                                                  disabled={b.qty <= 1 && m === "individual"}
                                                  className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                                                    mode === m
                                                      ? "bg-primary text-primary-foreground"
                                                      : "text-muted-foreground hover:text-foreground disabled:opacity-30"
                                                  }`}
                                                >
                                                  {m === "uniform" ? "Todos iguais" : "Por unidade"}
                                                </button>
                                              ));
                                            })()}
                                          </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground mb-2">
                                          Padrão do cadastro: <span className="font-mono text-foreground">{BRL(b.defaultCost)}</span>
                                        </div>
                                        {(() => {
                                          const allEqual = b.unitCosts.every((u) => u === b.unitCosts[0]);
                                          const mode = editMode[key] ?? (b.qty > 1 && !allEqual ? "individual" : "uniform");
                                          if (mode === "uniform") {
                                            const uniformVal =
                                              editing[key]?.[0] ?? (b.unitCosts[0] ?? b.defaultCost).toFixed(2);
                                            return (
                                              <div>
                                                <input
                                                  type="number"
                                                  step="0.01"
                                                  value={uniformVal}
                                                  onChange={(e) =>
                                                    setEditing((s) => ({
                                                      ...s,
                                                      [key]: Array.from({ length: b.qty }, () => e.target.value),
                                                    }))
                                                  }
                                                  className="w-40 bg-background/40 border border-sidebar-border rounded px-3 py-2 text-sm font-mono"
                                                  placeholder="0,00"
                                                />
                                                {b.qty > 1 && (
                                                  <span className="text-xs text-muted-foreground ml-2">
                                                    × {b.qty} unidades
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                              {displayUnits.map((val, i) => (
                                                <div key={i} className="bg-internal-20 rounded-md p-2 border border-sidebar-border">
                                                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                                    Unidade #{i + 1}
                                                  </div>
                                                  <input
                                                    type="number"
                                                    step="0.01"
                                                    value={val}
                                                    onChange={(e) =>
                                                      setEditing((s) => {
                                                        const cur = s[key] ? [...s[key]] : [...displayUnits];
                                                        cur[i] = e.target.value;
                                                        return { ...s, [key]: cur };
                                                      })
                                                    }
                                                    className="w-full bg-background/40 border border-sidebar-border rounded px-2 py-1 text-sm font-mono"
                                                  />
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()}

                                        <div className="flex items-center gap-2 mt-3">
                                          <Button
                                            size="sm"
                                            onClick={() => handleSaveOverride(oid, b.itemId, b.qty, b.defaultCost)}
                                            disabled={savingKey === key}
                                          >
                                            {savingKey === key ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              "Salvar custos"
                                            )}
                                          </Button>
                                          {b.hasOverride && (
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => handleRemoveOverride(oid, b.itemId)}
                                              disabled={savingKey === key}
                                            >
                                              Restaurar padrão
                                            </Button>
                                          )}
                                          <span className="text-xs text-muted-foreground ml-auto">
                                            Total custos: <span className="font-mono text-foreground">{BRL(b.cost)}</span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Financial breakdown */}
                                      <div className="bg-internal-20 rounded-md p-3 space-y-1.5">
                                        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                                          Onde vai o dinheiro
                                        </div>
                                        <Row k="Receita" v={BRL(b.revenue)} />
                                        <Row k="Custo dos produtos" v={`- ${BRL(b.cost)}`} />
                                        <Row k={`Taxa ML (${b.feePct.toFixed(1)}%)${b.feeSource === "ml" ? " · do ML" : b.feeSource === "none" ? " · sem dado" : ""}`} v={`- ${BRL(b.feeBRL)}`} />
                                        <Row k={`Imposto (${b.taxPct}%)`} v={`- ${BRL(b.taxBRL)}`} />
                                        <Row k={`Frete${b.shippingSource === "ml" ? " · do ML" : b.shippingSource === "none" ? " · sem dado" : ""}`} v={`- ${BRL(b.shipping)}`} />

                                        <Row k="Embalagem" v={`- ${BRL(b.packaging)}`} />
                                        <Row k="Transporte" v={`- ${BRL(b.transport)}`} />
                                        <div className="flex justify-between pt-2 mt-1 border-t border-border font-semibold">
                                          <span>Lucro</span>
                                          <span className={`font-mono ${b.profit >= 0 ? "text-[var(--lime)]" : "text-destructive"}`}>
                                            {BRL(b.profit)}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                          <span>Margem</span>
                                          <span className="font-mono">
                                            {b.revenue > 0 ? ((b.profit / b.revenue) * 100).toFixed(1) : "0.0"}%
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "cyan" | "lime" | "magenta" | "foreground";
}) {
  const colorClass =
    color === "cyan"
      ? "text-[var(--cyan)]"
      : color === "lime"
        ? "text-[var(--lime)]"
        : color === "magenta"
          ? "text-[var(--magenta)]"
          : "text-foreground";
  return (
    <div className="bg-internal-20 rounded-lg p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold font-mono mt-2 ${colorClass}`}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{v}</span>
    </div>
  );
}
