import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MonthlySalesPoint } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const INT = (n: number) => Math.round(n).toLocaleString("pt-BR");

type Mode = "revenue" | "orders" | "units";

interface Props {
  data: MonthlySalesPoint[];
}

const MODES: Array<{ key: Mode; label: string }> = [
  { key: "revenue", label: "Faturamento" },
  { key: "orders", label: "Vendas" },
  { key: "units", label: "Unidades" },
];

export function YearlySalesChart({ data }: Props) {
  const [mode, setMode] = useState<Mode>("revenue");

  const fmt = mode === "revenue" ? BRL : INT;

  const chartData = useMemo(() => {
    return data.map((d) => ({
      month: d.month,
      current: mode === "revenue" ? d.current : mode === "orders" ? d.orders : d.units,
      previous: mode === "revenue" ? d.previous : 0,
    }));
  }, [data, mode]);

  const total = chartData.reduce((s, d) => s + d.current, 0);
  const peak = chartData.reduce((p, d) => (d.current > p.current ? d : p), chartData[0] || { month: "—", current: 0 });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between flex-wrap gap-3">
        <div>
          <CardTitle className="text-[18px] font-bold tracking-tight">Vendas no Ano</CardTitle>
          <p className="text-[13px] text-muted-foreground mt-1">
            Últimos 12 meses vs ano anterior · Total {fmt(total)} · Pico em {peak.month}
          </p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-muted/20 p-0.5">
          {MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cn(
                "px-3 h-8 text-xs rounded-sm transition-colors",
                mode === m.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {mode === "revenue" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="curGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--cyan)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--cyan)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="yearGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="var(--primary)" floodOpacity="0.55" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={fmt} width={75} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="previous" name="Ano anterior" stroke="var(--cyan)" strokeWidth={1.5} strokeDasharray="4 4" fill="url(#prevGrad)" />
                <Area type="monotone" dataKey="current" name="Atual" stroke="var(--primary)" strokeWidth={2.5} fill="url(#curGrad)" filter="url(#yearGlow)" />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 16, left: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={fmt} width={55} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmt(v)}
                />
                <Line type="monotone" dataKey="current" stroke="var(--magenta)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--magenta)" }} activeDot={{ r: 6 }} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
