import { useMemo, useState, useRef, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  AlertTriangle,
  DollarSign,
  Percent,
  Target,
  Tag,
  BarChart3,
  FileText,
  Layers,
  Sparkles,
  Calculator,
  HelpCircle,
  Users,
  Info,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  PricingState,
  PricingResult,
  CostItem,
  FeeItem,
  computePricing,
  applyScenario,
  defaultPricing,
  fmtBRL,
  fmtPct,
  uid,
} from "./engine";

interface Props {
  value: PricingState;
  onChange: (next: PricingState) => void;
  competitorPrices?: number[];
}

type TabKey = "summary" | "competitors" | "costs" | "feestax" | "promo" | "scenarios" | "report" | "guide";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "summary", label: "Resumo", icon: BarChart3 },
  { key: "competitors", label: "Concorrentes", icon: Users },
  { key: "costs", label: "Custos", icon: Layers },
  { key: "feestax", label: "Taxas & Impostos", icon: Percent },
  { key: "promo", label: "Promoção", icon: Sparkles },
  { key: "scenarios", label: "Simulações", icon: Calculator },
  { key: "report", label: "Relatório", icon: FileText },
  { key: "guide", label: "Guia", icon: HelpCircle },
];


// ===== Estilos compartilhados =====
const inputCls =
  "w-full h-9 rounded border border-sidebar-border bg-internal-20 px-2 text-sm focus:border-primary focus:outline-none";
const cellNumCls = `${inputCls} text-right font-mono`;
const btnGhost =
  "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors";
const chipBtn =
  "px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider border transition-all";

export default function PricingModule({ value, onChange, competitorPrices = [] }: Props) {
  const [tab, setTab] = useState<TabKey>("summary");
  const result = useMemo(() => computePricing(value), [value]);

  const competitorStats = useMemo(() => {
    const valid = competitorPrices.filter((p) => p > 0).sort((a, b) => a - b);
    if (!valid.length) return null;
    const min = valid[0];
    const max = valid[valid.length - 1];
    const avg = valid.reduce((s, p) => s + p, 0) / valid.length;
    const median = valid[Math.floor(valid.length / 2)];
    return { min, max, avg, median, count: valid.length, all: valid };
  }, [competitorPrices]);

  const patch = (p: Partial<PricingState>) => onChange({ ...value, ...p });

  // Posicionamento do preço ideal em relação aos concorrentes
  const positioning = useMemo(() => {
    if (!competitorStats || result.invalid) return null;
    const { min, max, avg } = competitorStats;
    const price = result.idealPrice;
    let label = "";
    let tone: "good" | "warn" | "bad" = "good";
    if (price < min) {
      label = "Abaixo de todos os concorrentes";
      tone = "warn";
    } else if (price > max) {
      label = "Acima de todos os concorrentes";
      tone = "bad";
    } else if (price < avg) {
      label = "Competitivo (abaixo da média)";
      tone = "good";
    } else {
      label = "Acima da média do mercado";
      tone = "warn";
    }
    const diffAvg = ((price - avg) / avg) * 100;
    return { label, tone, diffAvg };
  }, [competitorStats, result]);

  return (
    <section className="jtd-glass p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Calculator size={18} className="text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground leading-tight">Precificação Inteligente</h3>
            <p className="text-xs text-muted-foreground">
              Calcule preço ideal, mínimo, promocional e compare com concorrentes.
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Preço Ideal</div>
          <div className={`text-xl font-bold font-mono ${result.invalid ? "text-red-500" : "text-primary"}`}>
            {result.invalid ? "—" : fmtBRL(result.idealPrice)}
          </div>
        </div>
      </div>

      <Alerts result={result} state={value} competitorStats={competitorStats} positioning={positioning} />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-sidebar-border/40 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "summary" && (
        <SummaryTab result={result} competitorStats={competitorStats} positioning={positioning} />
      )}
      {tab === "competitors" && (
        <CompetitorsTab result={result} competitorStats={competitorStats} positioning={positioning} />
      )}
      {tab === "costs" && <CostsTab value={value} patch={patch} />}
      {tab === "feestax" && <FeesTaxesTab value={value} patch={patch} />}
      {tab === "promo" && <PromoTab value={value} patch={patch} result={result} competitorStats={competitorStats} />}
      {tab === "scenarios" && <ScenariosTab value={value} patch={patch} result={result} competitorStats={competitorStats} />}
      {tab === "report" && <ReportTab value={value} result={result} />}
      {tab === "guide" && <GuideTab />}
    </section>
  );
}

type CompetitorStats = { min: number; max: number; avg: number; median: number; count: number; all: number[] } | null;
type Positioning = { label: string; tone: "good" | "warn" | "bad"; diffAvg: number } | null;

// Tooltip de ajuda — sempre nasce acima do ícone, medindo a caixa real para não ficar distante
function Help({ text, title }: { text: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    arrowLeft: number;
    placement: "top" | "bottom";
  } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionTooltip = () => {
    const el = triggerRef.current;
    const tip = tooltipRef.current;
    if (!el || !tip) return;

    const r = el.getBoundingClientRect();
    const width = Math.min(260, window.innerWidth - 24);
    const height = tip.offsetHeight || 96;
    const gap = 9;
    const margin = 10;
    const centerX = r.left + r.width / 2;
    const canOpenTop = r.top >= height + gap + margin;
    const placement: "top" | "bottom" = canOpenTop ? "top" : "bottom";
    const rawLeft = centerX - width / 2;
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, rawLeft));
    const top = placement === "top" ? r.top - height - gap : r.bottom + gap;
    const arrowLeft = Math.max(16, Math.min(width - 16, centerX - left));

    setCoords({
      top: Math.max(margin, Math.min(window.innerHeight - height - margin, top)),
      left,
      width,
      arrowLeft,
      placement,
    });
  };

  useEffect(() => {
    if (!open) return;
    positionTooltip();
    window.addEventListener("scroll", positionTooltip, true);
    window.addEventListener("resize", positionTooltip);
    return () => {
      window.removeEventListener("scroll", positionTooltip, true);
      window.removeEventListener("resize", positionTooltip);
    };
  }, [open, text, title]);

  const show = () => {
    const el = triggerRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const width = Math.min(260, window.innerWidth - 24);
      setCoords({
        top: Math.max(10, r.top - 102),
        left: Math.max(
          10,
          Math.min(window.innerWidth - width - 10, r.left + r.width / 2 - width / 2),
        ),
        width,
        arrowLeft: width / 2,
        placement: "top",
      });
    }
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="button"
        aria-label={title || "Ajuda"}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary/80 shadow-[0_0_0_3px_hsl(var(--primary)/0.06)] transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/20 hover:text-primary hover:shadow-[0_0_0_4px_hsl(var(--primary)/0.10)] focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-help align-middle"
      >
        <Info size={11} />
      </span>
      {open && coords && (
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 99999,
          }}
          className="pointer-events-none animate-in fade-in zoom-in-95 slide-in-from-bottom-1 duration-150"
        >
          <div
            style={{
              top: coords.placement === "top" ? "calc(100% - 5px)" : -5,
              left: coords.arrowLeft,
              position: "absolute",
            }}
            className={`-ml-1.5 h-3 w-3 rotate-45 border-primary/35 bg-popover ${
              coords.placement === "top" ? "border-r border-b" : "border-l border-t"
            }`}
          />
          <div className="relative rounded-md border border-primary/35 bg-popover/95 px-3 py-2.5 text-[11px] leading-relaxed text-popover-foreground shadow-2xl shadow-primary/15 ring-1 ring-primary/10 backdrop-blur-md">
            {title && (
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                {title}
              </div>
            )}
            <div className="font-medium text-foreground/90">{text}</div>
          </div>
        </div>
      )}
    </>
  );
}


