import { ArrowDown, ArrowUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConversionFunnel, type FunnelStage } from "./ConversionFunnel";
import { CountUp } from "./CountUp";

export interface HeroKpi {
  label: string;
  value: number;
  previous: number;
  format: (n: number) => string;
  isNegativeGood?: boolean;
}

export interface SecondaryMetric {
  label: string;
  value: string;
  icon?: React.ReactNode;
  pill?: { value: string; positive: boolean };
}

interface FunnelHeroCardProps {
  title: string;
  subtitle?: string;
  funnel: FunnelStage[];
  kpis: [HeroKpi, HeroKpi];
  secondary: SecondaryMetric[];
}

function delta(current: number, previous: number, isNegativeGood = false) {
  if (!previous) return { value: 0, positive: true };
  const change = ((current - previous) / previous) * 100;
  const positive = isNegativeGood ? change < 0 : change > 0;
  return { value: Math.abs(change), positive };
}

export function FunnelHeroCard({ title, subtitle, funnel, kpis, secondary }: FunnelHeroCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between">
        <div className="space-y-1">
          <CardTitle className="text-[18px] font-bold tracking-tight">{title}</CardTitle>
          {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Funnel */}
        <div className="min-h-[280px]">
          <ConversionFunnel stages={funnel} />
        </div>

        {/* KPIs + Secondary */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            {kpis.map((k) => {
              const d = delta(k.value, k.previous, k.isNegativeGood);
              return (
                <div key={k.label} className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {k.label}
                  </div>
                  <div className="text-[28px] font-extrabold tabular-nums tracking-tight">
                    <CountUp value={k.value} format={k.format} />
                  </div>
                  <Badge
                    variant="outline"
                    className={`gap-1 text-xs font-bold ${
                      d.positive
                        ? "border-primary/40 text-primary bg-primary/10"
                        : "border-destructive/40 text-destructive bg-destructive/10"
                    }`}
                  >
                    {d.positive ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                    {d.value.toFixed(1)}%
                  </Badge>
                </div>
              );
            })}
          </div>

          <div className="space-y-0 border-t border-border/60">
            {secondary.map((s, i) => (
              <div
                key={s.label}
                className={`flex items-center justify-between py-3 ${
                  i < secondary.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  {s.icon}
                  <span>{s.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {s.value}
                  </span>
                  {s.pill && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.pill.positive
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {s.pill.value}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
