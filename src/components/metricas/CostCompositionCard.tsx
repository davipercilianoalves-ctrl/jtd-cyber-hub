import { useMemo } from "react";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CountUp } from "./CountUp";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  revenue: number;
  slices: Slice[];
}

export function CostCompositionCard({ revenue, slices }: Props) {
  const data = useMemo(() => slices.filter((s) => s.value > 0), [slices]);
  const totalCost = data.reduce((s, x) => s + x.value, 0);
  const profit = revenue - totalCost;
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-bold tracking-tight">Composição de Custos</CardTitle>
        <p className="text-[13px] text-muted-foreground">
          Onde cada real do faturamento está sendo gasto
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4 items-center">
          <div className="h-44 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.length ? data : [{ value: 1 }]}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={2}
                  stroke="none"
                >
                  {(data.length ? data : [{ color: "var(--muted)" }]).map((s, i) => (
                    <Cell key={i} fill={(s as Slice).color || "var(--muted)"} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Custo</span>
              <CountUp value={totalCost} format={BRL} className="text-sm font-bold tabular-nums" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Faturamento</div>
            <CountUp value={revenue} format={BRL} className="text-[20px] font-bold tabular-nums tracking-tight block" />
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mt-2">Lucro Bruto</div>
            <CountUp
              value={profit}
              format={BRL}
              className={`text-[20px] font-bold tabular-nums tracking-tight block ${profit >= 0 ? "text-primary" : "text-destructive"}`}
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {data.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">
              Sem custos registrados.
            </div>
          ) : (
            data.map((s, i) => {
              const pct = revenue > 0 ? (s.value / revenue) * 100 : 0;
              const barPct = (s.value / max) * 100;
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                    <div className="tabular-nums">
                      <span className="font-medium">{BRL(s.value)}</span>
                      <span className="text-muted-foreground ml-2">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${barPct}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: s.color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