// Wrapper para labels de campos com ajuda
function FieldLabel({ children, help, helpTitle }: { children: React.ReactNode; help?: string; helpTitle?: string }) {
  return (
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
      <span>{children}</span>
      {help && <Help text={help} title={helpTitle} />}
    </label>
  );
}



// =============================================================
// ALERTAS
// =============================================================
function Alerts({
  result,
  state,
  competitorStats,
  positioning,
}: {
  result: PricingResult;
  state: PricingState;
  competitorStats: CompetitorStats;
  positioning: Positioning;
}) {
  const alerts: { type: "error" | "warn"; msg: string }[] = [];
  if (result.invalid) alerts.push({ type: "error", msg: "Soma de taxas, impostos e lucro ≥ 100%. Reduza algum percentual." });
  if (!result.invalid && result.netMarginPct < state.minMarginPct)
    alerts.push({ type: "warn", msg: `Margem líquida (${fmtPct(result.netMarginPct)}) abaixo do mínimo (${state.minMarginPct}%).` });
  if (!result.invalid && result.idealPrice < result.costFixedTotal)
    alerts.push({ type: "error", msg: "Preço calculado abaixo do custo total." });
  const taxPct = result.taxPctTotal * 100;
  if (taxPct > 30) alerts.push({ type: "warn", msg: `Carga tributária alta (${taxPct.toFixed(1)}%).` });
  const freight = state.costs.find((c) => c.active && c.name.toLowerCase().includes("frete"));
  if (freight && result.costFixedTotal > 0 && freight.value / result.costFixedTotal > 0.3)
    alerts.push({ type: "warn", msg: "Frete representa mais de 30% do custo total." });
  if (competitorStats && positioning && positioning.tone === "bad")
    alerts.push({ type: "warn", msg: `Preço ${fmtPct(positioning.diffAvg, 1)} acima da média dos concorrentes (${fmtBRL(competitorStats.avg)}).` });
  if (competitorStats && positioning && positioning.tone === "warn" && positioning.diffAvg < 0)
    alerts.push({ type: "warn", msg: `Preço abaixo do menor concorrente (${fmtBRL(competitorStats.min)}). Verifique se está deixando margem na mesa.` });


  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 p-3 rounded border text-xs ${
            a.type === "error"
              ? "border-red-500/40 bg-red-500/10 text-red-300"
              : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
          }`}
        >
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{a.msg}</span>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// RESUMO
// =============================================================
function SummaryTab({
  result,
  competitorStats,
  positioning,
}: {
  result: PricingResult;
  competitorStats: CompetitorStats;
  positioning: Positioning;
}) {
  const cards = [
    { label: "Custo Total", value: fmtBRL(result.costFixedTotal), accent: "neutral", help: "Soma de todos os custos fixos ativos (produto, frete, embalagem, etc.). É o piso absoluto: vender abaixo disso é prejuízo direto." },
    { label: "Preço Mínimo", value: fmtBRL(result.minPrice), accent: "neutral", help: "Preço de equilíbrio (break-even). Cobre custos + taxas + impostos, mas sem nenhum lucro. Nunca venda abaixo." },
    { label: "Preço Ideal", value: fmtBRL(result.idealPrice), accent: "primary", help: "Preço calculado para atingir seu objetivo de lucro definido na aba Promoção." },
    { label: "Lucro (R$)", value: fmtBRL(result.profitBRL), accent: result.profitBRL >= 0 ? "good" : "bad", help: "Quanto sobra em reais por unidade vendida no preço ideal, depois de pagar TUDO (custos, taxas e impostos)." },
    { label: "Lucro (%)", value: fmtPct(result.goalPct * 100), accent: "good", help: "Percentual do preço de venda que vira lucro líquido (sua meta configurada)." },
    { label: "Margem Líquida", value: fmtPct(result.netMarginPct), accent: "good", help: "Margem real obtida = Lucro ÷ Preço de venda. Se ficar abaixo da margem mínima configurada, dispara alerta." },
    { label: "Taxas Totais", value: fmtBRL(result.totalFeesBRL), accent: "neutral", help: "Quanto sai do preço para marketplaces, cartão, gateway e comissões." },
    { label: "Impostos Totais", value: fmtBRL(result.totalTaxesBRL), accent: "neutral", help: "Quanto sai do preço para impostos (ICMS, Simples, PIS, COFINS, ISS)." },
  ];



  const pieData = [
    { name: "Custo Produto", value: result.costFixedTotal, fill: "hsl(var(--muted-foreground))" },
    { name: "Taxas", value: result.totalFeesBRL, fill: "#60a5fa" },
    { name: "Impostos", value: result.totalTaxesBRL, fill: "#f87171" },
    { name: "Lucro", value: Math.max(0, result.profitBRL), fill: "hsl(var(--primary))" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded border p-3 ${
              c.accent === "primary"
                ? "border-primary/40 bg-primary/5"
                : c.accent === "good"
                ? "border-lime-500/30 bg-lime-500/5"
                : c.accent === "bad"
                ? "border-red-500/40 bg-red-500/10"
                : "border-sidebar-border bg-internal-w04"
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</div>
              <Help text={c.help} />
            </div>
            <div
              className={`mt-1 font-mono font-bold text-base ${
                c.accent === "primary"
                  ? "text-primary"
                  : c.accent === "good"
                  ? "text-lime-400"
                  : c.accent === "bad"
                  ? "text-red-400"
                  : "text-foreground"
              }`}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {competitorStats && positioning && (
        <div
          className={`rounded border p-4 ${
            positioning.tone === "good"
              ? "border-lime-500/40 bg-lime-500/5"
              : positioning.tone === "warn"
              ? "border-yellow-500/40 bg-yellow-500/10"
              : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <Users size={14} className="text-primary" /> Posicionamento vs Concorrentes
            </h4>
            <span
              className={`text-[11px] font-bold uppercase ${
                positioning.tone === "good"
                  ? "text-lime-400"
                  : positioning.tone === "warn"
                  ? "text-yellow-400"
                  : "text-red-400"
              }`}
            >
              {positioning.label}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <CompactStat label="Menor preço" value={fmtBRL(competitorStats.min)} tone="good" />
            <CompactStat label="Médio" value={fmtBRL(competitorStats.avg)} />
            <CompactStat label="Maior" value={fmtBRL(competitorStats.max)} tone="bad" />
            <CompactStat
              label="Seu preço vs média"
              value={`${positioning.diffAvg >= 0 ? "+" : ""}${positioning.diffAvg.toFixed(1)}%`}
              tone={positioning.tone === "good" ? "good" : positioning.tone === "warn" ? "warn" : "bad"}
            />
          </div>
        </div>
      )}



      {pieData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded border border-sidebar-border bg-internal-w04 p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Distribuição do Preço
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmtBRL(Number(v))}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 4 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded border border-sidebar-border bg-internal-w04 p-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Composição (R$)
            </h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis tick={{ fontSize: 10, fill: "#888" }} />
                <Tooltip
                  formatter={(v: any) => fmtBRL(Number(v))}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 4 }}
                />
                <Bar dataKey="value">
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// CUSTOS
// =============================================================
function CostsTab({ value, patch }: { value: PricingState; patch: (p: Partial<PricingState>) => void }) {
  const updateRow = (id: string, change: Partial<CostItem>) =>
    patch({ costs: value.costs.map((c) => (c.id === id ? { ...c, ...change } : c)) });
  const removeRow = (id: string) => patch({ costs: value.costs.filter((c) => c.id !== id) });
  const addRow = () =>
    patch({
      costs: [
        ...value.costs,
        { id: uid(), name: "", kind: "fixed", value: 0, active: true },
      ],
    });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Custos do produto. Padrão = valor fixo em R$. Use % para custos proporcionais ao preço (ex: marketing).
        </p>
        <button type="button" onClick={addRow} className={btnGhost}>
          <Plus size={14} /> Novo Custo
        </button>
      </div>
      <CostTable
        rows={value.costs}
        onChange={updateRow}
        onRemove={removeRow}
        allowKind
        emptyMsg="Nenhum custo cadastrado."
      />
    </div>
  );
}

