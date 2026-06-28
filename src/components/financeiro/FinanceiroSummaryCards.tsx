import { Wallet, Clock, CalendarDays, TrendingUp, Receipt, PiggyBank, BarChart3 } from "lucide-react";
import type { FinanceiroSummary } from "@/hooks/useFinanceiro";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function BigCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  progress,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: any;
  accent: "green" | "amber" | "cyan";
  progress?: number;
}) {
  const accentMap = {
    green: {
      bg: "bg-green-500/10 border-green-500/30",
      text: "text-green-400",
      bar: "bg-green-500",
    },
    amber: {
      bg: "bg-amber-500/10 border-amber-500/30",
      text: "text-amber-400",
      bar: "bg-amber-500",
    },
    cyan: {
      bg: "bg-[color:var(--cyan,#22d3ee)]/10 border-[color:var(--cyan,#22d3ee)]/30",
      text: "text-[color:var(--cyan,#22d3ee)]",
      bar: "bg-[color:var(--cyan,#22d3ee)]",
    },
  }[accent];

  return (
    <div className={`jtd-glass p-5 space-y-3 border ${accentMap.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${accentMap.text}`} />
      </div>
      <p className={`text-[28px] font-extrabold tabular-nums tracking-tight ${accentMap.text}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {typeof progress === "number" && (
        <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
          <div
            className={`h-full ${accentMap.bar} transition-all`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function SmallCard({
  label,
  value,
  hint,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: any;
  accentClass?: string;
}) {
  return (
    <div className="jtd-glass p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <p className={`text-[20px] font-bold tabular-nums tracking-tight ${accentClass || ""}`}>
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function FinanceiroSummaryCards({ summary }: { summary: FinanceiroSummary }) {
  const total = summary.total_released + summary.total_pending;
  const releasedPct = total > 0 ? (summary.total_released / total) * 100 : 0;
  const margin =
    summary.total_net > 0 ? (summary.total_profit / summary.total_net) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigCard
          label="Já liberado"
          value={fmtBRL(summary.total_released)}
          hint={`${summary.released_count} vendas liberadas`}
          icon={Wallet}
          accent="green"
          progress={releasedPct}
        />
        <BigCard
          label="A liberar"
          value={fmtBRL(summary.total_pending)}
          hint={`${summary.pending_count} vendas pendentes`}
          icon={Clock}
          accent="amber"
        />
        <BigCard
          label="Próx. 7 dias"
          value={fmtBRL(summary.total_upcoming)}
          hint="Chegando em breve"
          icon={CalendarDays}
          accent="cyan"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmallCard
          label="Bruto"
          value={fmtBRL(summary.total_gross)}
          hint={`${summary.orders_count} vendas`}
          icon={BarChart3}
        />
        <SmallCard
          label="Líquido"
          value={fmtBRL(summary.total_net)}
          hint={`Taxa ML: ${fmtBRL(summary.total_ml_fees)}`}
          icon={Receipt}
        />
        <SmallCard
          label="Lucro"
          value={fmtBRL(summary.total_profit)}
          hint={`Margem: ${margin.toFixed(1)}%`}
          icon={TrendingUp}
          accentClass="text-[color:var(--lime,#a3e635)]"
        />
        <SmallCard
          label="Reinvest"
          value={fmtBRL(summary.total_reinvestment)}
          hint="Baseado em precificação"
          icon={PiggyBank}
        />
      </div>
    </div>
  );
}
