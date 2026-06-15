import { useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface InteractiveMetric {
  key: string;
  label: string;
  color: string; // CSS color value
  value: number;
  previous: number;
  format: (n: number) => string;
  isNegativeGood?: boolean;
}

interface InteractiveLineChartProps {
  metrics: InteractiveMetric[];
  // Series: each entry has `date` plus a number per metric.key
  data: Array<{ date: string } & Record<string, number | string>>;
  defaultKey?: string;
}

function CustomTooltip({
  active,
  payload,
  metric,
}: {
  active?: boolean;
  payload?: Array<{ value: number; color: string; dataKey: string }>;
  metric?: InteractiveMetric;
}) {
  if (!active || !payload?.length || !metric) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border/60 bg-popover px-3 py-2 shadow-xl shadow-black/40 min-w-[140px]">
      <div className="flex items-center gap-2 text-xs">
        <div className="size-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
        <span className="text-muted-foreground">{metric.label}:</span>
        <span className="font-semibold text-popover-foreground tabular-nums">
          {metric.format(entry.value)}
        </span>
      </div>
    </div>
  );
}

export function InteractiveLineChart({ metrics, data, defaultKey }: InteractiveLineChartProps) {
  const [selectedKey, setSelectedKey] = useState<string>(defaultKey || metrics[0]?.key);
  const selected = metrics.find((m) => m.key === selectedKey) || metrics[0];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-0">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const change =
              metric.previous > 0
                ? ((metric.value - metric.previous) / metric.previous) * 100
                : 0;
            const positive = metric.isNegativeGood ? change < 0 : change > 0;
            const isActive = selectedKey === metric.key;
            return (
              <button
                key={metric.key}
                onClick={() => setSelectedKey(metric.key)}
                className={cn(
                  "text-left p-5 border-b border-border/60 lg:border-b-0 lg:border-r lg:last:border-r-0 transition-all relative",
                  isActive
                    ? "bg-muted/30"
                    : "hover:bg-muted/20"
                )}
                style={
                  isActive
                    ? { boxShadow: `inset 0 -2px 0 0 ${metric.color}` }
                    : undefined
                }
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    {metric.label}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      positive
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border-destructive/40 text-destructive bg-destructive/10"
                    )}
                  >
                    {positive ? <ArrowUp className="size-2.5" /> : <ArrowDown className="size-2.5" />}
                    {Math.abs(change).toFixed(1)}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold tabular-nums">
                  {metric.format(metric.value)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                  vs {metric.format(metric.previous)}
                </div>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="px-2 py-6">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 20, left: 5, bottom: 10 }}>
              <defs>
                <pattern id="dotGrid" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
                  <circle cx="11" cy="11" r="1" fill="var(--border)" fillOpacity="0.5" />
                </pattern>
                <filter id="lineShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="6"
                    floodColor={selected.color}
                    floodOpacity="0.55"
                  />
                </filter>
                <filter id="dotShadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={selected.color} floodOpacity="0.7" />
                </filter>
              </defs>

              <rect
                x="55"
                y="0"
                width="100%"
                height="100%"
                fill="url(#dotGrid)"
                style={{ pointerEvents: "none" }}
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickMargin={10}
                tickCount={5}
                tickFormatter={(v: number) => selected.format(v)}
              />
              <Tooltip
                content={<CustomTooltip metric={selected} />}
                cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
              />
              <Line
                type="monotone"
                dataKey={selected.key}
                stroke={selected.color}
                strokeWidth={2.5}
                filter="url(#lineShadow)"
                dot={false}
                activeDot={{
                  r: 6,
                  fill: selected.color,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                  filter: "url(#dotShadow)",
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
