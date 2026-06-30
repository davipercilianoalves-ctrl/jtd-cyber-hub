import { useMemo, useState } from "react";
import { ChevronRight, Copy, Package, User, Truck, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { EditableCostField } from "./EditableCostField";
import type { FinanceiroOrder } from "@/hooks/useFinanceiro";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const fmtBRL = (n: number) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    released: {
      label: "✅ Liberado",
      cls: "bg-green-500/15 text-green-400 border border-green-500/30",
    },
    pending: {
      label: "⏳ Pendente",
      cls: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    },
    in_mediation: {
      label: "⚠️ Em Mediação",
      cls: "bg-red-500/15 text-red-400 border border-red-500/30",
    },
    cancelled: {
      label: "❌ Cancelado",
      cls: "bg-muted/20 text-muted-foreground border border-border",
    },
  };
  const s = map[status] || { label: status, cls: "bg-muted/20 text-muted-foreground" };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
  );
}

function ShipmentBadge({ status }: { status: string | null }) {
  if (!status || status === "—") return <span className="text-muted-foreground">—</span>;
  const isDelivered = status === "Entregue" || status === "Entregue ao comprador";
  const isTransit =
    status.includes("trânsito") || status.includes("Coletado") || status.includes("entrega");
  const isCancelled = status.includes("Cancelado") || status.includes("Devolvido");
  const cls = isDelivered
    ? "bg-green-500/15 text-green-400 border border-green-500/30"
    : isTransit
    ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
    : isCancelled
    ? "bg-red-500/15 text-red-400 border border-red-500/30"
    : "bg-amber-500/15 text-amber-400 border border-amber-500/30";
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}


function CopyButton({ text, label }: { text: string | number; label: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(String(text));
        toast.success(`${label} copiado!`);
      }}
      className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground transition-colors"
    >
      <Copy className="h-3 w-3" /> Copiar
    </button>
  );
}

function CompositionBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0) || 1;
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/20">
      {segments.map((s, i) => {
        const pct = (Math.max(0, s.value) / total) * 100;
        if (pct <= 0) return null;
        return (
          <div
            key={i}
            className={s.color}
            style={{ width: `${pct}%` }}
            title={`${s.label}: ${pct.toFixed(1)}%`}
          />
        );
      })}
    </div>
  );
}

