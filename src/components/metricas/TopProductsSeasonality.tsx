import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TopProductRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTHS_LONG = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Props {
  rows: TopProductRow[];
}

export function TopProductsSeasonality({ rows }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[18px] font-bold tracking-tight">Top Produtos & Sazonalidade</CardTitle>
        <p className="text-[13px] text-muted-foreground mt-1">
          Mais vendidos nos últimos 12 meses — heatmap mostra em quais meses cada um performa melhor
        </p>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Sem vendas registradas no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="text-left font-bold px-4 py-3 w-8">#</th>
                  <th className="text-left font-bold px-2 py-3">Produto</th>
                  <th className="text-right font-bold px-3 py-3">Unid.</th>
                  <th className="text-right font-bold px-3 py-3">Receita</th>
                  <th className="text-left font-bold px-3 py-3">
                    <div className="flex gap-[3px]">
                      {MONTHS.map((m, i) => (
                        <span key={i} className="w-5 text-center text-[10px]">{m}</span>
                      ))}
                    </div>
                  </th>
                  <th className="text-right font-bold px-3 py-3">Pico</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const max = Math.max(1, ...r.monthly);
                  return (
                    <motion.tr
                      key={r.itemId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.04, 0.4) }}
                      className="border-t border-border/60 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{idx + 1}</td>
                      <td className="px-2 py-3 max-w-[300px]">
                        <div className="truncate text-sm font-medium text-foreground" title={r.title}>{r.title}</div>
                        <div className="text-[11px] text-muted-foreground tabular-nums">{r.itemId}</div>
                      </td>
                      <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">{r.units}</td>
                      <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.revenue)}</td>
                      <td className="px-3 py-3">
                        <div className="flex gap-[3px]">
                          {r.monthly.map((v, i) => {
                            const intensity = v / max;
                            return (
                              <div
                                key={i}
                                title={`${MONTHS_LONG[i]}: ${v} und.`}
                                className={cn(
                                  "w-5 h-5 rounded-sm border border-border/40",
                                  v === 0 && "bg-muted/20"
                                )}
                                style={
                                  v > 0
                                    ? {
                                        background: `color-mix(in oklab, var(--primary) ${Math.max(15, intensity * 100)}%, transparent)`,
                                      }
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className="text-right px-3 py-3 text-xs text-muted-foreground">
                        {r.monthly[r.peakMonth] > 0 ? MONTHS_LONG[r.peakMonth] : "—"}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
