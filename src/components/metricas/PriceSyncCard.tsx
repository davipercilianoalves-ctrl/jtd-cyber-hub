import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleSlash, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PriceSyncRow } from "./types";

const BRL = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  rows: PriceSyncRow[];
}

export function PriceSyncCard({ rows }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "diverg">("all");

  const counts = useMemo(() => {
    let ok = 0,
      warn = 0,
      alert = 0,
      missing = 0;
    rows.forEach((r) => {
      if (r.status === "ok") ok++;
      else if (r.status === "warn") warn++;
      else if (r.status === "alert") alert++;
      else missing++;
    });
    return { ok, warn, alert, missing };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "diverg" ? r.status !== "ok" : true))
      .filter((r) =>
        q
          ? r.title.toLowerCase().includes(q) || r.mlItemId.toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => Math.abs(b.diffPct) - Math.abs(a.diffPct));
  }, [rows, query, filter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-[18px] font-bold tracking-tight">Preço App × Mercado Livre</CardTitle>
            <p className="text-[13px] text-muted-foreground mt-1">
              Conferência em tempo real com o que está publicado no ML
            </p>
          </div>
          <div className="flex gap-1.5 text-[11px]">
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
              <CheckCircle2 className="size-3" />
              {counts.ok}
            </Badge>
            <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10 gap-1">
              <AlertTriangle className="size-3" />
              {counts.warn}
            </Badge>
            <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 gap-1">
              <AlertTriangle className="size-3" />
              {counts.alert}
            </Badge>
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <CircleSlash className="size-3" />
              {counts.missing}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-9"
            />
          </div>
          <button
            type="button"
            onClick={() => setFilter(filter === "all" ? "diverg" : "all")}
            className={cn(
              "text-xs px-3 rounded-md border transition-colors",
              filter === "diverg"
                ? "border-amber-500/50 text-amber-500 bg-amber-500/10"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {filter === "diverg" ? "Só divergentes" : "Todos"}
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Sem anúncios para exibir.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                <tr>
                  <th className="text-left font-bold px-4 py-2">Anúncio</th>
                  <th className="text-right font-bold px-3 py-2">App</th>
                  <th className="text-right font-bold px-3 py-2">ML</th>
                  <th className="text-right font-bold px-3 py-2">Diff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.adId} className="border-t border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2 max-w-[220px]">
                      <div className="text-sm font-medium text-foreground truncate" title={r.title}>{r.title}</div>
                      <div className="text-[11px] text-muted-foreground">{r.mlItemId}</div>
                    </td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-2 text-muted-foreground">{BRL(r.appPrice)}</td>
                    <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-2">
                      {r.mlPrice !== null ? BRL(r.mlPrice) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right px-3 py-2">
                      <StatusBadge row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ row }: { row: PriceSyncRow }) {
  if (row.status === "missing") {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <CircleSlash className="size-3" /> N/A
      </Badge>
    );
  }
  const cls =
    row.status === "ok"
      ? "border-primary/40 text-primary bg-primary/10"
      : row.status === "warn"
        ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
        : "border-destructive/40 text-destructive bg-destructive/10";
  const sign = row.diff >= 0 ? "+" : "";
  return (
    <Badge variant="outline" className={cn("gap-1 tabular-nums text-xs font-bold", cls)}>
      {sign}
      {row.diffPct.toFixed(1)}%
    </Badge>
  );
}