export function FinanceiroOrderCard({
  order,
  onSaveOverride,
}: {
  order: FinanceiroOrder;
  onSaveOverride: (
    orderId: number,
    field: "packaging_cost" | "transport_cost" | "tax_cost",
    value: number
  ) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const productCost = order.product_cost || 0;
  const packaging = order.packaging_cost || 0;
  const transport = order.transport_cost || 0;
  const tax = order.tax_cost || 0;
  const totalCosts = productCost + packaging + transport + tax;
  const netProfit = order.net_amount - totalCosts;
  const reinvest = netProfit * ((order.reinvestment_pct || 0) / 100);
  const finalProfit = netProfit - reinvest;

  const pct = (n: number) =>
    order.gross_amount > 0 ? ((n / order.gross_amount) * 100).toFixed(1) : "0.0";

  const fakeDiscount = (order.original_price || 0) - (order.sale_price || 0);
  const fakeDiscountPct =
    order.original_price > 0 ? (fakeDiscount / order.original_price) * 100 : 0;

  const segments = useMemo(
    () => [
      { label: "Custo", value: productCost, color: "bg-red-500/70" },
      { label: "Taxa ML", value: order.ml_fee, color: "bg-orange-500/70" },
      { label: "Frete", value: packaging + transport, color: "bg-amber-500/70" },
      { label: "Imposto", value: tax, color: "bg-pink-500/70" },
      { label: "Lucro", value: Math.max(0, finalProfit), color: "bg-green-500/70" },
    ],
    [productCost, order.ml_fee, packaging, transport, tax, finalProfit]
  );

  return (
    <div className="jtd-glass overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full grid grid-cols-[24px_1fr_auto] md:grid-cols-[24px_1.5fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-muted/5 transition-colors text-left"
      >
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
        />
        <div className="min-w-0 group">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground">#{order.order_id}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(String(order.order_id));
                toast.success("Número da venda copiado!");
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Copy className="h-3 w-3 text-muted-foreground" />
            </span>
          </div>
          <div className="text-sm font-medium truncate">{order.items[0]?.title || "—"}</div>
          <div className="text-[11px] text-muted-foreground">
            {format(new Date(order.date_created), "dd/MM/yyyy", { locale: ptBR })}
            {order.items.length > 1 && ` · +${order.items.length - 1} item(s)`}
          </div>
        </div>
        <div className="text-sm hidden md:block truncate">{order.buyer.name}</div>
        <div className="text-sm font-semibold tabular-nums font-mono text-right">
          {fmtBRL(order.gross_amount)}
        </div>
        <div
          className={`text-sm font-semibold tabular-nums font-mono text-right hidden md:block ${
            finalProfit >= 0 ? "text-[color:var(--lime,#a3e635)]" : "text-red-400"
          }`}
        >
          {fmtBRL(finalProfit)}
        </div>
        <div className="hidden md:block">
          <StatusBadge status={order.release_status} />
        </div>
      </button>

      {/* Expanded */}
      {open && (
        <div className="border-t border-white/5 p-5 space-y-5 bg-muted/5">
          {/* Produtos + Comprador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-2 flex items-center gap-2">
                <Package className="h-3 w-3" /> Produto(s)
              </h4>
              <div className="space-y-2">
                {order.items.map((item, i) => {
                  const kitItem = order.kit_items?.[i];
                  return (
                    <div key={i} className="text-sm border-l-2 border-sidebar-border/40 pl-3">
                      <div className="font-medium">
                        {item.title} × {item.quantity}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        MLB: {item.id}
                      </div>
                      {kitItem ? (
                        <div className="text-[11px] space-y-0.5 mt-1">
                          <div className="text-muted-foreground">
                            Custo unit.:{" "}
                            <span className="font-mono text-foreground">{fmtBRL(kitItem.cost)}</span>
                          </div>
                          <div className="text-muted-foreground">
                            Total ({item.quantity}×):{" "}
                            <span className="font-mono text-foreground font-semibold">
                              {fmtBRL(kitItem.total ?? kitItem.cost * item.quantity)}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground/60">
                            Fonte: {kitItem.source === "ad" ? "Anúncio vinculado" : "Produto vinculado"}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-amber-500 mt-1">
                          ⚠️ Produto não vinculado — custo não disponível
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-2 flex items-center gap-2">
                  <User className="h-3 w-3" /> Comprador
                </h4>
                <div className="text-sm">
                  <div className="font-medium">{order.buyer.full_name || order.buyer.name}</div>
                  {order.shipping_address && (
                    <div className="text-[11px] text-muted-foreground leading-[1.7]">
                      {order.shipping_address.street}, {order.shipping_address.number}
                      <br />
                      {order.shipping_address.city} - {order.shipping_address.state},{" "}
                      {order.shipping_address.zip}
                    </div>
                  )}
                </div>
              </div>

              {order.shipment_status && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-1 flex items-center gap-2">
                    <Truck className="h-3 w-3" /> Envio
                  </h4>
                  <div className="text-sm">
                    Status: <span className="font-medium">{order.shipment_status}</span>
                    {order.shipment_substatus && (
                      <span className="text-muted-foreground"> · {order.shipment_substatus}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preços */}
          {order.original_price > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-2">
                💰 Preços
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço cheio (vitrine):</span>
                  <span className="tabular-nums font-mono line-through text-muted-foreground">
                    {fmtBRL(order.original_price)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço real vendido:</span>
                  <span className="tabular-nums font-mono font-semibold">
                    {fmtBRL(order.sale_price)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    Desconto falso:
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-xs">
                            O desconto é estratégico para aparecer com "promoção" no ML.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </span>
                  <span className="tabular-nums font-mono text-amber-400">
                    {fmtBRL(fakeDiscount)} (-{fakeDiscountPct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Composição financeira */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-3">
              📊 Composição financeira
            </h4>
            <div className="space-y-1 text-sm">
              <Row label="(+) Valor bruto recebido" value={order.gross_amount} pct="100.0" />
              <Row
                label="(-) Taxa Marketplace (ML)"
                value={-order.ml_fee}
                pct={pct(order.ml_fee)}
                color="text-orange-400"
              />
              <Row
                label="(-) Custo do produto"
                value={-productCost}
                pct={pct(productCost)}
                color="text-red-400"
              />
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground pl-4">(-) Frete/Embalagem</span>
                <span className="inline-flex items-center gap-2 text-red-400">
                  <EditableCostField
                    value={packaging}
                    onSave={(v) => onSaveOverride(order.order_id, "packaging_cost", v)}
                  />
                  <span className="text-[11px] text-muted-foreground w-12 text-right">
                    {pct(packaging)}%
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground pl-4">(-) Transporte</span>
                <span className="inline-flex items-center gap-2 text-red-400">
                  <EditableCostField
                    value={transport}
                    onSave={(v) => onSaveOverride(order.order_id, "transport_cost", v)}
                  />
                  <span className="text-[11px] text-muted-foreground w-12 text-right">
                    {pct(transport)}%
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-muted-foreground pl-4">(-) Imposto</span>
                <span className="inline-flex items-center gap-2 text-red-400">
                  <EditableCostField
                    value={tax}
                    onSave={(v) => onSaveOverride(order.order_id, "tax_cost", v)}
                  />
                  <span className="text-[11px] text-muted-foreground w-12 text-right">
                    {pct(tax)}%
                  </span>
                </span>
              </div>
              <div className="border-t border-white/5 my-2" />
              <Row
                label="(=) Lucro líquido"
                value={netProfit}
                pct={pct(netProfit)}
                color={netProfit >= 0 ? "text-[color:var(--lime,#a3e635)]" : "text-red-400"}
                bold
              />
              {order.reinvestment_pct ? (
                <>
                  <Row
                    label={`(-) Reinvestimento (${order.reinvestment_pct}%)`}
                    value={-reinvest}
                    pct={pct(reinvest)}
                    color="text-muted-foreground"
                  />
                  <Row
                    label="(=) Lucro final"
                    value={finalProfit}
                    pct={pct(finalProfit)}
                    color={
                      finalProfit >= 0 ? "text-[color:var(--lime,#a3e635)]" : "text-red-400"
                    }
                    bold
                  />
                </>
              ) : null}
            </div>

            <div className="mt-3">
              <CompositionBar segments={segments} />
            </div>
          </div>

          {/* Banco */}
          <div className="rounded-lg border border-white/5 p-4 bg-background/40">
            <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--cyan,#22d3ee)] mb-3">
              🏦 Identificação bancária
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase">ID Pagamento</div>
                  <div className="font-mono">{order.payment_id || "—"}</div>
                </div>
                {order.payment_id && <CopyButton text={order.payment_id} label="ID" />}
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase">Valor na conta</div>
                  <div className="font-mono tabular-nums font-semibold">
                    {fmtBRL(order.net_amount)}
                  </div>
                </div>
                <CopyButton text={order.net_amount.toFixed(2)} label="Valor" />
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase">Liberação</div>
                <div className="font-mono">
                  {order.release_date
                    ? format(new Date(order.release_date), "dd/MM/yyyy", { locale: ptBR })
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase">Status</div>
                <StatusBadge status={order.release_status} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  pct,
  color,
  bold,
}: {
  label: string;
  value: number;
  pct: string;
  color?: string;
  bold?: boolean;
}) {
  return (
    <div className={`flex justify-between text-[12px] ${bold ? "font-bold" : ""}`}>
      <span className={color || "text-muted-foreground"}>{label}</span>
      <span className={`inline-flex items-center gap-2 ${color || ""}`}>
        <span className="tabular-nums font-mono">{fmtBRL(value)}</span>
        <span className="text-[11px] text-muted-foreground w-12 text-right">{pct}%</span>
      </span>
    </div>
  );
}
