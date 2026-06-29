import { useMemo } from "react";
import { Copy, CheckCircle2, Clock, HelpCircle } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import type { FinanceiroOrder } from "@/hooks/useFinanceiro";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  if (diffDays === -1) return "Ontem";
  if (diffDays > 0) return `Em ${diffDays} dias`;
  return `Há ${Math.abs(diffDays)} dias`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    released: { label: "✅ Liberado", cls: "bg-green-500/15 text-green-400" },
    pending: { label: "⏳ Pendente", cls: "bg-amber-500/15 text-amber-400" },
    no_date: { label: "❓ Sem data", cls: "bg-muted/20 text-muted-foreground" },
  };
  const s = map[status] || { label: status, cls: "bg-muted/20 text-muted-foreground" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${s.cls}`}>
      {s.label}
    </span>
  );
}

function copyId(id: number) {
  navigator.clipboard.writeText(String(id));
  toast.success("Número da venda copiado!");
}

function LiberacaoRow({ order, statusOverride }: { order: FinanceiroOrder; statusOverride?: string }) {
  const relDate = relativeDate(order.release_date);
  const isUrgent =
    !!order.release_date &&
    new Date(order.release_date) <= addDays(new Date(), 2) &&
    new Date(order.release_date) >= new Date();

  return (
    <tr className="border-b border-white/5 hover:bg-muted/5 group">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">
            #{order.order_id}
          </span>
          <button onClick={() => copyId(order.order_id)} type="button">
            <Copy className="h-3 w-3 opacity-0 group-hover:opacity-60" />
          </button>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {format(new Date(order.date_created), "dd/MM/yy")}
        </div>
      </td>
      <td className="px-4 py-2.5 max-w-[220px]">
        <div className="text-sm font-medium truncate">
          {order.items[0]?.title || "—"}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {order.buyer.name}
        </div>
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="text-sm font-semibold tabular-nums font-mono">
          {fmtBRL(order.net_amount)}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right">
        <div className="font-mono text-[12px]">
          {order.release_date
            ? format(new Date(order.release_date), "dd/MM/yyyy")
            : "—"}
        </div>
        <div
          className={`text-[11px] ${
            isUrgent ? "text-amber-400 font-bold" : "text-muted-foreground"
          }`}
        >
          {relDate}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <StatusBadge status={statusOverride || order.release_status} />
      </td>
    </tr>
  );
}

function Section({
  icon: Icon,
  iconCls,
  title,
  orders,
  total,
  emptyText,
  statusOverride,
}: {
  icon: any;
  iconCls: string;
  title: string;
  orders: FinanceiroOrder[];
  total: number;
  emptyText: string;
  statusOverride?: string;
}) {
  return (
    <div className="jtd-glass overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${iconCls}`} />
          <span className="text-sm font-bold">{title}</span>
          <span className="text-[11px] text-muted-foreground">
            ({orders.length} {orders.length === 1 ? "venda" : "vendas"})
          </span>
        </div>
        <span className="text-sm font-bold tabular-nums font-mono">
          {fmtBRL(total)}
        </span>
      </div>
      {orders.length === 0 ? (
        <div className="px-4 py-6 text-center text-[12px] text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground border-b border-white/5">
                <th className="px-4 py-2 text-left font-bold">Venda</th>
                <th className="px-4 py-2 text-left font-bold">Produto</th>
                <th className="px-4 py-2 text-right font-bold">Líquido</th>
                <th className="px-4 py-2 text-right font-bold">Liberação</th>
                <th className="px-4 py-2 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <LiberacaoRow key={o.order_id} order={o} statusOverride={statusOverride} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function LiberacoesView({ orders }: { orders: FinanceiroOrder[] }) {
  const { released, pending, noDate, totals } = useMemo(() => {
    const released = orders
      .filter((o) => o.release_status === "released")
      .sort((a, b) => {
        if (!a.release_date) return 1;
        if (!b.release_date) return -1;
        return (
          new Date(b.release_date).getTime() - new Date(a.release_date).getTime()
        );
      });
    const pending = orders
      .filter((o) => o.release_status !== "released" && o.release_date)
      .sort(
        (a, b) =>
          new Date(a.release_date!).getTime() - new Date(b.release_date!).getTime()
      );
    const noDate = orders.filter(
      (o) => o.release_status !== "released" && !o.release_date
    );
    const sum = (arr: FinanceiroOrder[]) =>
      arr.reduce((s, o) => s + (o.net_amount || 0), 0);
    return {
      released,
      pending,
      noDate,
      totals: {
        released: sum(released),
        pending: sum(pending),
        noDate: sum(noDate),
      },
    };
  }, [orders]);

  return (
    <div className="space-y-4">
      <Section
        icon={CheckCircle2}
        iconCls="text-green-400"
        title="Já liberado"
        orders={released}
        total={totals.released}
        emptyText="Nenhuma venda liberada no período."
        statusOverride="released"
      />
      <Section
        icon={Clock}
        iconCls="text-amber-400"
        title="A liberar — próximas"
        orders={pending}
        total={totals.pending}
        emptyText="Nenhuma venda com liberação pendente."
        statusOverride="pending"
      />
      <Section
        icon={HelpCircle}
        iconCls="text-muted-foreground"
        title="Sem data de liberação"
        orders={noDate}
        total={totals.noDate}
        emptyText="Todas as vendas têm data de liberação."
        statusOverride="no_date"
      />
    </div>
  );
}
