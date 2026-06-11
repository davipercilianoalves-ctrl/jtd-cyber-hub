// Precificação Inteligente — modelo de dados, defaults e motor de cálculo.
// Puro, sem dependências de React. Usado pelo PricingModule.

export type CostKind = "fixed" | "percent";

export interface CostItem {
  id: string;
  name: string;
  kind: CostKind; // "fixed" R$, "percent" % do preço
  value: number;
  active: boolean;
  note?: string;
  builtin?: boolean; // marca os 6 padrões para não permitir remoção
}

export interface FeeItem {
  id: string;
  name: string;
  value: number; // %
  active: boolean;
  builtin?: boolean;
}

export interface TaxItem extends FeeItem {}

export type GoalMode = "marginPct" | "profitPct" | "profitBRL";

export interface PricingState {
  costs: CostItem[];
  fees: FeeItem[];
  taxes: TaxItem[];
  goal: { mode: GoalMode; value: number };
  promo: { strategicMarkupPct: number };
  scenarios: Array<{ id: string; name: string; overrides: Partial<PricingState> }>;
  minMarginPct: number;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const defaultPricing = (): PricingState => ({
  costs: [
    { id: uid(), name: "Custo do Produto", kind: "fixed", value: 0, active: true, builtin: true },
    { id: uid(), name: "Frete", kind: "fixed", value: 0, active: true, builtin: true },
    { id: uid(), name: "Embalagem", kind: "fixed", value: 0, active: true, builtin: true },
    { id: uid(), name: "Transporte", kind: "fixed", value: 0, active: true, builtin: true },
    { id: uid(), name: "Armazenagem", kind: "fixed", value: 0, active: true, builtin: true },
    { id: uid(), name: "Custo Operacional", kind: "fixed", value: 0, active: true, builtin: true },
  ],
  fees: [
    { id: uid(), name: "Taxa Marketplace", value: 0, active: true, builtin: true },
    { id: uid(), name: "Comissão", value: 0, active: true, builtin: true },
    { id: uid(), name: "Taxa Cartão", value: 0, active: true, builtin: true },
    { id: uid(), name: "Gateway", value: 0, active: true, builtin: true },
    { id: uid(), name: "Taxa Financeira", value: 0, active: true, builtin: true },
  ],
  taxes: [
    { id: uid(), name: "ICMS", value: 0, active: true, builtin: true },
    { id: uid(), name: "Simples Nacional", value: 0, active: true, builtin: true },
    { id: uid(), name: "ISS", value: 0, active: true, builtin: true },
    { id: uid(), name: "PIS", value: 0, active: true, builtin: true },
    { id: uid(), name: "COFINS", value: 0, active: true, builtin: true },
  ],
  goal: { mode: "marginPct", value: 20 },
  promo: { strategicMarkupPct: 25 },
  scenarios: [
    { id: uid(), name: "Cenário 1", overrides: {} },
    { id: uid(), name: "Cenário 2", overrides: {} },
    { id: uid(), name: "Cenário 3", overrides: {} },
  ],
  minMarginPct: 10,
});

export function mergePricing(raw: any): PricingState {
  const base = defaultPricing();
  if (!raw || typeof raw !== "object") return base;
  return {
    costs: Array.isArray(raw.costs) && raw.costs.length ? raw.costs : base.costs,
    fees: Array.isArray(raw.fees) && raw.fees.length ? raw.fees : base.fees,
    taxes: Array.isArray(raw.taxes) && raw.taxes.length ? raw.taxes : base.taxes,
    goal: raw.goal ?? base.goal,
    promo: raw.promo ?? base.promo,
    scenarios: Array.isArray(raw.scenarios) && raw.scenarios.length ? raw.scenarios : base.scenarios,
    minMarginPct: typeof raw.minMarginPct === "number" ? raw.minMarginPct : base.minMarginPct,
  };
}

export interface PricingResult {
  costFixedTotal: number;
  costPctTotal: number; // 0..1
  feePctTotal: number;
  taxPctTotal: number;
  goalPct: number; // 0..1, resolvido se modo R$
  denom: number;
  idealPrice: number;
  minPrice: number;
  profitBRL: number;
  netMarginPct: number;
  showcasePrice: number;
  promoDiscountPct: number;
  promoFinalPrice: number;
  totalFeesBRL: number;
  totalTaxesBRL: number;
  invalid: boolean; // denom <= 0
}

export function computePricing(state: PricingState): PricingResult {
  const costFixedTotal = state.costs
    .filter((c) => c.active && c.kind === "fixed")
    .reduce((s, c) => s + (Number(c.value) || 0), 0);

  const costPctTotal =
    state.costs
      .filter((c) => c.active && c.kind === "percent")
      .reduce((s, c) => s + (Number(c.value) || 0), 0) / 100;

  const feePctTotal = state.fees.filter((f) => f.active).reduce((s, f) => s + (Number(f.value) || 0), 0) / 100;
  const taxPctTotal = state.taxes.filter((t) => t.active).reduce((s, t) => s + (Number(t.value) || 0), 0) / 100;

  // Resolver objetivo
  let goalPct = 0;
  if (state.goal.mode === "marginPct" || state.goal.mode === "profitPct") {
    goalPct = (Number(state.goal.value) || 0) / 100;
  } else {
    // profitBRL — bisseção em [0, 0.99 - outros%]
    const ceiling = Math.max(0, 1 - feePctTotal - taxPctTotal - costPctTotal - 0.001);
    let lo = 0,
      hi = ceiling;
    const target = Number(state.goal.value) || 0;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const denomMid = 1 - feePctTotal - taxPctTotal - costPctTotal - mid;
      if (denomMid <= 0) {
        hi = mid;
        continue;
      }
      const price = costFixedTotal / denomMid;
      const profit = price * mid;
      if (profit < target) lo = mid;
      else hi = mid;
    }
    goalPct = (lo + hi) / 2;
  }

