import { useEffect, useState } from "react";
import { Wallet, RefreshCcw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceiro, type FinanceiroPeriod } from "@/hooks/useFinanceiro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIODS: { value: FinanceiroPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "60d", label: "60 dias" },
  { value: "90d", label: "90 dias" },
];

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="jtd-glass p-5 space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`text-[20px] font-bold tabular-nums tracking-tight ${
          accent || "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SkeletonCard() {
  return <div className="jtd-glass p-5 h-[100px] animate-pulse bg-muted/10" />;
}

export default function Financeiro() {
  const [period, setPeriod] = useState<FinanceiroPeriod>("30d");
  const { orders, summary, loading, error, fetchOrders, hasMore, loadMore } = useFinanceiro();

  useEffect(() => {
    fetchOrders(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[color:var(--lime)]/30 bg-[color:var(--lime)]/10 p-2">
            <Wallet className="h-5 w-5 text-[color:var(--lime)]" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold tracking-tight">Financeiro</h1>
            <p className="text-[13px] text-muted-foreground">
              Liberações, custos e lucro real de cada venda
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
                period === p.value
                  ? "bg-[color:var(--lime)]/15 text-[color:var(--lime)] border border-[color:var(--lime)]/30"
                  : "bg-muted/10 text-muted-foreground hover:bg-muted/20 border border-transparent"
              }`}
            >
              {p.label}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchOrders(period)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="jtd-glass p-4 border border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading && !summary ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : summary ? (
          <>
            <SummaryCard
              label="Faturamento bruto"
              value={fmtBRL(summary.total_gross)}
              hint={`${summary.orders_count} vendas`}
            />
            <SummaryCard
              label="Líquido (após ML)"
              value={fmtBRL(summary.total_net)}
              hint={`Taxas ML: ${fmtBRL(summary.total_ml_fees)}`}
            />
            <SummaryCard
              label="Lucro real"
              value={fmtBRL(summary.total_profit)}
              hint={`Custo: ${fmtBRL(summary.total_cost)}`}
              accent="text-[color:var(--lime)]"
            />
            <SummaryCard
              label="Reinvestimento"
              value={fmtBRL(summary.total_reinvestment)}
              hint="Baseado em precificação"
            />
            <SummaryCard
              label="Já liberado"
              value={fmtBRL(summary.total_released)}
              hint={`${summary.released_count} vendas`}
              accent="text-green-400"
            />
            <SummaryCard
              label="A liberar"
              value={fmtBRL(summary.total_pending)}
              hint={`${summary.pending_count} vendas`}
              accent="text-amber-400"
            />
            <SummaryCard
              label="Próx. 7 dias"
              value={fmtBRL(summary.total_upcoming)}
              hint="Liberações futuras"
            />
            <SummaryCard
              label="Margem média"
              value={
                summary.total_net > 0
                  ? `${((summary.total_profit / summary.total_net) * 100).toFixed(1)}%`
                  : "—"
              }
              hint="Lucro / líquido"
            />
          </>
        ) : null}
      </div>

      {/* Lista de vendas */}
      <div className="jtd-glass overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-[18px] font-bold tracking-tight">Vendas do período</h2>
          {summary && (
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {summary.orders_count} resultado(s)
            </span>
          )}
        </div>

        {loading && orders.length === 0 ? (
          <div className="p-5 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-muted/10 animate-pulse rounded" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada no período.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground border-b border-white/5">
                  <th className="text-left px-5 py-3">Pedido</th>
                  <th className="text-left px-3 py-3">Produto</th>
                  <th className="text-left px-3 py-3">Comprador</th>
                  <th className="text-right px-3 py-3">Bruto</th>
                  <th className="text-right px-3 py-3">Taxa ML</th>
                  <th className="text-right px-3 py-3">Custo</th>
                  <th className="text-right px-3 py-3">Lucro</th>
                  <th className="text-left px-3 py-3">Liberação</th>
                  <th className="text-left px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const cost = o.product_cost || 0;
                  const profit = o.net_amount - cost;
                  return (
                    <tr
                      key={o.order_id}
                      className="border-b border-white/5 hover:bg-muted/5 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div className="font-mono text-[11px] text-muted-foreground">
                          #{o.order_id}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {format(new Date(o.date_created), "dd/MM/yy", { locale: ptBR })}
                        </div>
                      </td>
                      <td className="px-3 py-3 max-w-[260px]">
                        <div className="text-sm font-medium truncate">
                          {o.items[0]?.title || "—"}
                        </div>
                        {o.items.length > 1 && (
                          <div className="text-[11px] text-muted-foreground">
                            +{o.items.length - 1} item(s)
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm">{o.buyer.name}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums font-mono">
                        {fmtBRL(o.gross_amount)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums font-mono text-red-400">
                        -{fmtBRL(o.ml_fee)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums font-mono text-muted-foreground">
                        {cost > 0 ? fmtBRL(cost) : "—"}
                      </td>
                      <td
                        className={`px-3 py-3 text-right text-sm font-semibold tabular-nums font-mono ${
                          profit >= 0 ? "text-[color:var(--lime)]" : "text-red-400"
                        }`}
                      >
                        {fmtBRL(profit)}
                      </td>
                      <td className="px-3 py-3 text-[11px] font-mono text-muted-foreground">
                        {o.release_date
                          ? format(new Date(o.release_date), "dd/MM/yy", { locale: ptBR })
                          : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            o.release_status === "released"
                              ? "bg-green-500/15 text-green-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}
                        >
                          {o.release_status === "released" ? "Liberado" : "Pendente"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && (
          <div className="p-4 flex justify-center border-t border-white/5">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Carregar mais
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
