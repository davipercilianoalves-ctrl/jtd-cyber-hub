import { useEffect, useMemo, useState } from "react";
import { Copy, Inbox, Loader2, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface MovimentoML {
  id: string;
  date: string;
  type: string;
  description: string;
  amount: number;
  reference_id?: string | number | null;
  status: string;
  currency_id: string;
}

type FilterType = "all" | "in" | "out" | "release" | "withdrawal";

const TYPE_BADGES: Record<string, { label: string; cls: string }> = {
  payment: { label: "💳 Pagamento", cls: "bg-blue-500/15 text-blue-400" },
  release: { label: "✅ Liberação", cls: "bg-green-500/15 text-green-400" },
  withdrawal: { label: "🏦 Saque", cls: "bg-purple-500/15 text-purple-400" },
  fee: { label: "📊 Taxa", cls: "bg-orange-500/15 text-orange-400" },
  refund: { label: "↩️ Estorno", cls: "bg-red-500/15 text-red-400" },
};

function typeBadge(type: string) {
  const key = Object.keys(TYPE_BADGES).find((k) => type?.toLowerCase().includes(k));
  return key
    ? TYPE_BADGES[key]
    : { label: type || "—", cls: "bg-muted/20 text-muted-foreground" };
}

export function ExtratoML({
  dateFrom,
  dateTo,
  fetchMovements,
  refreshKey,
}: {
  dateFrom: string;
  dateTo: string;
  fetchMovements: (from: string, to: string) => Promise<any>;
  refreshKey?: number;
}) {
  const [movements, setMovements] = useState<MovimentoML[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMovements(dateFrom, dateTo)
      .then((data: any) => {
        if (cancelled) return;
        setMovements(data?.movements || []);
      })
      .catch((err: any) => {
        if (!cancelled) setError(err?.message || "Erro ao buscar extrato");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, fetchMovements, refreshKey]);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const t = (m.type || "").toLowerCase();
      if (filter === "in" && m.amount < 0) return false;
      if (filter === "out" && m.amount >= 0) return false;
      if (filter === "release" && !t.includes("release")) return false;
      if (filter === "withdrawal" && !t.includes("withdraw")) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          String(m.id).toLowerCase().includes(q) ||
          String(m.reference_id || "").toLowerCase().includes(q) ||
          (m.description || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [movements, filter, search]);

  const totals = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    movements.forEach((m) => {
      if (m.amount >= 0) inSum += m.amount;
      else outSum += Math.abs(m.amount);
    });
    return { inSum, outSum, net: inSum - outSum };
  }, [movements]);

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "in", label: "Entradas" },
    { value: "out", label: "Saídas" },
    { value: "release", label: "Liberações" },
    { value: "withdrawal", label: "Saques" },
  ];

  return (
    <div className="space-y-4">
      {/* Totais */}
      <div className="grid grid-cols-3 gap-3">
        <div className="jtd-glass p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1">
            <ArrowDownLeft className="h-3 w-3 text-green-400" /> Entradas
          </p>
          <p className="text-[18px] font-bold tabular-nums font-mono text-green-400">
            {fmtBRL(totals.inSum)}
          </p>
        </div>
        <div className="jtd-glass p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-red-400" /> Saídas
          </p>
          <p className="text-[18px] font-bold tabular-nums font-mono text-red-400">
            {fmtBRL(totals.outSum)}
          </p>
        </div>
        <div className="jtd-glass p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Saldo do período
          </p>
          <p
            className={`text-[18px] font-bold tabular-nums font-mono ${
              totals.net >= 0 ? "text-[color:var(--lime,#a3e635)]" : "text-red-400"
            }`}
          >
            {fmtBRL(totals.net)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="jtd-glass p-3 flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Buscar por ID ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 min-w-[200px]"
        />
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] transition-colors border ${
                filter === f.value
                  ? "bg-[color:var(--lime,#a3e635)]/15 text-[color:var(--lime,#a3e635)] border-[color:var(--lime,#a3e635)]/30"
                  : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/20"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="jtd-glass overflow-hidden">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-10" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-red-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4" /> {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Inbox className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum movimento encontrado.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/10 border-b border-white/5">
              <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground text-left">
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Descrição</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-right">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const badge = typeBadge(m.type);
                return (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-muted/5">
                    <td className="px-4 py-2 font-mono text-[12px] text-muted-foreground">
                      {m.date
                        ? format(new Date(m.date), "dd/MM/yy HH:mm", { locale: ptBR })
                        : "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2 truncate max-w-[300px]">{m.description}</td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums font-mono font-semibold ${
                        m.amount >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {m.amount >= 0 ? "+" : ""}
                      {fmtBRL(m.amount)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          const id = String(m.reference_id || m.id);
                          navigator.clipboard.writeText(id);
                          toast.success("ID copiado");
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                        {String(m.reference_id || m.id).slice(0, 12)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