// =============================================================
// TAXAS / IMPOSTOS
// =============================================================
function FeesTaxesTab({ value, patch }: { value: PricingState; patch: (p: Partial<PricingState>) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <PercentList
        title="Taxas e Comissões"
        items={value.fees}
        onChange={(items) => patch({ fees: items })}
        addLabel="Nova Taxa"
      />
      <PercentList
        title="Impostos"
        items={value.taxes}
        onChange={(items) => patch({ taxes: items })}
        addLabel="Novo Imposto"
      />
    </div>
  );
}

function PercentList({
  title,
  items,
  onChange,
  addLabel,
}: {
  title: string;
  items: FeeItem[];
  onChange: (items: FeeItem[]) => void;
  addLabel: string;
}) {
  const update = (id: string, change: Partial<FeeItem>) =>
    onChange(items.map((i) => (i.id === id ? { ...i, ...change } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const add = () => onChange([...items, { id: uid(), name: "", value: 0, active: true }]);

  const total = items.filter((i) => i.active).reduce((s, i) => s + (Number(i.value) || 0), 0);

  return (
    <div className="rounded border border-sidebar-border bg-internal-w04 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground inline-flex items-center gap-2">
          {title}
          <Help
            title={title}
            text={
              title.toLowerCase().includes("imposto")
                ? "Tributos sobre venda (ICMS, Simples, PIS, COFINS, ISS). Percentual aplicado sobre o preço final. Quanto maior, maior o preço ideal precisa ser."
                : "Comissões cobradas no preço final (marketplace, cartão, gateway). Aumentam o preço ideal proporcionalmente."
            }
          />
        </h4>
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase text-muted-foreground">
            Total: <span className="text-primary font-bold">{fmtPct(total)}</span>
          </span>
          <button type="button" onClick={add} className={btnGhost}>
            <Plus size={12} /> {addLabel}
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {items.map((i) => {
          const isTax = title.toLowerCase().includes("imposto");
          const info = describeItem(i.name, isTax ? "tax" : "fee");
          return (
            <div key={i.id} className="grid grid-cols-[20px_1fr_90px_44px_28px] gap-2 items-center">
              <div className="flex justify-center">
                <Help title={info.title} text={info.text} />
              </div>
              <input
                value={i.name}
                onChange={(e) => update(i.id, { name: e.target.value })}
                placeholder="Nome"
                className={inputCls}
              />
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={i.value || ""}
                  onChange={(e) => update(i.id, { value: parseFloat(e.target.value) || 0 })}
                  className={`${cellNumCls} pr-6`}
                />
                <Percent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="flex justify-center">
                <ToggleActive value={i.active} onChange={(v) => update(i.id, { active: v })} />
              </div>
              <button
                type="button"
                onClick={() => remove(i.id)}
                className="text-muted-foreground hover:text-red-500 flex justify-center"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!items.length && <p className="text-xs text-muted-foreground py-2 text-center">Nenhum item.</p>}
      </div>

    </div>
  );
}

// =============================================================
// CUSTOS — tabela com escolha de tipo (fixo / %)
// =============================================================
function CostTable({
  rows,
  onChange,
  onRemove,
  allowKind,
  emptyMsg,
}: {
  rows: CostItem[];
  onChange: (id: string, change: Partial<CostItem>) => void;
  onRemove: (id: string) => void;
  allowKind: boolean;
  emptyMsg: string;
}) {
  return (
    <div className="rounded border border-sidebar-border bg-internal-w04">

      <div className="grid grid-cols-[20px_1.5fr_140px_140px_60px_40px] gap-2 px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground border-b border-sidebar-border/40 bg-internal-20">
        <div></div>
        <div className="inline-flex items-center gap-1.5">Nome <Help title="Nome do custo" text="Identificação do item. Ex: 'Custo do produto', 'Frete fornecedor', 'Embalagem', 'Marketing'." /></div>
        <div className="text-center inline-flex items-center gap-1.5 justify-center">Tipo <Help title="Tipo de custo" text="R$ = valor fixo (não muda com o preço). % = proporcional ao preço de venda (ex: marketing, royalties)." /></div>
        <div className="text-right inline-flex items-center gap-1.5 justify-end">Valor <Help title="Valor do custo" text="Quanto este item custa por unidade vendida — em reais ou percentual conforme o tipo escolhido." /></div>
        <div className="text-center inline-flex items-center gap-1.5 justify-center">Ativo <Help title="Considerar no cálculo" text="Desative para simular sem este custo, sem perder o valor cadastrado." /></div>
        <div></div>
      </div>
      <div className="divide-y divide-sidebar-border/30">
        {rows.map((r) => {
          const info = describeItem(r.name, "cost");
          return (
            <div
              key={r.id}
              className="grid grid-cols-[20px_1.5fr_140px_140px_60px_40px] gap-2 px-3 py-2 items-center"
            >
              <div className="flex justify-center">
                <Help title={info.title} text={info.text} />
              </div>
              <input
                value={r.name}
                onChange={(e) => onChange(r.id, { name: e.target.value })}
                placeholder="Nome do custo"
                className={inputCls}
                disabled={r.builtin}
              />
              {allowKind ? (
                <div className="flex gap-1 justify-center">
                  <button
                    type="button"
                    onClick={() => onChange(r.id, { kind: "fixed" })}
                    className={`${chipBtn} ${
                      r.kind === "fixed"
                        ? "bg-primary text-black border-primary"
                        : "border-sidebar-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    R$
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(r.id, { kind: "percent" })}
                    className={`${chipBtn} ${
                      r.kind === "percent"
                        ? "bg-primary text-black border-primary"
                        : "border-sidebar-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    %
                  </button>
                </div>
              ) : (
                <div className="text-center text-xs text-muted-foreground">%</div>
              )}
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={r.value || ""}
                  onChange={(e) => onChange(r.id, { value: parseFloat(e.target.value) || 0 })}
                  className={`${cellNumCls} ${r.kind === "fixed" ? "pl-7" : "pr-6"}`}
                />
                {r.kind === "fixed" ? (
                  <DollarSign size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                ) : (
                  <Percent size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              <div className="flex justify-center">
                <ToggleActive value={r.active} onChange={(v) => onChange(r.id, { active: v })} />
              </div>
              <button
                type="button"
                onClick={() => !r.builtin && onRemove(r.id)}
                disabled={r.builtin}
                className={`flex justify-center ${
                  r.builtin
                    ? "text-muted-foreground/20 cursor-not-allowed"
                    : "text-muted-foreground hover:text-red-500"
                }`}
                title={r.builtin ? "Custo padrão" : "Remover"}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {!rows.length && <p className="text-xs text-muted-foreground py-4 text-center">{emptyMsg}</p>}
      </div>

    </div>
  );
}

function ToggleActive({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      title={value ? "Ativo — clique para desativar" : "Inativo — clique para ativar"}
      className={`group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        value
          ? "bg-primary/90 border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3),inset_0_1px_0_rgba(255,255,255,0.2)]"
          : "bg-internal-20 border-sidebar-border hover:border-muted-foreground"
      }`}
    >
      <span
        className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow-md transition-all duration-200 ${
          value ? "left-[calc(100%-1.125rem)]" : "left-[2px]"
        }`}
      />
    </button>
  );
}

// Texto de ajuda contextual para itens de custo/taxa/imposto pelo nome
function describeItem(name: string, kind: "cost" | "fee" | "tax"): { title: string; text: string } {
  const n = (name || "").toLowerCase().trim();
  const dict: Record<string, { title: string; text: string }> = {
    "custo do produto": { title: "Custo do Produto", text: "Quanto você paga ao fornecedor por unidade. Base de toda a precificação." },
    "frete": { title: "Frete", text: "Custo logístico por unidade (fornecedor até você ou você até o cliente, se grátis para o comprador)." },
    "embalagem": { title: "Embalagem", text: "Caixa, plástico-bolha, fita, etiqueta — tudo que protege o produto no envio." },
    "armazenagem": { title: "Armazenagem", text: "Aluguel/galpão/fulfillment rateado por unidade vendida." },
    "operacional": { title: "Operacional", text: "Pró-labore, conta de luz, internet, sistema — custos fixos do negócio rateados." },
    "marketing": { title: "Marketing", text: "Anúncios e tráfego pago. Costuma ser um % do preço, varia conforme campanha." },
    "marketplace": { title: "Comissão Marketplace", text: "Percentual cobrado por Mercado Livre, Shopee, Amazon etc. Varia por categoria." },
    "cartão": { title: "Taxa do Cartão", text: "Taxa da maquininha/gateway por venda no cartão. Geralmente 2-5%." },
    "gateway": { title: "Gateway de Pagamento", text: "Taxa do processador (Stripe, Pagar.me, Asaas, etc.) por transação." },
    "simples": { title: "Simples Nacional", text: "Alíquota do Simples sobre o faturamento. Confira sua faixa atual no DAS." },
    "icms": { title: "ICMS", text: "Imposto estadual sobre circulação de mercadorias. Varia por estado/produto." },
    "iss": { title: "ISS", text: "Imposto municipal sobre serviços. 2 a 5% normalmente." },
    "pis": { title: "PIS", text: "Contribuição federal. 0,65% no lucro presumido, 1,65% no lucro real." },
    "cofins": { title: "COFINS", text: "Contribuição federal. 3% no lucro presumido, 7,6% no lucro real." },
  };
  for (const key of Object.keys(dict)) {
    if (n.includes(key)) return dict[key];
  }
  const fallback = {
    cost: { title: name || "Custo personalizado", text: "Custo adicional por unidade. Use R$ para valor fixo ou % para custos proporcionais ao preço." },
    fee: { title: name || "Taxa personalizada", text: "Comissão ou taxa percentual cobrada sobre o preço de venda." },
    tax: { title: name || "Imposto personalizado", text: "Tributo percentual incidente sobre a venda." },
  };
  return fallback[kind];
}


// =============================================================
// PROMOÇÃO
// =============================================================
function PromoTab({
  value,
  patch,
  result,
  competitorStats,
}: {
  value: PricingState;
  patch: (p: Partial<PricingState>) => void;
  result: PricingResult;
  competitorStats: CompetitorStats;
}) {
  // Sugestões de preço de vitrine baseadas nos concorrentes
  const suggestShowcase = (target: number) => {
    if (result.idealPrice <= 0) return;
    const pct = ((target - result.idealPrice) / result.idealPrice) * 100;
    patch({ promo: { strategicMarkupPct: Math.max(0, +pct.toFixed(2)) } });
  };

  return (
    <div className="space-y-6">
      {/* Sugestões com base nos concorrentes */}
      {competitorStats && (
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                <Users size={15} className="text-primary" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Sugestões de Vitrine</h4>
                <p className="text-[11px] text-muted-foreground">Baseadas nos preços dos seus concorrentes</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/90 leading-relaxed">
              Clique para usar como <strong className="text-foreground">Preço Vitrine</strong> — o desconto exibido é recalculado para voltar ao seu preço ideal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" onClick={() => suggestShowcase(competitorStats.max)} className="group px-3 py-1.5 rounded-lg border border-primary/40 bg-background/40 hover:bg-primary/15 hover:border-primary transition-all text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-primary">= Maior</span>
                <span className="font-mono text-primary">{fmtBRL(competitorStats.max)}</span>
              </button>
              <button type="button" onClick={() => suggestShowcase(competitorStats.avg)} className="group px-3 py-1.5 rounded-lg border border-primary/40 bg-background/40 hover:bg-primary/15 hover:border-primary transition-all text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-primary">= Médio</span>
                <span className="font-mono text-primary">{fmtBRL(competitorStats.avg)}</span>
              </button>
              <button type="button" onClick={() => suggestShowcase(competitorStats.max * 1.05)} className="group px-3 py-1.5 rounded-lg border border-primary/40 bg-background/40 hover:bg-primary/15 hover:border-primary transition-all text-xs font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground group-hover:text-primary">+5% acima</span>
                <span className="font-mono text-primary">{fmtBRL(competitorStats.max * 1.05)}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Objetivo de Lucro */}
      <div className="rounded-xl border border-sidebar-border bg-gradient-to-b from-internal-w04 to-internal-w04/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Target size={15} className="text-primary" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Objetivo de Lucro</h4>
        </div>
        <div className="grid md:grid-cols-3 gap-2">
          {(
            [
              { mode: "marginPct", label: "Margem (%)" },
              { mode: "profitPct", label: "Lucro (%)" },
              { mode: "profitBRL", label: "Lucro (R$)" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.mode}
              type="button"
              onClick={() => patch({ goal: { ...value.goal, mode: opt.mode } })}
              className={`relative p-2.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all overflow-hidden ${
                value.goal.mode === opt.mode
                  ? "border-primary bg-primary/15 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.3)]"
                  : "border-sidebar-border bg-background/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <FieldLabel
              helpTitle={`Valor desejado ${value.goal.mode === "profitBRL" ? "(R$)" : "(%)"}`}
              help={
                value.goal.mode === "marginPct"
                  ? "Margem líquida alvo. Quanto do preço vira lucro depois de pagar tudo. Ex: 30% → para cada R$100 vendidos, R$30 sobram."
                  : value.goal.mode === "profitPct"
                  ? "Percentual de lucro desejado sobre o preço. Empurra o preço ideal pra cima quando você aumenta."
                  : "Lucro absoluto em reais por unidade vendida. Útil quando você sabe quanto quer ganhar fixo por venda."
              }
            >
              Valor desejado {value.goal.mode === "profitBRL" ? "(R$)" : "(%)"}
            </FieldLabel>
            <input
              type="number"
              step="0.01"
              value={value.goal.value || ""}
              onChange={(e) => patch({ goal: { ...value.goal, value: parseFloat(e.target.value) || 0 } })}
              className={`${cellNumCls} mt-1`}
            />
          </div>
          <div>
            <FieldLabel
              helpTitle="Margem mínima de alerta"
              help="Se a margem líquida calculada ficar abaixo deste valor, o sistema mostra um alerta amarelo. Não bloqueia a venda — apenas avisa."
            >
              Margem mínima de alerta (%)
            </FieldLabel>
            <input
              type="number"
              step="0.1"
              value={value.minMarginPct || ""}
              onChange={(e) => patch({ minMarginPct: parseFloat(e.target.value) || 0 })}
              className={`${cellNumCls} mt-1`}
            />
          </div>
        </div>
      </div>

      {/* Estratégia Promocional */}
      <div className="rounded-xl border border-sidebar-border bg-gradient-to-b from-internal-w04 to-internal-w04/40 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles size={15} className="text-primary" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Estratégia Promocional</h4>
            <p className="text-[11px] text-muted-foreground">
              Preço final volta ao real. Desconto exibido nunca é igual ao aumento.
            </p>
          </div>
        </div>

        {/* Fluxo visual */}
        <div className="hidden md:flex items-center justify-between gap-2 px-2 py-3 rounded-lg bg-background/40 border border-sidebar-border/50">
          <FlowStep label="Real" value={fmtBRL(result.idealPrice)} tone="primary" />
          <FlowArrow />
          <FlowStep label="× Aumento" value={`+${value.promo.strategicMarkupPct || 0}%`} tone="muted" />
          <FlowArrow />
          <FlowStep label="Vitrine" value={fmtBRL(result.showcasePrice)} tone="default" />
          <FlowArrow />
          <FlowStep label="− Desconto" value={fmtPct(result.promoDiscountPct)} tone="good" />
          <FlowArrow />
          <FlowStep label="Final" value={fmtBRL(result.promoFinalPrice)} tone="primary" />
        </div>

        <div className="grid md:grid-cols-5 gap-3">
          <PromoField label="Preço Real" value={fmtBRL(result.idealPrice)} readOnly tone="primary" help="Seu preço ideal calculado. É o que você efetivamente recebe — a vitrine só infla para criar percepção de desconto." />
          <div>
            <FieldLabel
              helpTitle="Aumento Estratégico"
              help="Quanto inflar o preço para criar o 'Preço Vitrine'. Exemplo: 25% gera um desconto exibido de ~20%. O preço final volta ao ideal."
            >
              Aumento Estratégico (%)
            </FieldLabel>
            <input
              type="number"
              step="0.1"
              value={value.promo.strategicMarkupPct || ""}
              onChange={(e) =>
                patch({ promo: { strategicMarkupPct: parseFloat(e.target.value) || 0 } })
              }
              className={`${cellNumCls} mt-1`}
            />
          </div>
          <PromoField label="Preço Vitrine" value={fmtBRL(result.showcasePrice)} readOnly help="Preço inflado mostrado riscado para o cliente. = Preço Real × (1 + Aumento Estratégico)." />
          <PromoField label="Desconto Exibido" value={fmtPct(result.promoDiscountPct)} readOnly tone="good" help="Desconto percentual exibido na vitrine. Calculado para que (Vitrine − Desconto) volte exatamente ao Preço Real." />
          <PromoField label="Preço Final" value={fmtBRL(result.promoFinalPrice)} readOnly tone="primary" help="O que o cliente paga e o que você recebe. Igual ao Preço Real — a estratégia é só percepção." />
        </div>
      </div>
    </div>
  );
}

function FlowStep({ label, value, tone }: { label: string; value: string; tone: "primary" | "good" | "muted" | "default" }) {
  const color =
    tone === "primary" ? "text-primary"
    : tone === "good" ? "text-lime-400"
    : tone === "muted" ? "text-muted-foreground"
    : "text-foreground";
  return (
    <div className="flex flex-col items-center min-w-0 flex-1">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`font-mono font-bold text-xs ${color} truncate`}>{value}</div>
    </div>
  );
}

function FlowArrow() {
  return <ChevronRight size={14} className="text-muted-foreground/50 shrink-0" />;
}


function PromoField({
  label,
  value,
  readOnly,
  tone,
  help,
}: {
  label: string;
  value: string;
  readOnly?: boolean;
  tone?: "primary" | "good";
  help?: string;
}) {
  return (
    <div>
      <FieldLabel help={help} helpTitle={label}>{label}</FieldLabel>
      <div
        className={`mt-1 h-9 px-2 rounded border bg-internal-20 flex items-center justify-end font-mono text-sm ${
          tone === "primary"
            ? "border-primary/50 text-primary"
            : tone === "good"
            ? "border-lime-500/40 text-lime-400"
            : "border-sidebar-border text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}


// =============================================================
// CENÁRIOS
// =============================================================
function ScenariosTab({
  value,
  patch,
  result,
  competitorStats,
}: {
  value: PricingState;
  patch: (p: Partial<PricingState>) => void;
  result: PricingResult;
  competitorStats: CompetitorStats;
}) {
  const updateScenario = (idx: number, change: Partial<PricingState>) => {
    const next = [...value.scenarios];
    next[idx] = { ...next[idx], overrides: { ...next[idx].overrides, ...change } };
    patch({ scenarios: next });
  };

  // Simula vender a um preço fixo P, mantendo custos/taxas/impostos atuais.
  const simulateAtPrice = (price: number) => {
    const costFixed = result.costFixedTotal;
    const variableCost = price * (result.costPctTotal + result.feePctTotal + result.taxPctTotal);
    const profit = price - costFixed - variableCost;
    const margin = price > 0 ? (profit / price) * 100 : 0;
    const fees = price * result.feePctTotal;
    const taxes = price * result.taxPctTotal;
    const belowMin = price < result.minPrice;
    return { price, profit, margin, fees, taxes, belowMin };
  };

  const competitorScenarios = competitorStats
    ? [
        {
          key: "min",
          title: "Preço Mínimo",
          subtitle: "Menor preço do mercado",
          description: "O mínimo que dá pra cobrar antes de ficar abaixo dos concorrentes.",
          tone: "good" as const,
          icon: TrendingDown,
          sim: simulateAtPrice(competitorStats.min),
        },
        {
          key: "avg",
          title: "Preço Médio",
          subtitle: "Média dos concorrentes",
          description: "Posicionamento equilibrado, alinhado ao mercado.",
          tone: "primary" as const,
          icon: BarChart3,
          sim: simulateAtPrice(competitorStats.avg),
        },
        {
          key: "max",
          title: "Preço Máximo",
          subtitle: "Maior preço do mercado",
          description: "Teto que o mercado aceita. Acima disso, risco de não vender.",
          tone: "warn" as const,
          icon: TrendingUp,
          sim: simulateAtPrice(competitorStats.max),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Cenários de mercado — baseados em concorrentes */}
      {competitorStats ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Users size={15} className="text-primary" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Cenários de Mercado</h4>
              <p className="text-[11px] text-muted-foreground">Simulação de lucro vendendo aos preços dos concorrentes ({competitorStats.count} cadastrados)</p>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            {competitorScenarios.map((sc) => (
              <MarketScenarioCard key={sc.key} title={sc.title} subtitle={sc.subtitle} description={sc.description} tone={sc.tone} icon={sc.icon} sim={sc.sim} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-sidebar-border p-6 text-center space-y-2">
          <Users size={28} className="mx-auto text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            Cadastre concorrentes em <strong className="text-foreground">Análise de Concorrentes</strong> para ver simulações automáticas de preço mínimo, médio e máximo do mercado.
          </p>
        </div>
      )}

      {/* Cenários personalizados */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Calculator size={15} className="text-primary" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground">Cenários Personalizados</h4>
            <p className="text-[11px] text-muted-foreground">Compare 3 cenários alterando taxas, impostos ou lucro. Custos fixos herdados.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {value.scenarios.map((s, idx) => {
            const merged = applyScenario(value, s.overrides);
            const res = computePricing(merged);
            const feeOverride =
              s.overrides.fees?.reduce((sum, f) => (f.active ? sum + f.value : sum), 0) ??
              value.fees.filter((f) => f.active).reduce((sum, f) => sum + f.value, 0);
            const taxOverride =
              s.overrides.taxes?.reduce((sum, t) => (t.active ? sum + t.value : sum), 0) ??
              value.taxes.filter((t) => t.active).reduce((sum, t) => sum + t.value, 0);
            const goalOverride = s.overrides.goal?.value ?? value.goal.value;

            return (
              <div key={s.id} className="rounded-xl border border-sidebar-border bg-gradient-to-b from-internal-w04 to-internal-w04/40 p-4 space-y-3 hover:border-primary/40 transition-colors">
                <input
                  value={s.name}
                  onChange={(e) => {
                    const next = [...value.scenarios];
                    next[idx] = { ...next[idx], name: e.target.value };
                    patch({ scenarios: next });
                  }}
                  className={`${inputCls} font-bold`}
                />
                <ScenarioRow
                  label="Σ Taxas (%)"
                  value={feeOverride}
                  onChange={(v) =>
                    updateScenario(idx, {
                      fees: value.fees.map((f, i) =>
                        i === 0 ? { ...f, value: v } : { ...f, value: 0 }
                      ),
                    })
                  }
                />
                <ScenarioRow
                  label="Σ Impostos (%)"
                  value={taxOverride}
                  onChange={(v) =>
                    updateScenario(idx, {
                      taxes: value.taxes.map((t, i) =>
                        i === 0 ? { ...t, value: v } : { ...t, value: 0 }
                      ),
                    })
                  }
                />
                <ScenarioRow
                  label={value.goal.mode === "profitBRL" ? "Lucro (R$)" : "Lucro (%)"}
                  value={goalOverride}
                  onChange={(v) =>
                    updateScenario(idx, { goal: { ...value.goal, value: v } })
                  }
                />
                <div className="pt-3 border-t border-sidebar-border/30 space-y-1 text-xs">
                  <RowKV k="Preço" v={fmtBRL(res.idealPrice)} accent="primary" />
                  <RowKV k="Lucro" v={fmtBRL(res.profitBRL)} accent={res.profitBRL >= 0 ? "good" : "bad"} />
                  <RowKV k="Margem" v={fmtPct(res.netMarginPct)} accent="good" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MarketScenarioCard({
  title,
  subtitle,
  description,
  tone,
  icon: Icon,
  sim,
}: {
  title: string;
  subtitle: string;
  description: string;
  tone: "good" | "primary" | "warn";
  icon: React.ComponentType<{ size?: number; className?: string }>;
  sim: { price: number; profit: number; margin: number; fees: number; taxes: number; belowMin: boolean };
}) {
  const styles = {
    good: { border: "border-lime-500/40", glow: "from-lime-500/10", chip: "bg-lime-500/15 border-lime-500/40 text-lime-400", accent: "text-lime-400" },
    primary: { border: "border-primary/40", glow: "from-primary/10", chip: "bg-primary/15 border-primary/40 text-primary", accent: "text-primary" },
    warn: { border: "border-yellow-500/40", glow: "from-yellow-500/10", chip: "bg-yellow-500/15 border-yellow-500/40 text-yellow-400", accent: "text-yellow-400" },
  }[tone];

  const profitable = sim.profit > 0 && !sim.belowMin;

  return (
    <div className={`relative overflow-hidden rounded-xl border ${styles.border} bg-gradient-to-b ${styles.glow} to-transparent p-4 space-y-3 hover:scale-[1.01] transition-transform`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center ${styles.chip}`}>
              <Icon size={13} className={styles.accent} />
            </div>
            <h5 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h5>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">{subtitle}</p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground/80 italic leading-snug">{description}</p>

      <div className="rounded-lg bg-background/40 border border-sidebar-border/50 p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Preço de venda</div>
        <div className={`font-mono font-bold text-2xl ${styles.accent}`}>{fmtBRL(sim.price)}</div>
      </div>

      <div className="space-y-1 text-xs">
        <RowKV k="Taxas" v={fmtBRL(sim.fees)} />
        <RowKV k="Impostos" v={fmtBRL(sim.taxes)} />
        <div className="border-t border-sidebar-border/30 my-1.5" />
        <RowKV k="Lucro / un." v={fmtBRL(sim.profit)} accent={profitable ? "good" : "bad"} />
        <RowKV k="Margem" v={fmtPct(sim.margin)} accent={profitable ? "good" : "bad"} />
      </div>

      {sim.belowMin && (
        <div className="flex items-start gap-1.5 rounded-md bg-red-500/10 border border-red-500/30 px-2 py-1.5 text-[10px] text-red-400">
          <AlertTriangle size={11} className="shrink-0 mt-0.5" />
          <span>Abaixo do seu preço mínimo. Vender aqui dá prejuízo.</span>
        </div>
      )}
    </div>
  );
}

function ScenarioRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        type="number"
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className={`${cellNumCls} w-24`}
      />
    </div>
  );
}

function RowKV({ k, v, accent }: { k: string; v: string; accent?: "primary" | "good" | "bad" }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span
        className={`font-mono font-bold ${
          accent === "primary"
            ? "text-primary"
            : accent === "good"
            ? "text-lime-400"
            : accent === "bad"
            ? "text-red-400"
            : "text-foreground"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

// =============================================================
// RELATÓRIO
// =============================================================
function ReportTab({ value, result }: { value: PricingState; result: PricingResult }) {
  const rows: { k: string; v: string; bold?: boolean; tone?: "primary" | "good" }[] = [];
  value.costs
    .filter((c) => c.active && c.kind === "fixed")
    .forEach((c) => rows.push({ k: c.name || "Custo", v: fmtBRL(c.value) }));
  rows.push({ k: "Subtotal Custos", v: fmtBRL(result.costFixedTotal), bold: true });
  value.fees
    .filter((f) => f.active && f.value > 0)
    .forEach((f) => rows.push({ k: f.name || "Taxa", v: fmtPct(f.value) }));
  rows.push({ k: "Total Taxas", v: fmtPct(result.feePctTotal * 100), bold: true });
  value.taxes
    .filter((t) => t.active && t.value > 0)
    .forEach((t) => rows.push({ k: t.name || "Imposto", v: fmtPct(t.value) }));
  rows.push({ k: "Total Impostos", v: fmtPct(result.taxPctTotal * 100), bold: true });
  rows.push({
    k: `Lucro (${value.goal.mode === "marginPct" ? "Margem" : value.goal.mode === "profitPct" ? "%" : "R$"})`,
    v: value.goal.mode === "profitBRL" ? fmtBRL(value.goal.value) : fmtPct(value.goal.value),
  });
  rows.push({ k: "Preço Calculado", v: fmtBRL(result.idealPrice), bold: true, tone: "primary" });
  rows.push({ k: "Aumento Estratégico", v: fmtPct(value.promo.strategicMarkupPct) });
  rows.push({ k: "Preço Vitrine", v: fmtBRL(result.showcasePrice) });
  rows.push({ k: "Desconto Necessário", v: fmtPct(result.promoDiscountPct) });
  rows.push({ k: "Preço Final", v: fmtBRL(result.promoFinalPrice), bold: true, tone: "primary" });
  rows.push({ k: "Lucro Líquido", v: fmtBRL(result.profitBRL), bold: true, tone: "good" });
  rows.push({ k: "Margem Líquida", v: fmtPct(result.netMarginPct), bold: true, tone: "good" });

  return (
    <div className="rounded border border-sidebar-border bg-internal-w04 p-4 space-y-1.5 max-w-xl">
      {rows.map((r, i) => (
        <div
          key={i}
          className={`flex justify-between text-sm py-1 ${
            r.bold ? "border-t border-sidebar-border/40 pt-2 mt-1" : ""
          }`}
        >
          <span className={r.bold ? "font-bold text-foreground" : "text-muted-foreground"}>{r.k}:</span>
          <span
            className={`font-mono ${r.bold ? "font-bold" : ""} ${
              r.tone === "primary" ? "text-primary" : r.tone === "good" ? "text-lime-400" : "text-foreground"
            }`}
          >
            {r.v}
          </span>
        </div>
      ))}
    </div>
  );
}

// =============================================================
// CompactStat — usado no card de posicionamento
// =============================================================
function CompactStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "text-lime-400"
      : tone === "warn"
      ? "text-yellow-400"
      : tone === "bad"
      ? "text-red-400"
      : "text-foreground";
  return (
    <div className="rounded border border-sidebar-border/40 bg-internal-20 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-mono font-bold text-sm ${color}`}>{value}</div>
    </div>
  );
}

// =============================================================
// ABA CONCORRENTES — análise completa de preços
// =============================================================
function CompetitorsTab({
  result,
  competitorStats,
  positioning,
}: {
  result: PricingResult;
  competitorStats: CompetitorStats;
  positioning: Positioning;
}) {
  if (!competitorStats) {
    return (
      <div className="rounded border border-dashed border-sidebar-border p-8 text-center space-y-2">
        <Users size={32} className="mx-auto text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Nenhum concorrente cadastrado com preço. Vá em <strong className="text-foreground">Análise de Concorrentes</strong> e adicione preços para ver a análise comparativa.
        </p>
      </div>
    );
  }

  const { min, max, avg, median, count, all } = competitorStats;
  const price = result.idealPrice;
  // Posição relativa 0..100 entre min e max
  const range = Math.max(1, max - min);
  const pricePos = price > 0 ? Math.max(0, Math.min(100, ((price - min) / range) * 100)) : 0;
  const avgPos = Math.max(0, Math.min(100, ((avg - min) / range) * 100));

  const recommended = {
    agressivo: Math.max(result.minPrice, min * 0.97),
    competitivo: Math.max(result.minPrice, avg),
    premium: Math.max(result.minPrice, max * 1.05),
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CompactStat label={`Menor (${count})`} value={fmtBRL(min)} tone="good" />
        <CompactStat label="Médio" value={fmtBRL(avg)} />
        <CompactStat label="Mediana" value={fmtBRL(median)} />
        <CompactStat label="Maior" value={fmtBRL(max)} tone="bad" />
      </div>

      {/* Régua visual */}
      <div className="rounded border border-sidebar-border bg-internal-w04 p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Posicionamento na faixa de mercado</span>
          <span
            className={`font-bold uppercase text-[10px] ${
              positioning?.tone === "good"
                ? "text-lime-400"
                : positioning?.tone === "warn"
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {positioning?.label}
          </span>
        </div>
        <div className="relative h-12 mt-2">
          {/* trilho */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-lime-500/40 via-yellow-500/40 to-red-500/40" />
          {/* concorrentes */}
          {all.map((p, i) => {
            const pos = ((p - min) / range) * 100;
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 border border-cyan-200"
                style={{ left: `${pos}%`, transform: "translate(-50%,-50%)" }}
                title={`Concorrente: ${fmtBRL(p)}`}
              />
            );
          })}
          {/* média */}
          <div
            className="absolute top-0 bottom-0 w-px bg-yellow-400/60"
            style={{ left: `${avgPos}%` }}
            title={`Média: ${fmtBRL(avg)}`}
          />
          {/* seu preço */}
          {price > 0 && (
            <div
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${pricePos}%` }}
            >
              <div className="text-[10px] font-bold text-primary whitespace-nowrap">Você {fmtBRL(price)}</div>
              <div className="w-0.5 h-8 bg-primary mt-0.5" />
            </div>
          )}
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>{fmtBRL(min)}</span>
          <span>{fmtBRL(max)}</span>
        </div>
      </div>

      {/* Estratégias sugeridas */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-3 flex items-center gap-2">
          <Target size={14} className="text-primary" /> Estratégias Recomendadas com Base no Mercado
        </h4>
        <div className="grid md:grid-cols-3 gap-3">
          <StrategyCard
            title="Agressivo"
            subtitle="Ganhar volume e desbancar concorrentes"
            description="Preço definido como 3% abaixo do menor preço encontrado no mercado."
            price={recommended.agressivo}
            tone="good"
            warn={recommended.agressivo < result.minPrice ? "Preço abaixo do seu custo operacional!" : undefined}
          />
          <StrategyCard
            title="Competitivo"
            subtitle="Equilíbrio e estabilidade"
            description="Preço alinhado à média exata praticada pelos seus concorrentes."
            price={recommended.competitivo}
            tone="primary"
          />
          <StrategyCard
            title="Premium"
            subtitle="Posicionamento de marca e exclusividade"
            description="Preço definido como 5% acima do maior preço do mercado."
            price={recommended.premium}
            tone="warn"
          />
        </div>
      </div>


      <div className="rounded border border-sidebar-border bg-internal-w04 p-4">
        <h4 className="text-xs font-bold uppercase tracking-widest text-foreground mb-2">
          Comparação Detalhada
        </h4>
        <div className="space-y-1 text-xs">
          <RowKV k="Seu preço ideal" v={fmtBRL(price)} accent="primary" />
          <RowKV k="Diferença vs menor" v={fmtBRL(price - min)} accent={price >= min ? "good" : "bad"} />
          <RowKV k="Diferença vs média" v={fmtBRL(price - avg)} accent={price <= avg ? "good" : "bad"} />
          <RowKV k="Diferença vs maior" v={fmtBRL(price - max)} accent={price <= max ? "good" : "bad"} />
        </div>
      </div>
    </div>
  );
}

function StrategyCard({
  title,
  subtitle,
  description,
  price,
  tone,
  warn,
}: {
  title: string;
  subtitle: string;
  description?: string;
  price: number;
  tone: "good" | "primary" | "warn";
  warn?: string;
}) {
  const border =
    tone === "good"
      ? "border-lime-500/40 bg-lime-500/5"
      : tone === "primary"
      ? "border-primary/40 bg-primary/5"
      : "border-yellow-500/40 bg-yellow-500/5";
  const color = tone === "good" ? "text-lime-400" : tone === "primary" ? "text-primary" : "text-yellow-400";
  return (
    <div className={`rounded border p-3 flex flex-col ${border}`}>
      <div className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</div>
      <div className="text-[10px] text-muted-foreground mb-1">{subtitle}</div>
      {description && <div className="text-[10px] text-muted-foreground/70 mb-2 italic">{description}</div>}
      <div className={`font-mono font-bold text-lg mt-auto ${color}`}>{fmtBRL(price)}</div>
      {warn && <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
        <AlertTriangle size={10} /> {warn}
      </div>}
    </div>
  );
}


// =============================================================
// ABA GUIA — explica cada conceito e o que ele influencia
// =============================================================
function GuideTab() {
  const sections: { title: string; items: { term: string; desc: string; impact: string }[] }[] = [
    {
      title: "Preços Calculados",
      items: [
        { term: "Custo Total", desc: "Soma de todos os custos fixos ativos (produto, frete, embalagem, transporte, armazenagem, operacional).", impact: "Define o piso absoluto. Quanto maior, maior o preço mínimo e o ideal." },
        { term: "Preço Mínimo (break-even)", desc: "O preço que cobre custos + taxas + impostos, sem lucro nenhum.", impact: "Vender abaixo = prejuízo. É o limite inferior para qualquer promoção." },
        { term: "Preço Ideal", desc: "Preço calculado para atingir o lucro definido em 'Objetivo de Lucro' depois de descontar todos os custos.", impact: "É o seu preço-alvo. Aparece no campo Preço de Venda do produto." },
        { term: "Preço Vitrine", desc: "Preço inflado mostrado riscado, usado para criar percepção de desconto.", impact: "Quanto maior o Aumento Estratégico, maior o desconto exibido — mas o preço final volta ao ideal." },
      ],
    },
    {
      title: "Lucro & Margem",
      items: [
        { term: "Lucro (R$)", desc: "Reais que sobram por unidade depois de pagar TUDO.", impact: "Multiplicado pelo volume vendido = seu lucro total." },
        { term: "Lucro (%)", desc: "Percentual do preço que vira lucro líquido — sua meta configurada.", impact: "Aumentar essa meta empurra o preço ideal para cima." },
        { term: "Margem Líquida", desc: "Lucro ÷ Preço de venda. Diferente do markup.", impact: "Se ficar abaixo da margem mínima de alerta, o sistema avisa." },
        { term: "Margem Mínima de Alerta", desc: "Margem abaixo da qual o sistema te alerta de baixa rentabilidade.", impact: "Não bloqueia, só sinaliza para você revisar." },
      ],
    },
    {
      title: "Custos, Taxas e Impostos",
      items: [
        { term: "Custos Fixos (R$)", desc: "Valores em reais que não dependem do preço de venda (ex: custo do produto, frete pago ao fornecedor).", impact: "Aumentam o preço mínimo e o ideal proporcionalmente." },
        { term: "Custos Percentuais (%)", desc: "Custos que variam conforme o preço (ex: marketing, royalties).", impact: "Reduzem o que sobra para você. Tratados como taxas no cálculo." },
        { term: "Taxas (%)", desc: "Comissões de marketplace, cartão, gateway de pagamento.", impact: "Cobradas sobre o preço final. Quanto mais altas, mais alto precisa ser o preço ideal." },
        { term: "Impostos (%)", desc: "ICMS, Simples, PIS, COFINS, ISS — incidem sobre a venda.", impact: "Igual às taxas: comem percentual do preço, pressionando-o para cima." },
      ],
    },
    {
      title: "Estratégia Promocional",
      items: [
        { term: "Aumento Estratégico (%)", desc: "Quanto inflar o preço para criar o 'Preço Vitrine'.", impact: "Aumento de 25% gera ~20% de desconto exibido. O preço final volta ao ideal." },
        { term: "Desconto Exibido", desc: "Calculado matematicamente: (1 - ideal/vitrine) × 100.", impact: "Cria percepção de oferta. Nunca é igual ao aumento — é sempre menor." },
        { term: "Preço Final", desc: "Vitrine × (1 - desconto). Volta exatamente ao Preço Ideal.", impact: "Você ganha o mesmo lucro, o cliente percebe vantagem." },
      ],
    },
    {
      title: "Análise de Concorrentes",
      items: [
        { term: "Menor / Médio / Maior", desc: "Calculados a partir dos preços dos concorrentes cadastrados.", impact: "Servem como referência de mercado. Não alteram o cálculo automaticamente." },
        { term: "Posicionamento", desc: "Onde seu preço ideal cai na faixa entre menor e maior concorrente.", impact: "Se ficar muito acima → risco de perder venda. Se ficar muito abaixo → risco de deixar lucro na mesa." },
        { term: "Estratégias Sugeridas", desc: "Preços calculados com base nos concorrentes (agressivo / competitivo / premium).", impact: "São sugestões — use os botões na aba Promoção para aplicar no Preço Vitrine." },
      ],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded border border-primary/30 bg-primary/5 p-4">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <HelpCircle size={16} className="text-primary" /> Como funciona a precificação?
        </h4>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          O sistema parte dos seus <strong className="text-foreground">custos fixos</strong>, soma o que será descontado em
          <strong className="text-foreground"> taxas</strong> e <strong className="text-foreground">impostos</strong> (percentuais do preço),
          reserva o <strong className="text-foreground">lucro desejado</strong> e calcula matematicamente o
          <strong className="text-primary"> Preço Ideal</strong> usando:
        </p>
        <code className="block mt-2 text-[11px] font-mono bg-internal-20 p-2 rounded border border-sidebar-border">
          Preço = Custos Fixos ÷ (1 − Taxas% − Impostos% − Lucro%)
        </code>
      </div>

      <div className="space-y-3">
        {sections.map((sec) => (
          <CollapsibleSection key={sec.title} title={sec.title}>
            <div className="space-y-4 pt-2">
              {sec.items.map((it) => (
                <div key={it.term} className="border-l-2 border-primary/40 pl-3 py-1 bg-white/5 p-3 rounded-r">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2">
                    {it.term}
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      Influência: direta
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.desc}</div>
                  <div className="text-[11px] text-lime-400 mt-2 flex items-start gap-1">
                    <TrendingUp size={10} className="mt-0.5 shrink-0" />
                    <span><strong>O que ele faz:</strong> {it.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded border border-sidebar-border bg-internal-w04 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <h4 className="text-xs font-bold uppercase tracking-widest text-primary">{title}</h4>
        {open ? <ChevronDown size={16} className="text-muted-foreground" /> : <ChevronRight size={16} className="text-muted-foreground" />}
      </button>
      {open && <div className="p-4 pt-0">{children}</div>}
    </div>
  );
}


