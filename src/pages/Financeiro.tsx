import { useEffect, useMemo, useState } from "react";
import { Wallet, RefreshCcw, Loader2, AlertCircle, Inbox, Link2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFinanceiro, type FinanceiroPeriod, type FinanceiroOrder } from "@/hooks/useFinanceiro";
import { FinanceiroSummaryCards } from "@/components/financeiro/FinanceiroSummaryCards";
import {
  FinanceiroFilters,
  type FilterStatus,
  type SortBy,
} from "@/components/financeiro/FinanceiroFilters";
import { FinanceiroOrderCard } from "@/components/financeiro/FinanceiroOrderCard";
import { SaldoMLCard } from "@/components/financeiro/SaldoMLCard";
import { ExtratoML } from "@/components/financeiro/ExtratoML";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { subDays, startOfDay, endOfDay, formatISO } from "date-fns";

const PERIODS: { value: FinanceiroPeriod; label: string }[] = [
  { value: "7d", label: "7 dias" },
  { value: "15d", label: "15 dias" },
  { value: "30d", label: "30 dias" },
  { value: "60d", label: "60 dias" },
  { value: "90d", label: "90 dias" },
];

export default function Financeiro() {
  const [period, setPeriod] = useState<FinanceiroPeriod>("30d");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("date_desc");
  const [overrides, setOverrides] = useState<Record<number, Partial<FinanceiroOrder>>>({});
  const [activeTab, setActiveTab] = useState<"vendas" | "extrato">("vendas");
  const [refreshKey, setRefreshKey] = useState(0);

  const { orders, summary, loading, error, fetchOrders, hasMore, loadMore, fetchBalance, fetchMovements } =
    useFinanceiro();

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    const days = ({ "7d": 7, "15d": 15, "30d": 30, "60d": 60, "90d": 90 } as Record<string, number>)[period] || 30;
    return {
      dateFrom: formatISO(startOfDay(subDays(now, days))),
      dateTo: formatISO(endOfDay(now)),
    };
  }, [period]);

  useEffect(() => {
    fetchOrders(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Load overrides for current orders
  useEffect(() => {
    if (!orders.length) return;
    const ids = orders.map((o) => o.order_id);
    (async () => {
      const { data } = await supabase
        .from("order_cost_overrides")
        .select("order_id, packaging_cost, transport_cost, tax_cost")
        .in("order_id", ids);
      const map: Record<number, Partial<FinanceiroOrder>> = {};
      (data || []).forEach((r: any) => {
        map[r.order_id] = {
          packaging_cost: Number(r.packaging_cost) || 0,
          transport_cost: Number(r.transport_cost) || 0,
          tax_cost: Number(r.tax_cost) || 0,
        };
      });
      setOverrides(map);
    })();
  }, [orders]);

  const enriched = useMemo(
    () =>
      orders.map((o) => ({
        ...o,
        ...(overrides[o.order_id] || {}),
      })),
    [orders, overrides]
  );

  const filtered = useMemo(() => {
    return enriched
      .filter((o) => {
        if (status !== "all" && o.release_status !== status) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            o.items.some((i) => i.title?.toLowerCase().includes(q)) ||
            o.buyer.name?.toLowerCase().includes(q) ||
            o.buyer.full_name?.toLowerCase().includes(q) ||
            String(o.order_id).includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "date_asc":
            return new Date(a.date_created).getTime() - new Date(b.date_created).getTime();
          case "value_desc":
            return b.gross_amount - a.gross_amount;
          case "value_asc":
            return a.gross_amount - b.gross_amount;
          case "release_date":
            if (!a.release_date) return 1;
            if (!b.release_date) return -1;
            return new Date(a.release_date).getTime() - new Date(b.release_date).getTime();
          default:
            return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
        }
      });
  }, [enriched, status, search, sortBy]);

  const saveOverride = async (
    orderId: number,
    field: "packaging_cost" | "transport_cost" | "tax_cost",
    value: number
  ) => {
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id;
    if (!userId) {
      toast.error("Sessão expirada");
      return;
    }
    const current = overrides[orderId] || {};
    const next = {
      packaging_cost: current.packaging_cost || 0,
      transport_cost: current.transport_cost || 0,
      tax_cost: current.tax_cost || 0,
      [field]: value,
    };
    const { error } = await supabase
      .from("order_cost_overrides")
      .upsert(
        { user_id: userId, order_id: orderId, ...next },
        { onConflict: "user_id,order_id" }
      );
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }
    setOverrides((prev) => ({ ...prev, [orderId]: next }));
    toast.success("Custo atualizado");
  };

  const noMlConnection = error?.toLowerCase().includes("token") || error?.toLowerCase().includes("ml");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[color:var(--lime,#a3e635)]/30 bg-[color:var(--lime,#a3e635)]/10 p-2">
            <Wallet className="h-5 w-5 text-[color:var(--lime,#a3e635)]" />
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
                  ? "bg-[color:var(--lime,#a3e635)]/15 text-[color:var(--lime,#a3e635)] border border-[color:var(--lime,#a3e635)]/30"
                  : "bg-muted/10 text-muted-foreground hover:bg-muted/20 border border-transparent"
              }`}
            >
              {p.label}
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchOrders(period);
              setRefreshKey((k) => k + 1);
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            <span className="ml-2">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Saldo ML */}
      {!noMlConnection && (
        <div className="flex justify-end">
          <SaldoMLCard fetchBalance={fetchBalance} refreshKey={refreshKey} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5">
        {([
          { value: "vendas", label: "Vendas" },
          { value: "extrato", label: "Extrato ML" },
        ] as const).map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] border-b-2 transition-colors ${
              activeTab === t.value
                ? "border-[color:var(--lime,#a3e635)] text-[color:var(--lime,#a3e635)]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Errors / states */}
      {noMlConnection ? (
        <div className="jtd-glass p-6 flex flex-col md:flex-row items-start md:items-center gap-4 border border-amber-500/30 bg-amber-500/5">
          <Link2 className="h-6 w-6 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Mercado Livre não conectado</p>
            <p className="text-[13px] text-muted-foreground">
              Conecte seu Mercado Livre em Configurações para ver suas liberações.
            </p>
          </div>
          <Link to="/configuracoes">
            <Button size="sm">Ir para Configurações</Button>
          </Link>
        </div>
      ) : error ? (
        <div className="jtd-glass p-4 border border-red-500/30 bg-red-500/5 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchOrders(period)}>
            Tentar novamente
          </Button>
        </div>
      ) : null}

      {/* Summary */}
      {loading && !summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[130px]" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-[90px]" />
            ))}
          </div>
        </div>
      ) : summary ? (
        <FinanceiroSummaryCards summary={summary} />
      ) : null}

      {/* Aviso de produtos não vinculados */}
      {orders.length > 0 && (() => {
        const unlinkedCount = orders.filter((o) => !o.product_cost || o.product_cost === 0).length;
        if (!unlinkedCount) return null;
        return (
          <div className="jtd-glass p-3 border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>{unlinkedCount}</strong> venda(s) sem produto vinculado — custo e lucro não calculados.
              </span>
            </div>
            <Link to="/configuracoes">
              <Button size="sm" variant="outline" className="text-amber-400 border-amber-500/30">
                Vincular produtos
              </Button>
            </Link>
          </div>
        );
      })()}

      {/* Filters */}
      <FinanceiroFilters
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Order list */}
      <div className="space-y-2">
        {loading && orders.length === 0 ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)
        ) : filtered.length === 0 ? (
          <div className="jtd-glass p-10 text-center space-y-2">
            <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              Nenhuma venda encontrada {search || status !== "all" ? "com esses filtros" : "no período"}.
            </p>
            {(search || status !== "all") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatus("all");
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          filtered.map((o) => (
            <FinanceiroOrderCard
              key={o.order_id}
              order={o}
              onSaveOverride={saveOverride}
            />
          ))
        )}

        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <Button variant="outline" size="sm" onClick={loadMore}>
              Carregar mais
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
