import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT = (n: number) => Math.round(n).toLocaleString("pt-BR");

export interface ForecastDailyPoint {
  date: string; // YYYY-MM-DD
  revenue: number;
  units: number;
}

export interface ForecastMonthly {
  month: string;
  current: number;
}

export interface ForecastTopProduct {
  itemId: string;
  title: string;
  units: number;
  revenue: number;
  monthly: number[];
}

interface Props {
  daily: ForecastDailyPoint[]; // últimos 90 dias
  monthly: ForecastMonthly[]; // 12 meses
  topProducts: ForecastTopProduct[]; // ordenados por vendas
  marginPct: number; // margem média estimada
}

export function ForecastView({ daily, monthly, topProducts, marginPct }: Props) {
  const projection = useMemo(() => {
    const total = daily.reduce((s, d) => s + d.revenue, 0);
    const units = daily.reduce((s, d) => s + d.units, 0);
    const days = Math.max(1, daily.length);
    const dailyAvgRev = total / days;
    const dailyAvgUnits = units / days;

    const last14 = daily.slice(-14).reduce((s, d) => s + d.revenue, 0);
    const prev14 = daily.slice(-28, -14).reduce((s, d) => s + d.revenue, 0);
    const trend = prev14 > 0 ? last14 / prev14 : 1;
    const trendFactor = Math.max(0.5, Math.min(1.8, trend));

    const nextDays = 30;
    const realistic = dailyAvgRev * nextDays * trendFactor;
    const unitsProj = dailyAvgUnits * nextDays * trendFactor;
    return {
      realistic,
      optimistic: realistic * 1.2,
      conservative: realistic * 0.8,
      units: unitsProj,
      profit: realistic * (marginPct / 100),
      trendFactor,
      dailyAvgRev,
    };
  }, [daily, marginPct]);

  const chartData = useMemo(() => {
    const out: Array<{ date: string; historico?: number; projecao?: number }> = [];
    daily.forEach((d) => {
      const dt = new Date(d.date);
      out.push({
        date: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
        historico: d.revenue,
      });
    });
    if (daily.length > 0) {
      const last = new Date(daily[daily.length - 1].date);
      const lastVal = daily[daily.length - 1].revenue;
      // Bridge point so the line connects
      out[out.length - 1] = { ...out[out.length - 1], projecao: lastVal };
      for (let i = 1; i <= 30; i++) {
        const d = new Date(last);
        d.setDate(d.getDate() + i);
        out.push({
          date: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          projecao: projection.dailyAvgRev * projection.trendFactor,
        });
      }
    }
    return out;
  }, [daily, projection]);

  const monthlyAvg = useMemo(() => {
    const nonZero = monthly.filter((m) => m.current > 0);
    if (!nonZero.length) return 0;
    return nonZero.reduce((s, m) => s + m.current, 0) / nonZero.length;
  }, [monthly]);

  const heatMax = Math.max(1, ...monthly.map((m) => m.current));

  const insightMonth = useMemo(() => {
    if (!monthly.length || monthlyAvg === 0) return null;
    const now = new Date();
    const nextIdx = (now.getMonth() + 1) % 12;
    const target = monthly[monthly.length - (12 - nextIdx)]; // approximation: use same month from history (already chronological)
    if (!target || target.current === 0) return null;
    const diffPct = ((target.current - monthlyAvg) / monthlyAvg) * 100;
    return { month: target.month, diffPct };
  }, [monthly, monthlyAvg]);

  const top5 = topProducts.slice(0, 5).map((p) => {
    const recent = p.monthly.slice(-2).reduce((s, v) => s + v, 0);
    const prior = p.monthly.slice(-4, -2).reduce((s, v) => s + v, 0);
    const t = prior > 0 ? recent / prior : recent > 0 ? 1.2 : 1;
    const projection = (p.units / 12) * t;
    return { ...p, projection, trend: t };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <ProjCard
          label="Faturamento Projetado"
          value={BRL(projection.realistic)}
          subtitle={`Realista · Otimista ${BRL(projection.optimistic)} · Conservador ${BRL(projection.conservative)}`}
        />
        <ProjCard
          label="Vendas Projetadas"
          value={`${INT(projection.units)} un.`}
          subtitle="Média dos últimos 90 dias × tendência"
        />
        <ProjCard
          label="Lucro Estimado"
          value={BRL(projection.profit)}
          tone={projection.profit >= 0 ? "lime" : "destructive"}
          subtitle={`Margem média de ${marginPct.toFixed(1)}%`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendência de Faturamento</CardTitle>
          <p className="text-xs text-muted-foreground">
            Últimos 90 dias (sólido) e projeção para os próximos 30 dias (tracejado)
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground text-center">Sem dados históricos.</div>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="histG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="projG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--cyan,#22d3ee)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--cyan,#22d3ee)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} interval="preserveStartEnd" />
                  <YAxis tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} tickFormatter={(v) => BRL(v as number)} width={80} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => BRL(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={chartData[daily.length - 1]?.date} stroke="var(--muted-foreground)" strokeDasharray="2 2" />
                  <Area type="monotone" dataKey="historico" name="Histórico" stroke="var(--primary)" fill="url(#histG)" strokeWidth={2} />
                  <Area type="monotone" dataKey="projecao" name="Projeção" stroke="var(--cyan,#22d3ee)" fill="url(#projG)" strokeWidth={2} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sazonalidade</CardTitle>
          <p className="text-xs text-muted-foreground">Faturamento por mês (12 meses)</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-12 gap-1">
            {monthly.map((m, i) => {
              const intensity = m.current / heatMax;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div
                    className="w-full h-12 rounded"
                    style={{ background: `color-mix(in oklab, var(--primary) ${Math.max(8, intensity * 90)}%, transparent)` }}
                    title={`${m.month}: ${BRL(m.current)}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{m.month}</span>
                </div>
              );
            })}
          </div>
          {insightMonth && (
            <div className="text-xs rounded-lg border border-border bg-muted/30 p-3">
              Historicamente <strong>{insightMonth.month}</strong> fica{" "}
              <strong className={insightMonth.diffPct >= 0 ? "text-lime-500" : "text-red-500"}>
                {insightMonth.diffPct >= 0 ? "+" : ""}{insightMonth.diffPct.toFixed(0)}%
              </strong>{" "}
              vs. a média mensal ({BRL(monthlyAvg)}).
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção por Produto (Top 5)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {top5.length === 0 ? (
            <div className="p-10 text-sm text-muted-foreground text-center">Sem dados de produtos.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Produto</th>
                    <th className="text-right font-medium px-3 py-3">Vendas 30d</th>
                    <th className="text-right font-medium px-3 py-3">Projeção 30d</th>
                    <th className="text-center font-medium px-3 py-3">Tendência</th>
                  </tr>
                </thead>
                <tbody>
                  {top5.map((p) => {
                    const recent30 = p.monthly[p.monthly.length - 1] || 0;
                    return (
                      <tr key={p.itemId} className="border-t border-border/60">
                        <td className="px-4 py-3 max-w-[300px]">
                          <div className="truncate" title={p.title}>{p.title}</div>
                        </td>
                        <td className="text-right tabular-nums px-3 py-3">{INT(recent30)}</td>
                        <td className="text-right tabular-nums px-3 py-3">{INT(p.projection)}</td>
                        <td className="text-center px-3 py-3">
                          {p.trend > 1.1 ? (
                            <TrendingUp className={cn("inline size-4 text-lime-500")} />
                          ) : p.trend < 0.9 ? (
                            <TrendingDown className={cn("inline size-4 text-red-500")} />
                          ) : (
                            <Minus className="inline size-4 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProjCard({
  label,
  value,
  subtitle,
  tone,
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "lime" | "destructive";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
        <div
          className={cn(
            "text-3xl font-bold mt-2 tabular-nums",
            tone === "lime" && "text-lime-500",
            tone === "destructive" && "text-destructive"
          )}
        >
          {value}
        </div>
        {subtitle && <div className="text-xs text-muted-foreground mt-2">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}
