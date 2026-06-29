import { useEffect, useState } from "react";
import { Wallet, Loader2 } from "lucide-react";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Balance {
  available: number;
  unavailable: number;
  total: number;
  currency: string;
}

export function SaldoMLCard({
  fetchBalance,
  refreshKey,
}: {
  fetchBalance: () => Promise<any>;
  refreshKey?: number;
}) {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchBalance()
      .then((b) => {
        if (!cancelled) setBalance(b);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchBalance, refreshKey]);

  const v = (n?: number) => (error || n == null ? "—" : fmtBRL(n));

  return (
    <div className="jtd-glass p-4 border border-[color:var(--lime,#a3e635)]/30 bg-[color:var(--lime,#a3e635)]/5 min-w-[260px]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          💰 Saldo na conta ML
        </p>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {!loading && <Wallet className="h-3.5 w-3.5 text-[color:var(--lime,#a3e635)]" />}
      </div>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground text-[11px]">Disponível</span>
          <span className="tabular-nums font-mono font-semibold text-[color:var(--lime,#a3e635)]">
            {v(balance?.available)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground text-[11px]">A liberar</span>
          <span className="tabular-nums font-mono text-amber-400">
            {v(balance?.unavailable)}
          </span>
        </div>
        <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em]">Total</span>
          <span className="tabular-nums font-mono font-bold">{v(balance?.total)}</span>
        </div>
      </div>
    </div>
  );
}
