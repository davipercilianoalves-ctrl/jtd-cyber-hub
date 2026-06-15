import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from "recharts";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Package } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useMetricas } from "@/hooks/useMetricas";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Ad = {
  id: string;
  is_active: boolean;
  titles: string[] | null;
  products?: { name: string | null; sku: string | null } | null;
};

type MonthPoint = {
  month: string;
  monthIdx: number;
  revenue: number;
  units: number;
  active: boolean;
  hasSales: boolean;
};

function findAdForItem(ads: Ad[], title: string, sku?: string | null) {
  const t = (title || "").toLowerCase().trim();
  const s = (sku || "").toLowerCase().trim();
  if (s) {
    const bySku = ads.find((a) => (a.products?.sku || "").toLowerCase() === s);
    if (bySku) return bySku;
  }
  if (t) {
    return ads.find((a) =>
      (a.titles || []).some((x) => {
        const xl = (x || "").toLowerCase();
        return xl && (xl.includes(t) || t.includes(xl));
      }),
    );
  }
  return null;
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: MonthPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 text-xs space-y-0.5">
      <div className="text-muted-foreground font-medium">{p.month}</div>
      <div className="text-primary font-bold tabular-nums">{BRL(p.revenue)}</div>
      <div className="text-foreground/80 tabular-nums">{p.units} un.</div>
      {!p.active && !p.hasSales && (
        <div className="text-red-500 text-[10px] flex items-center gap-1 mt-1">
          <AlertTriangle size={10} /> Pausado / Sem estoque
        </div>
      )}
    </div>
  );
}

export function YearlyProductChart({ ad, token }: { ad: Ad; token: any }) {
  const m = useMetricas();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonthPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !ad) return;
      setLoading(true);
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        // Busca pedidos dos últimos 12 meses (paginado simples até 200)
        const allResults: any[] = [];
        for (let offset = 0; offset < 200; offset += 50) {
          const res = await m.getOrders(
            token.user_id,
            start.toISOString(),
            now.toISOString(),
            offset,
          );
          const results = res?.results || [];
          allResults.push(...results);
          if (results.length < 50) break;
        }
        if (cancelled) return;

        // Inicializa 12 meses
        const months: MonthPoint[] = [];
        for (let i = 0; i < 12; i++) {
          const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
          months.push({
            month: `${MONTHS_PT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
            monthIdx: i,
            revenue: 0,
            units: 0,
            active: ad.is_active,
            hasSales: false,
          });
        }

        // Filtra orders deste anúncio e soma por mês
        allResults.forEach((o: any) => {
          const d = new Date(o.date_created || o.date_closed || 0);
          if (!d.getTime()) return;
          const idx = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
          if (idx < 0 || idx > 11) return;
          (o.order_items || []).forEach((it: any) => {
            if (!findAdForItem([ad], it.item?.title || "", it.item?.seller_sku)) return;
            const rev = Number(it.unit_price || 0) * Number(it.quantity || 0);
            months[idx].revenue += rev;
            months[idx].units += Number(it.quantity || 0);
            months[idx].hasSales = true;
          });
        });

        // Marca meses sem venda como "pausado/sem estoque" se anúncio inativo hoje
        months.forEach((mo) => {
          if (!mo.hasSales && !ad.is_active) mo.active = false;
        });

        setData(months);
      } catch (e) {
        console.error("YearlyProductChart fetch error", e);
        setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ad?.id, token]);

  // Faixas vermelhas para períodos pausados/sem estoque
  const pausedRanges = useMemo(() => {
    const ranges: Array<{ x1: string; x2: string }> = [];
    let start: number | null = null;
    data.forEach((p, i) => {
      const pausedHere = !p.active && !p.hasSales;
      if (pausedHere && start === null) start = i;
      if ((!pausedHere || i === data.length - 1) && start !== null) {
        const end = pausedHere ? i : i - 1;
        ranges.push({ x1: data[start].month, x2: data[end].month });
        start = null;
      }
    });
    return ranges;
  }, [data]);

  const total = data.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = data.reduce((s, p) => s + p.units, 0);
  const pausedCount = data.filter((p) => !p.active && !p.hasSales).length;

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package size={16} className="text-primary" />
            <h3 className="text-lg font-bold">{ad.titles?.[0] || ad.products?.name || "Produto"}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            SKU {ad.products?.sku || "—"} · Últimos 12 meses
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary tabular-nums">{BRL(total)}</div>
          <div className="text-xs text-muted-foreground">{totalUnits} unidades</div>
        </div>
      </div>

      {pausedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-500/80 mb-3">
          <AlertTriangle size={12} />
          {pausedCount} {pausedCount === 1 ? "mês" : "meses"} sem vendas (provável pausa ou ruptura)
        </div>
      )}

      {loading ? (
        <Skeleton className="h-[260px] w-full" />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="h-[260px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="yearArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickFormatter={(v) => `R$${Math.round(Number(v))}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "hsl(var(--primary) / 0.3)" }} />
              {pausedRanges.map((r, i) => (
                <ReferenceArea key={i} x1={r.x1} x2={r.x2} fill="rgb(239 68 68)" fillOpacity={0.08} stroke="rgb(239 68 68)" strokeOpacity={0.2} />
              ))}
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#yearArea)"
                dot={{ r: 3, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-primary/40" /> Receita mensal
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-red-500/30 border border-red-500/40" /> Pausado / Sem estoque
        </div>
      </div>
    </div>
  );
}

export function ProductPicker({
  ads,
  selectedId,
  onSelect,
}: {
  ads: Ad[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return ads.slice(0, 30);
    return ads.filter((a) => {
      const t = (a.titles?.[0] || a.products?.name || "").toLowerCase();
      const s = (a.products?.sku || "").toLowerCase();
      return t.includes(q) || s.includes(q);
    }).slice(0, 30);
  }, [ads, query]);

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar produto por título ou SKU..."
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm mb-3"
      />
      <div className="max-h-64 overflow-y-auto space-y-1">
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground py-4 text-center">Nenhum produto encontrado</p>
        )}
        {filtered.map((a) => {
          const title = a.titles?.[0] || a.products?.name || "Sem título";
          const active = selectedId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              className={`w-full text-left rounded-md px-3 py-2 transition-colors ${
                active ? "bg-primary/10 border border-primary/40" : "border border-transparent hover:bg-muted/20"
              }`}
            >
              <div className="text-sm text-foreground truncate">{title}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-mono text-muted-foreground">{a.products?.sku || "—"}</span>
                <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  a.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-400"
                }`}>
                  {a.is_active ? "Ativo" : "Pausado"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
