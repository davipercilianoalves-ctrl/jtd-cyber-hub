// Métricas — Redesign focado em narrativa de funil + tendências interativas
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  DollarSign,
  Eye,
  MessageSquare,
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

export default function Metricas() {
  const m = useMetricas();
  const [period, setPeriod] = useState<MetricsPeriod>("30D");
  const [token, setToken] = useState<any>(null);
  const [tokenLoading, setTokenLoading] = useState(true);

  const [orders, setOrders] = useState<MlOrder[]>([]);
  const [prevOrders, setPrevOrders] = useState<MlOrder[]>([]);
  const [visitsData, setVisitsData] = useState<any>(null);
  const [prevVisitsTotal, setPrevVisitsTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

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

      {loading && orders.length === 0 ? (
        <div className="grid gap-4">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <>
          <FunnelHeroCard
            title="Funil de Conversão"
            subtitle="Da visita à venda concluída"
            funnel={funnel}
            kpis={[
              {
                label: "Faturamento",
                value: current.revenue,
                previous: previous.revenue,
                format: BRL,
              },
              {
                label: "Vendas",
                value: current.orderCount,
                previous: previous.orderCount,
                format: INT,
              },
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
              {
                label: "Ticket médio",
                value: BRL(current.avgTicket),
                icon: <DollarSign className="size-4 text-muted-foreground" />,
              },
              {
                label: "Unidades vendidas",
                value: INT(current.units),
                icon: <Package className="size-4 text-muted-foreground" />,
              },
              {
                label: "Compradores únicos",
                value: INT(current.buyers),
                icon: <Users className="size-4 text-muted-foreground" />,
              },
            ]}
          />

          <InteractiveLineChart
            metrics={interactiveMetrics}
            data={series}
            defaultKey="revenue"
          />

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
                    ? {
                        value: ((visitsTotal - prevVisitsTotal) / prevVisitsTotal) * 100,
                        positive: visitsTotal >= prevVisitsTotal,
                      }
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
                    ? {
                        value: ((current.orderCount - previous.orderCount) / previous.orderCount) * 100,
                        positive: current.orderCount >= previous.orderCount,
                      }
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
        </>
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
