import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdCostRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  row: AdCostRow;
  onBack: () => void;
}

export function AdDetailView({ row, onBack }: Props) {
  const items: Array<{ label: string; total: number; unit: number }> = [
    { label: "Custo do Produto", total: row.totalProductCost, unit: row.unitCost },
    { label: "Taxa Mercado Livre", total: row.totalFee, unit: row.marketplaceFee },
    { label: "Frete", total: row.totalShipping, unit: row.shippingCost },
    { label: "Embalagem", total: row.totalPackaging, unit: row.packagingCost },
    { label: "Transporte", total: row.totalTransport, unit: row.transportCost },
    { label: "Imposto", total: row.totalTax, unit: row.tax },
  ];
  const max = Math.max(1, ...items.map((i) => i.total));

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
              <CardTitle className="text-base truncate" title={row.title}>{row.title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                {row.mlItemId || "—"} {row.sku ? `· ${row.sku}` : ""}
              </p>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "tabular-nums",
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
          <CardTitle className="text-base">Distribuição de custos deste anúncio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it) => {
            const pct = row.revenue > 0 ? (it.total / row.revenue) * 100 : 0;
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
                <div className="w-24 text-right text-xs text-muted-foreground tabular-nums">
                  un. {BRL(it.unit)}
                </div>
              </div>
            );
          })}
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
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-2xl font-bold mt-1 tabular-nums",
          tone === "primary" && "text-primary",
          tone === "destructive" && "text-destructive"
        )}
      >
        {value}
      </div>
    </div>
  );
}
