import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface SeriesDef {
  key: string;
  label: string;
  color: string;
}

interface MultiSeriesChartProps {
  title: string;
  series: SeriesDef[];
  data: Array<{ date: string } & Record<string, number | string>>;
  primaryKey?: string; // metric used for peak/avg/growth stats
  format?: (n: number) => string;
}

function stats(values: number[]) {
  if (!values.length) return { peak: 0, average: 0, growth: 0 };
  const peak = Math.max(...values);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const first = values[0] || 0;
  const last = values[values.length - 1] || 0;
  const growth = first > 0 ? ((last - first) / first) * 100 : 0;
  return { peak, average, growth };
}

export function MultiSeriesChart({
  title,
  series,
  data,
  primaryKey,
  format = (n) => Math.round(n).toLocaleString("pt-BR"),
}: MultiSeriesChartProps) {
  const main = primaryKey || series[0]?.key;
  const computed = useMemo(
    () => stats(data.map((d) => Number(d[main] || 0))),
    [data, main]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Pico" value={format(computed.peak)} />
          <Stat label="Média" value={format(computed.average)} />
          <Stat
            label="Crescimento"
            value={`${computed.growth >= 0 ? "+" : ""}${computed.growth.toFixed(1)}%`}
            tone={computed.growth >= 0 ? "positive" : "negative"}
          />
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) => format(v)}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value: number, name: string) => {
                  const def = series.find((s) => s.key === name);
                  return [format(Number(value)), def?.label || name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => {
                  const def = series.find((s) => s.key === value);
                  return <span className="text-muted-foreground">{def?.label || value}</span>;
                }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: s.color }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const color =
    tone === "positive" ? "text-primary" : tone === "negative" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
