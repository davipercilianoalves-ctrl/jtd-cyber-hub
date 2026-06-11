## Módulo Precificação Inteligente — Plano

Adicionar uma nova seção/aba **"Precificação Inteligente"** dentro de `src/pages/Produtos/ProdutoForm.tsx` (mesmo padrão `jtd-glass` das outras `<section>`) que substitui os campos soltos de custo/preço por uma calculadora completa, com persistência em uma única coluna `pricing` (jsonb) na tabela `products`.

### 1. Banco de dados
Migração adicionando uma coluna em `products`:
- `pricing jsonb default '{}'::jsonb` — guarda toda a configuração da calculadora (custos padrão, custos personalizados, taxas, impostos, objetivos, promoção, cenários).

Mantém `cost_price` e `sale_price` como espelho derivado (escritos no submit) para não quebrar telas que já consomem (Anúncios, listas, etc.). Sem nova tabela — todo o módulo vive no JSON do produto.

### 2. Arquitetura de componentes
Novo diretório `src/components/pricing/`:

```text
src/components/pricing/
├── PricingModule.tsx        # container com sub-abas internas
├── PricingSummary.tsx       # Bloco 1 — Resumo Financeiro (sticky topo)
├── CostsSection.tsx         # Blocos 2 + 3 — custos padrão + personalizados
├── FeesSection.tsx          # Bloco 4 — taxas/comissões
├── TaxesSection.tsx         # Bloco 5 — impostos
├── ProfitGoals.tsx          # Bloco 6 — objetivos
├── PromoStrategy.tsx        # Bloco 7 — estratégia promocional
├── ScenarioSimulator.tsx    # Bloco 8 — 3 cenários lado a lado
├── PricingReport.tsx        # Bloco 9 — relatório detalhado
├── PricingChart.tsx         # Bloco 11 — gráficos (recharts: pie + bar)
├── PricingAlerts.tsx        # Bloco 12 — alertas
├── CostRow.tsx              # linha editável (nome, tipo, valor, ativo, lixeira)
└── usePricingEngine.ts      # hook puro com todas as fórmulas (useMemo)
```

`PricingModule` recebe `value: PricingState` + `onChange` e é plugado no `ProdutoForm` como mais uma `<section>` (entre Mídia e Concorrentes). Internamente usa abas (Resumo / Custos / Taxas & Impostos / Promoção / Simulações / Relatório) para não criar uma página gigante.

### 3. Modelo de dados (TypeScript)

```ts
type CostKind = "fixed" | "percent";
interface CostItem { id: string; name: string; kind: CostKind; value: number; active: boolean; note?: string; }
interface PricingState {
  costs: CostItem[];        // produto, frete, embalagem, transporte, armazenagem, operacional + personalizados
  fees: CostItem[];         // marketplace, comissão, cartão, gateway, financeira + personalizadas (percent)
  taxes: CostItem[];        // ICMS, Simples, ISS, PIS, COFINS + personalizados (percent)
  goal: { mode: "marginPct" | "profitPct" | "profitBRL"; value: number };
  promo: { strategicMarkupPct: number };   // desconto exibido é calculado
  scenarios: Array<{ name: string; overrides: Partial<PricingState> }>;
  minMarginPct?: number;    // limite para alertas
}
```

Custos padrão são pré-semeados com `active: true` e `value: 0`; o usuário só edita o que importa.

### 4. Motor de cálculo (`usePricingEngine`)
Função pura, totalmente memoizada, retorna:

```text
costFixedTotal  = Σ costs(active, kind=fixed).value
feePctTotal     = Σ fees(active).value / 100
taxPctTotal     = Σ taxes(active).value / 100
costPctTotal    = Σ costs(active, kind=percent).value / 100   // % sobre preço
goalPct         = depende do modo (marginPct/profitPct → direto; profitBRL → resolvido por bisseção)

denom           = 1 - feePctTotal - taxPctTotal - costPctTotal - goalPct
idealPrice      = costFixedTotal / denom            // erro se denom <= 0 → alerta
minPrice        = costFixedTotal / (1 - feePctTotal - taxPctTotal - costPctTotal)
profitBRL       = idealPrice * goalPct
netMarginPct    = profitBRL / idealPrice * 100
```

**Promoção (Bloco 7):**

```text
showcase    = real * (1 + markup/100)
discountPct = (1 - real / showcase) * 100   // sempre diferente do markup
final       = showcase * (1 - discountPct/100)  // === real (matemática garantida)
```

### 5. UI por bloco
1. **Resumo** — grid sticky 4×2 com cartões neon (Cyber Acid em verde p/ positivo, vermelho p/ negativo). Atualiza ao vivo via `useMemo`.
2/3. **Custos** — tabela editável com cabeçalho [Nome | Tipo (R$/%) | Valor | Ativo | 🗑]. Os 6 custos padrão vêm marcados; botão `+ Novo Custo` adiciona linha vazia. Tipo via toggle segmentado.
4/5. **Taxas / Impostos** — mesmo padrão, sempre `%`. Botões `+ Nova Taxa` / `+ Novo Imposto`.
6. **Objetivos** — 3 radios (margem % / lucro % / lucro R$) + input do valor escolhido.
7. **Promoção** — 3 inputs visíveis (Preço Real, Aumento %, Preço Vitrine) + 2 read-only (Desconto Exibido %, Preço Final) destacando a equivalência.
8. **Simulador** — 3 colunas; cada cenário é um clone do estado atual com overrides locais; tabela comparativa de Preço, Lucro, Margem.
9. **Relatório** — lista vertical formatada igual ao exemplo do briefing, pronta para copiar/imprimir.
11. **Gráficos** — `recharts` (já no projeto via shadcn chart): Pizza (composição) + Barras (custo vs taxa vs imposto vs lucro).
12. **Alertas** — banner condicional acima do resumo: lucro negativo, margem < mínimo, soma de % ≥ 100, frete > X% do custo, preço < custo.

### 6. Integração no `ProdutoForm`
- Substituir os campos "Preço de Venda / Preço de Custo" atuais por um resumo compacto que abre o módulo.
- Adicionar `pricing` no `formData` (carrega de `data.pricing` ou default).
- No submit: gravar `pricing` no jsonb e sincronizar `cost_price = costFixedTotal` e `sale_price = idealPrice` para retrocompatibilidade.

### 7. Arquivos
**Criar:** migração `add_pricing_to_products`, os 13 arquivos em `src/components/pricing/`.
**Editar:** `src/pages/Produtos/ProdutoForm.tsx` (adicionar seção, estado, persistência).
**Sem mudanças:** Anúncios, Fornecedores, listagens — continuam lendo `cost_price`/`sale_price`.

### Pontos a confirmar
1. Manter `cost_price`/`sale_price` como espelho derivado (recomendado) ou migrar Anúncios/Listas para ler de `pricing` agora?
2. As abas internas do módulo devem ser **sub-abas horizontais** (mais limpo) ou **acordeões empilhados** (mais próximo do estilo atual da página)?