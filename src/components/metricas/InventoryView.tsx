import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Search, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const INT = (n: number) => Math.round(n).toLocaleString("pt-BR");

interface ProductRow {
  id: string;
  name: string | null;
  sku: string | null;
  volumes: number | null;
}

type StatusKey = "ALL" | "BUY" | "WARN" | "OK";

interface SalesByProduct {
  monthlyUnits: number; // vendas últimos 30 dias
}

interface Props {
  /** Map: product_id (or sku) -> SalesByProduct */
  salesByProduct: Map<string, SalesByProduct>;
}

export function InventoryView({ salesByProduct }: Props) {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusKey>("ALL");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, name, sku, volumes")
        .order("name", { ascending: true });
      if (cancelled) return;
      setProducts((data || []) as ProductRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enriched = useMemo(() => {
    return products.map((p) => {
      const sales = salesByProduct.get(p.id) || salesByProduct.get(p.sku || "") || { monthlyUnits: 0 };
      const stock = Number(p.volumes ?? 0);
      const daily = sales.monthlyUnits / 30;
      const daysLeft = daily > 0 ? Math.floor(stock / daily) : null; // null = sem vendas
      let status: "BUY" | "WARN" | "OK" | "NONE" = "OK";
      if (p.volumes === null || p.volumes === undefined) status = "NONE";
      else if (daysLeft === null) status = "OK";
      else if (daysLeft < 7) status = "BUY";
      else if (daysLeft <= 30) status = "WARN";
      return { ...p, stock, monthlyUnits: sales.monthlyUnits, daysLeft, status };
    });
  }, [products, salesByProduct]);

  const counts = useMemo(() => {
    return {
      buy: enriched.filter((e) => e.status === "BUY").length,
      warn: enriched.filter((e) => e.status === "WARN").length,
      ok: enriched.filter((e) => e.status === "OK").length,
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched;
    if (q) list = list.filter((p) => (p.name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
    if (filter !== "ALL") list = list.filter((p) => p.status === filter);
    return list.sort((a, b) => {
      const order = { BUY: 0, WARN: 1, OK: 2, NONE: 3 };
      return order[a.status] - order[b.status];
    });
  }, [enriched, query, filter]);

  const alerts = enriched
    .filter((e) => e.status === "BUY" || e.status === "WARN")
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    .slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <SemaphoreCard tone="red" label="Comprar agora" count={counts.buy} />
        <SemaphoreCard tone="amber" label="Atenção" count={counts.warn} />
        <SemaphoreCard tone="lime" label="Estoque OK" count={counts.ok} />
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="text-[18px] font-bold tracking-tight">Estoque Inteligente</CardTitle>
            <p className="text-[13px] text-muted-foreground mt-1">
              Vendas dos últimos 30 dias vs. estoque cadastrado
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome ou SKU..."
                className="pl-8 h-9"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {([
                ["ALL", "Todos"],
                ["BUY", "Comprar agora"],
                ["WARN", "Atenção"],
                ["OK", "OK"],
              ] as Array<[StatusKey, string]>).map(([f, label]) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-sm text-muted-foreground text-center">Nenhum produto encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  <tr>
                    <th className="text-left font-bold px-4 py-3">Produto</th>
                    <th className="text-right font-bold px-3 py-3">Estoque</th>
                    <th className="text-right font-bold px-3 py-3">Vendas/mês</th>
                    <th className="text-right font-bold px-3 py-3">Dias restantes</th>
                    <th className="text-left font-bold px-3 py-3">Status</th>
                    <th className="text-left font-bold px-4 py-3">Ação sugerida</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const daily = p.monthlyUnits / 30;
                    const suggested = daily > 0 && p.daysLeft !== null
                      ? p.status === "BUY"
                        ? `Comprar ${Math.ceil(daily * 30)} unidades agora`
                        : p.status === "WARN"
                          ? `Comprar em ~${Math.max(1, p.daysLeft - 7)} dias`
                          : "OK"
                      : "OK";
                    return (
                      <tr key={p.id} className="border-t border-border/60">
                        <td className="px-4 py-3 max-w-[280px]">
                          <div className="text-sm font-medium text-foreground truncate">{p.name || "—"}</div>
                          <div className="text-[11px] text-muted-foreground tabular-nums">{p.sku || "—"}</div>
                        </td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">
                          {p.status === "NONE" ? "—" : INT(p.stock)}
                        </td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">{INT(p.monthlyUnits)}</td>
                        <td className="text-right text-sm font-semibold tabular-nums font-mono px-3 py-3">
                          {p.daysLeft === null ? "—" : `${p.daysLeft}d`}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{suggested}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-[18px] font-bold tracking-tight">Alertas de Reposição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum alerta ativo.</div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-sm",
                  a.status === "BUY" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"
                )}
              >
                <AlertTriangle className={cn("size-4 mt-0.5 shrink-0", a.status === "BUY" ? "text-red-500" : "text-amber-500")} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name || a.sku || "Produto"}</div>
                  <div className="text-xs text-muted-foreground">
                    Estoque para {a.daysLeft}d · Vende {INT(a.monthlyUnits)}/mês
                  </div>
                </div>
              </div>
            ))
          )}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Produtos sem estoque cadastrado aparecem com "—".{" "}
            <Link to="/produtos" className="text-primary hover:underline">Cadastrar estoque</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SemaphoreCard({ tone, label, count }: { tone: "red" | "amber" | "lime"; label: string; count: number }) {
  const toneCls =
    tone === "red"
      ? "border-red-500/40 bg-red-500/10 text-red-500"
      : tone === "amber"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
        : "border-lime-500/40 bg-lime-500/10 text-lime-500";
  const dot = tone === "red" ? "🔴" : tone === "amber" ? "🟡" : "🟢";
  return (
    <Card className={cn("border", toneCls)}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="text-3xl">{dot}</div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-80">{label}</div>
          <div className="text-[28px] font-extrabold tabular-nums tracking-tight">{count}</div>
          <div className="text-[13px] opacity-80">produto(s)</div>
        </div>
        <Package className="ml-auto size-6 opacity-50" />
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "BUY" | "WARN" | "OK" | "NONE" }) {
  if (status === "NONE")
    return <Badge variant="outline" className="text-muted-foreground">Sem estoque cadastrado</Badge>;
  if (status === "BUY") return <Badge variant="outline" className="border-red-500/40 text-red-500 bg-red-500/10">🔴 &lt;7 dias</Badge>;
  if (status === "WARN") return <Badge variant="outline" className="border-amber-500/40 text-amber-500 bg-amber-500/10">🟡 7-30d</Badge>;
  return <Badge variant="outline" className="border-lime-500/40 text-lime-500 bg-lime-500/10">🟢 &gt;30d</Badge>;
}
