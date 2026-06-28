import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AdCostRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type SortKey = "unitsSold" | "revenue" | "totalCost" | "grossProfit" | "margin";

interface Props {
  rows: AdCostRow[];
  onSelect?: (adId: string) => void;
}

export function AdCostBreakdownTable({ rows, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.sku || "").toLowerCase().includes(q) ||
            (r.mlItemId || "").toLowerCase().includes(q)
        )
      : rows.slice();
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [rows, query, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <CardTitle className="text-[18px] font-bold tracking-tight">Custos por Anúncio</CardTitle>
          <p className="text-[13px] text-muted-foreground mt-1">
            Detalhamento de cada custo × unidades vendidas no período
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar anúncio, SKU ou MLB..."
            className="pl-8 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Sem anúncios para exibir.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="text-left font-bold px-4 py-3">Anúncio</th>
                  <SortableTh label="Vend." active={sortKey === "unitsSold"} dir={sortDir} onClick={() => toggleSort("unitsSold")} />
                  <SortableTh label="Receita" active={sortKey === "revenue"} dir={sortDir} onClick={() => toggleSort("revenue")} />
                  <th className="text-right font-bold px-3 py-3">Produto</th>
                  <th className="text-right font-bold px-3 py-3">Taxa ML</th>
                  <th className="text-right font-bold px-3 py-3">Frete</th>
                  <th className="text-right font-bold px-3 py-3">Embal.</th>
                  <th className="text-right font-bold px-3 py-3">Transp.</th>
                  <th className="text-right font-bold px-3 py-3">Imp.</th>
                  <SortableTh label="Custo Total" active={sortKey === "totalCost"} dir={sortDir} onClick={() => toggleSort("totalCost")} />
                  <SortableTh label="Lucro" active={sortKey === "grossProfit"} dir={sortDir} onClick={() => toggleSort("grossProfit")} />
                  <SortableTh label="Margem" active={sortKey === "margin"} dir={sortDir} onClick={() => toggleSort("margin")} />
                  {onSelect && <th className="w-10 px-2 py-3" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.adId}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.3) }}
                    className="border-t border-border/60 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 max-w-[260px]">
                      <div className="text-sm font-medium text-foreground truncate" title={r.title}>{r.title}</div>
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {r.mlItemId || "—"} {r.sku ? `· ${r.sku}` : ""}
                      </div>
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">{r.unitsSold}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">{BRL(r.revenue)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalProductCost)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalFee)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalShipping)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalPackaging)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalTransport)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3 text-muted-foreground">{BRL(r.totalTax)}</td>
                    <td className="text-right text-sm font-bold tabular-nums font-mono px-3 py-3">{BRL(r.totalCost)}</td>
                    <td className={cn("text-right text-sm font-bold tabular-nums font-mono px-3 py-3", r.grossProfit >= 0 ? "text-primary" : "text-destructive")}>
                      {BRL(r.grossProfit)}
                    </td>
                    <td className="text-right px-3 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "tabular-nums text-xs font-bold",
                          r.margin >= 20 && "border-primary/40 text-primary bg-primary/10",
                          r.margin < 20 && r.margin >= 5 && "border-amber-500/40 text-amber-500 bg-amber-500/10",
                          r.margin < 5 && "border-destructive/40 text-destructive bg-destructive/10"
                        )}
                      >
                        {r.margin.toFixed(1)}%
                      </Badge>
                    </td>
                    {onSelect && (
                      <td className="px-2 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelect(r.adId)}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="Ver métricas"
                        >
                          Ver métricas <ChevronRight className="size-3.5" />
                        </button>
                      </td>
                    )}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="text-right font-bold px-3 py-3">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          active && "text-foreground"
        )}
      >
        {label}
        <ArrowUpDown className={cn("size-3", active ? "opacity-100" : "opacity-40")} style={{ transform: active && dir === "asc" ? "rotate(180deg)" : undefined }} />
      </button>
    </th>
  );
}