  const denom = 1 - feePctTotal - taxPctTotal - costPctTotal - goalPct;
  const invalid = denom <= 0;
  const idealPrice = invalid ? 0 : costFixedTotal / denom;
  const minDenom = 1 - feePctTotal - taxPctTotal - costPctTotal;
  const minPrice = minDenom > 0 ? costFixedTotal / minDenom : 0;

  const profitBRL = idealPrice * goalPct;
  const netMarginPct = idealPrice > 0 ? (profitBRL / idealPrice) * 100 : 0;
  const totalFeesBRL = idealPrice * feePctTotal;
  const totalTaxesBRL = idealPrice * taxPctTotal;

  // Promoção
  const markup = (Number(state.promo.strategicMarkupPct) || 0) / 100;
  const showcasePrice = idealPrice * (1 + markup);
  const promoDiscountPct = showcasePrice > 0 ? (1 - idealPrice / showcasePrice) * 100 : 0;
  const promoFinalPrice = showcasePrice * (1 - promoDiscountPct / 100);

  return {
    costFixedTotal,
    costPctTotal,
    feePctTotal,
    taxPctTotal,
    goalPct,
    denom,
    idealPrice,
    minPrice,
    profitBRL,
    netMarginPct,
    showcasePrice,
    promoDiscountPct,
    promoFinalPrice,
    totalFeesBRL,
    totalTaxesBRL,
    invalid,
  };
}

export function applyScenario(base: PricingState, overrides: Partial<PricingState>): PricingState {
  return {
    ...base,
    ...overrides,
    costs: overrides.costs ?? base.costs,
    fees: overrides.fees ?? base.fees,
    taxes: overrides.taxes ?? base.taxes,
    goal: overrides.goal ?? base.goal,
    promo: overrides.promo ?? base.promo,
  };
}

export const fmtBRL = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 })
    : "R$ —";

export const fmtPct = (n: number, digits = 2) => (isFinite(n) ? `${n.toFixed(digits)}%` : "—");
