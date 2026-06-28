import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdCostRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export interface AdEvolutionPoint {
  date: string; // dd/MM
  receita: number;
  lucro: number;
}

export interface AdSaleRow {
  orderId: string;
  date: string; // ISO
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Props {
  row: AdCostRow;
  evolution: AdEvolutionPoint[];
  sales: AdSaleRow[];
  onBack: () => void;
}

const PAGE_SIZE = 10;

export function AdDetailView({ row, evolution, sales, onBack }: Props) {
  const [page, setPage] = useState(0);

  const items: Array<{ label: string; total: number; unit: number }> = [
    { label: "Custo do Produto", total: row.totalProductCost, unit: row.unitCost },
    { label: "Taxa Mercado Livre", total: row.totalFee, unit: row.marketplaceFee },
    { label: "Frete", total: row.totalShipping, unit: row.shippingCost },
    { label: "Embalagem", total: row.totalPackaging, unit: row.packagingCost },
    { label: "Transporte", total: row.totalTransport, unit: row.transportCost },
    { label: "Imposto", total: row.totalTax, unit: row.tax },
  ];
  const max = Math.max(1, ...items.map((i) => i.total));

  const pageCount = Math.max(1, Math.ceil(sales.length / PAGE_SIZE));
  const pageSales = useMemo(
    () => sales.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [sales, page]
  );

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Voltar para lista
      </button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-[18px] font-bold tracking-tight truncate" title={row.title}>{row.title}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                {row.mlItemId || "—"} {row.sku ? `· ${row.sku}` : ""}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "tabular-nums text-xs font-bold",
                row.margin >= 20 && "border-primary/40 text-primary bg-primary/10",
                row.margin < 20 && row.margin >= 5 && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                row.margin < 5 && "border-destructive/40 text-destructive bg-destructive/10"
              )}
            >
              Margem {row.margin.toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Stat label="Vendas" value={String(row.unitsSold)} />
          <Stat label="Receita" value={BRL(row.revenue)} />
          <Stat label="Custo Total" value={BRL(row.totalCost)} tone="destructive" />
          <Stat
            label="Lucro"
            value={BRL(row.grossProfit)}
            tone={row.grossProfit >= 0 ? "primary" : "destructive"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] font-bold tracking-tight">Distribuição de custos deste anúncio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => {
            const pct = row.revenue > 0 ? (it.total / row.revenue) * 100 : 0;
            const costPct = row.totalCost > 0 ? (it.total / row.totalCost) * 100 : 0;
            const w = (it.total / max) * 100;
            return (
              <div key={it.label} className="flex items-center gap-3">
                <div className="w-32 text-sm text-muted-foreground">{it.label}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${w}%` }} />
                </div>
                <div className="w-28 text-right text-sm font-mono">{BRL(it.total)}</div>
                <div className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                  {pct.toFixed(1)}%
                </div>
                <div className="w-16 text-right text-xs text-muted-foreground tabular-nums">
                  {costPct.toFixed(1)}%
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                  un. {BRL(it.unit)}
                </div>
              </div>
            );
          })}
          <div className="border-t border-border pt-3 mt-3 flex items-center gap-3 text-sm font-semibold">
            <div className="w-32">TOTAL CUSTOS</div>
            <div className="flex-1" />
            <div className="w-28 text-right font-mono text-red-500">{BRL(row.totalCost)}</div>
          </div>
          <div className={cn(
            "flex items-center gap-3 text-sm font-semibold",
            row.grossProfit >= 0 ? "text-lime-500" : "text-red-500"
          )}>
            <div className="w-32">LUCRO LÍQUIDO</div>
            <div className="flex-1" />
            <div className="w-28 text-right font-mono">{BRL(row.grossProfit)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] font-bold tracking-tight">Evolução no período</CardTitle>
          <p className="text-[13px] text-muted-foreground">Receita e lucro estimado dia a dia</p>
        </CardHeader>
        <CardContent>
          {evolution.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Sem vendas no período.</div>
          ) : (
            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer>
                <LineChart data={evolution} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={11} />
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
                  <Line type="monotone" dataKey="receita" name="Receita" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#84cc16" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] font-bold tracking-tight">Histórico de vendas</CardTitle>
          <p className="text-[13px] text-muted-foreground">{sales.length} venda(s) no período</p>
        </CardHeader>
        <CardContent className="p-0">
          {sales.length === 0 ? (
            <div className="p-10 text-sm text-muted-foreground text-center">Sem vendas no período.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <tr>
                      <th className="text-left font-bold px-4 py-3">Data</th>
                      <th className="text-left font-bold px-3 py-3">Pedido</th>
                      <th className="text-right font-bold px-3 py-3">Qtd</th>
                      <th className="text-right font-bold px-3 py-3">Valor unit.</th>
                      <th className="text-right font-bold px-3 py-3">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSales.map((s) => (
                      <tr key={s.orderId} className="border-t border-border/60">
                        <td className="px-4 py-2.5 text-sm font-semibold tabular-nums font-mono">
                          {new Date(s.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-3 py-2.5 text-[11px] tabular-nums text-muted-foreground">{s.orderId}</td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-2.5">{s.quantity}</td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-2.5">{BRL(s.unitPrice)}</td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-2.5">{BRL(s.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pageCount > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
                  <span>Página {page + 1} de {pageCount}</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="rounded border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={page >= pageCount - 1}
                      className="rounded border border-border px-3 py-1 hover:bg-muted disabled:opacity-40"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "destructive";
}) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-[20px] font-bold mt-1 tabular-nums tracking-tight",
          tone === "primary" && "text-primary",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}
