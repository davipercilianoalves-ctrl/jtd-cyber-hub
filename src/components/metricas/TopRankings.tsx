import { motion } from "framer-motion";
import { TrendingUp, Eye, Target, Trophy } from "lucide-react";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = {
  ad: { id: string; is_active: boolean };
  title: string;
  sku: string;
  sales: number;
  units: number;
  revenue: number;
  profit: number;
  visits: number;
};

function RankingCard({
  title,
  icon: Icon,
  items,
  accent,
  formatValue,
  onSelect,
}: {
  title: string;
  icon: any;
  items: Array<{ id: string; title: string; sku: string; value: number; subtitle?: string }>;
  accent: string;
  formatValue: (v: number) => string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Sem dados no período</p>
      ) : (
        <ol className="space-y-2">
          {items.map((it, idx) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect?.(it.id)}
              className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                onSelect ? "cursor-pointer hover:bg-muted/20" : ""
              }`}
            >
              <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums ${
                idx === 0 ? "bg-yellow-500/15 text-yellow-500" :
                idx === 1 ? "bg-zinc-400/15 text-zinc-300" :
                idx === 2 ? "bg-orange-500/15 text-orange-400" :
                "bg-muted/20 text-muted-foreground"
              }`}>
                {idx === 0 ? <Trophy size={11} /> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-foreground truncate font-medium">{it.title}</div>
                <div className="text-[10px] font-mono text-muted-foreground truncate">
                  {it.sku || "—"} {it.subtitle ? `· ${it.subtitle}` : ""}
                </div>
              </div>
              <div className="text-sm font-bold text-foreground tabular-nums">
                {formatValue(it.value)}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function TopRankings({
  rows,
  onSelect,
}: {
  rows: Row[];
  onSelect?: (id: string) => void;
}) {
  const topSales = [...rows]
    .filter((r) => r.units > 0)
    .sort((a, b) => b.units - a.units)
    .slice(0, 5)
    .map((r) => ({ id: r.ad.id, title: r.title, sku: r.sku, value: r.units, subtitle: BRL(r.revenue) }));

  const topVisits = [...rows]
    .filter((r) => r.visits > 0)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5)
    .map((r) => ({ id: r.ad.id, title: r.title, sku: r.sku, value: r.visits }));

  const topConv = [...rows]
    .filter((r) => r.visits > 0 && r.sales > 0)
    .map((r) => ({ ...r, _conv: (r.sales / r.visits) * 100 }))
    .sort((a, b) => b._conv - a._conv)
    .slice(0, 5)
    .map((r) => ({ id: r.ad.id, title: r.title, sku: r.sku, value: r._conv, subtitle: `${r.sales}v / ${r.visits}vis` }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <RankingCard
        title="Mais Vendidos"
        icon={TrendingUp}
        items={topSales}
        accent="bg-emerald-500/15 text-emerald-500"
        formatValue={(v) => `${v} un`}
        onSelect={onSelect}
      />
      <RankingCard
        title="Mais Visitados"
        icon={Eye}
        items={topVisits}
        accent="bg-cyan-500/15 text-cyan-400"
        formatValue={(v) => v.toLocaleString("pt-BR")}
        onSelect={onSelect}
      />
      <RankingCard
        title="Melhor Conversão"
        icon={Target}
        items={topConv}
        accent="bg-violet-500/15 text-violet-400"
        formatValue={(v) => `${v.toFixed(1)}%`}
        onSelect={onSelect}
      />
    </div>
  );
}
