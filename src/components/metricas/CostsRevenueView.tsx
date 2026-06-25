import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AdCostRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Filter = "ALL" | "TOP_PROFIT" | "TOP_COST" | "TOP_MARGIN" | "LOW_MARGIN" | "LOSS";

interface MonthlyPoint {
  month: string;
  faturamento: number;
  custos: number;
  lucro: number;
}

interface Props {
  rows: AdCostRow[];
  grossRevenue: number;
  ordersCount: number;
  monthly: MonthlyPoint[];
  onSelectAd: (adId: string) => void;
}

export function CostsRevenueView({ rows, grossRevenue, ordersCount, monthly, onSelectAd }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  const totals = useMemo(() => {
    const sum = (k: keyof AdCostRow) => rows.reduce((s, r) => s + (r[k] as number), 0);
    const totalCost = sum("totalCost");
    return {
      product: sum("totalProductCost"),
      fee: sum("totalFee"),
      shipping: sum("totalShipping"),
      packaging: sum("totalPackaging"),
      transport: sum("totalTransport"),
      tax: sum("totalTax"),
      totalCost,
      revenue: grossRevenue,
      profit: grossRevenue - totalCost,
      sales: ordersCount,
    };
  }, [rows, grossRevenue, ordersCount]);

  const margin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;

  const breakdownItems = [
    { label: "Custo de Produto", value: totals.product },
    { label: "Taxa Marketplace", value: totals.fee },
    { label: "Frete", value: totals.shipping },
    { label: "Embalagem", value: totals.packaging },
    { label: "Transporte", value: totals.transport },
    { label: "Imposto", value: totals.tax },
  ];

  const maxBreakdown = Math.max(1, ...breakdownItems.map((i) => i.value));

  const filteredAds = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.sku || "").toLowerCase().includes(q) ||
            (r.mlItemId || "").toLowerCase().includes(q)
        )
      : rows.slice();

    switch (filter) {
      case "TOP_PROFIT":
        list = list.slice().sort((a, b) => b.grossProfit - a.grossProfit);
        break;
      case "TOP_COST":
        list = list.slice().sort((a, b) => b.totalCost - a.totalCost);
        break;
      case "TOP_MARGIN":
        list = list.slice().sort((a, b) => b.margin - a.margin);
        break;
      case "LOW_MARGIN":
        list = list.slice().sort((a, b) => a.margin - b.margin);
        break;
      case "LOSS":
        list = list.filter((r) => r.grossProfit < 0);
        break;
      default:
        list = list.slice().sort((a, b) => b.revenue - a.revenue);
    }
    return list;
  }, [rows, query, filter]);

  const adTotals = useMemo(() => {
    return filteredAds.reduce(
      (acc, r) => {
        acc.sales += r.unitsSold;
        acc.revenue += r.revenue;
        acc.cost += r.totalCost;
        acc.fee += r.totalFee;
        acc.ship += r.totalShipping;
        acc.product += r.totalProductCost;
        acc.profit += r.grossProfit;
        return acc;
      },
      { sales: 0, revenue: 0, cost: 0, fee: 0, ship: 0, product: 0, profit: 0 }
    );
  }, [filteredAds]);

  return (
    <div className="space-y-6">
      {totals.product === 0 && (
        <div className="flex items-start gap-2 text-sm text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div>
            Cadastre os custos nos produtos para ver lucro real.{" "}
            <Link to="/produtos" className="underline font-medium">Abrir Produtos</Link>
          </div>
        </div>
      )}
      {/* SEÇÃO 1 */}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Faturamento Bruto" value={BRL(totals.revenue)} />
        <SummaryCard label="Total Reinvestido" value={BRL(totals.totalCost)} tone="destructive" />
        <SummaryCard
          label="Lucro Líquido"
          value={BRL(totals.profit)}
          tone={totals.profit >= 0 ? "lime" : "destructive"}
          subtitle={`Margem: ${margin.toFixed(1)}%`}
        />
      </div>

      {/* SEÇÃO 2 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento de Custos</CardTitle>
          <p className="text-xs text-muted-foreground">
            Calculado cruzando vendas do ML com precificação cadastrada
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Item de Custo</th>
                  <th className="text-right font-medium px-3 py-3">Valor Total</th>
                  <th className="text-right font-medium px-3 py-3">% do Fat.</th>
                  <th className="text-right font-medium px-3 py-3">% do Custo</th>
                  <th className="text-right font-medium px-3 py-3">Por Venda</th>
                </tr>
              </thead>
              <tbody>
                {breakdownItems.map((it) => (
                  <tr key={it.label} className="border-t border-border/60">
                    <td className="px-4 py-3">{it.label}</td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(it.value)}</td>
                    <td className="text-right tabular-nums px-3 py-3 text-muted-foreground">
                      {totals.revenue > 0 ? ((it.value / totals.revenue) * 100).toFixed(1) : "0.0"}%
                    </td>
                    <td className="text-right tabular-nums px-3 py-3 text-muted-foreground">
                      {totals.totalCost > 0 ? ((it.value / totals.totalCost) * 100).toFixed(1) : "0.0"}%
                    </td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">
                      {BRL(totals.sales > 0 ? it.value / totals.sales : 0)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-border bg-muted/20 font-bold">
                  <td className="px-4 py-3">TOTAL CUSTOS</td>
                  <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(totals.totalCost)}</td>
                  <td className="text-right tabular-nums px-3 py-3">
                    {totals.revenue > 0 ? ((totals.totalCost / totals.revenue) * 100).toFixed(1) : "0.0"}%
                  </td>
                  <td className="text-right tabular-nums px-3 py-3">100.0%</td>
                  <td className="text-right tabular-nums font-mono px-3 py-3">
                    {BRL(totals.sales > 0 ? totals.totalCost / totals.sales : 0)}
                  </td>
                </tr>
                <tr
                  className={cn(
                    "border-t border-border font-bold",
                    totals.profit >= 0 ? "text-lime-500" : "text-red-500"
                  )}
                >
                  <td className="px-4 py-3">LUCRO LÍQUIDO</td>
                  <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(totals.profit)}</td>
                  <td className="text-right tabular-nums px-3 py-3">{margin.toFixed(1)}%</td>
                  <td className="text-right tabular-nums px-3 py-3">—</td>
                  <td className="text-right tabular-nums font-mono px-3 py-3">
                    {BRL(totals.sales > 0 ? totals.profit / totals.sales : 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 3 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição dos Custos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {breakdownItems.map((it) => {
            const pct = totals.revenue > 0 ? (it.value / totals.revenue) * 100 : 0;
            const w = (it.value / maxBreakdown) * 100;
            return (
              <div key={it.label} className="flex items-center gap-3">
                <div className="w-28 text-sm text-muted-foreground truncate">{it.label}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${w}%` }} />
                </div>
                <div className="w-28 text-right text-sm font-mono">{BRL(it.value)}</div>
                <div className="w-14 text-right text-xs text-muted-foreground tabular-nums">
                  {pct.toFixed(1)}%
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* SEÇÃO 4 */}
      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-base">Custos por Anúncio</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Quanto cada anúncio custou e gerou no período
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título ou SKU..."
                className="pl-8 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["ALL", "Todos"],
                  ["TOP_PROFIT", "Mais lucrativo"],
                  ["TOP_COST", "Mais custoso"],
                  ["TOP_MARGIN", "Maior margem"],
                  ["LOW_MARGIN", "Menor margem"],
                  ["LOSS", "Com prejuízo"],
                ] as Array<[Filter, string]>
              ).map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredAds.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Nenhum anúncio encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Anúncio</th>
                    <th className="text-right font-medium px-3 py-3">Vendas</th>
                    <th className="text-right font-medium px-3 py-3">Faturamento</th>
                    <th className="text-right font-medium px-3 py-3">Custo Total</th>
                    <th className="text-right font-medium px-3 py-3">Taxa ML</th>
                    <th className="text-right font-medium px-3 py-3">Frete</th>
                    <th className="text-right font-medium px-3 py-3">Produto</th>
                    <th className="text-right font-medium px-3 py-3">Lucro</th>
                    <th className="text-right font-medium px-3 py-3">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map((r) => (
                    <tr
                      key={r.adId}
                      onClick={() => onSelectAd(r.adId)}
                      className="border-t border-border/60 cursor-pointer hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="font-medium truncate" title={r.title}>{r.title}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">
                          {r.sku || r.mlItemId || "—"}
                        </div>
                      </td>
                      <td className="text-right tabular-nums px-3 py-3">{r.unitsSold}</td>
                      <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(r.revenue)}</td>
                      <td className="text-right tabular-nums font-mono px-3 py-3 text-red-500">
                        {BRL(r.totalCost)}
                      </td>
                      <td className="text-right tabular-nums font-mono px-3 py-3 text-muted-foreground">
                        {BRL(r.totalFee)}
                      </td>
                      <td className="text-right tabular-nums font-mono px-3 py-3 text-muted-foreground">
                        {BRL(r.totalShipping)}
                      </td>
                      <td className="text-right tabular-nums font-mono px-3 py-3 text-muted-foreground">
                        {BRL(r.totalProductCost)}
                      </td>
                      <td
                        className={cn(
                          "text-right tabular-nums font-mono px-3 py-3 font-semibold",
                          r.grossProfit >= 0 ? "text-lime-500" : "text-red-500"
                        )}
                      >
                        {BRL(r.grossProfit)}
                      </td>
                      <td
                        className={cn(
                          "text-right tabular-nums px-3 py-3",
                          r.margin >= 0 ? "text-lime-500" : "text-red-500"
                        )}
                      >
                        {r.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/20 font-bold">
                    <td className="px-4 py-3">TOTAL</td>
                    <td className="text-right tabular-nums px-3 py-3">{adTotals.sales}</td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(adTotals.revenue)}</td>
                    <td className="text-right tabular-nums font-mono px-3 py-3 text-red-500">
                      {BRL(adTotals.cost)}
                    </td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(adTotals.fee)}</td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(adTotals.ship)}</td>
                    <td className="text-right tabular-nums font-mono px-3 py-3">{BRL(adTotals.product)}</td>
                    <td
                      className={cn(
                        "text-right tabular-nums font-mono px-3 py-3",
                        adTotals.profit >= 0 ? "text-lime-500" : "text-red-500"
                      )}
                    >
                      {BRL(adTotals.profit)}
                    </td>
                    <td className="px-3 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 5 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evolução Mensal</CardTitle>
          <p className="text-xs text-muted-foreground">
            Acompanhe como seus custos e receita evoluem
          </p>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#84cc16" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#84cc16" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => BRL(v as number)} width={80} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => BRL(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="faturamento" name="Faturamento" stroke="var(--primary)" fill="url(#gFat)" strokeWidth={2} />
                <Area type="monotone" dataKey="custos" name="Custos" stroke="#ef4444" fill="url(#gCusto)" strokeWidth={2} />
                <Area type="monotone" dataKey="lucro" name="Lucro" stroke="#84cc16" fill="url(#gLucro)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "destructive" | "lime";
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-3xl font-bold mt-2 tabular-nums",
          tone === "destructive" && "text-red-500",
          tone === "lime" && "text-lime-500",
          !tone && "text-foreground"
        )}
      >
        {value}
      </div>
      {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
    </div>
  );
}
