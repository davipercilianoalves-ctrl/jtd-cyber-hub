
# Plano: Redesign da Página Métricas

Reformular `/_authenticated/metricas` aplicando os 7 componentes de referência coletados, conectados aos dados reais da conta Mercado Livre (vendas, anúncios, visitas, perguntas).

## Estrutura final da página (top → bottom)

```
┌─────────────────────────────────────────────────────────┐
│ Header: título + seletor de período (7/30/90 dias)      │
├─────────────────────────────────────────────────────────┤
│ [1] Hero KPI Card (ref #6 - Incident Report)            │
│     ┌──── Funil grande (vertical) ────┐ ┌─ 2 KPIs ─┐    │
│     │ Visitas → Perguntas → Carrinho │ │ CountUp  │    │
│     │ → Compradores → Vendas         │ │ + pills  │    │
│     └────────────────────────────────┘ └──────────┘    │
│     Lista de métricas secundárias com divisores         │
├─────────────────────────────────────────────────────────┤
│ [2] Grid 4 KPIs clicáveis (ref #7 - Line Chart 6)       │
│     Vendas | Faturamento | Ticket Médio | Visitas       │
│     Cada um com badge ↑/↓ % vs período anterior         │
│     ↓ clicar troca a linha do gráfico abaixo            │
│     Line chart com glow colorido + dot grid pattern     │
├─────────────────────────────────────────────────────────┤
│ [3] Grid 2 colunas:                                     │
│   ┌─ Line Graph Stats (ref #4) ─┐ ┌─ Stat Cards ──┐    │
│   │ Linha multi-série            │ │ ref #3        │    │
│   │ Peak / Average / Growth      │ │ ícone tonal   │    │
│   └──────────────────────────────┘ └───────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Mapeamento ref → seção

| Ref | Componente | Onde entra |
|---|---|---|
| #5 Funnel animado (vertical) | Funil de conversão ML | Hero card, lado esquerdo |
| #6 Incident Report (CountUp + métricas) | Wrapper do hero | Card grande no topo |
| #7 Line Chart 6 (4 KPIs clicáveis) | Bloco principal de tendência | Meio da página |
| #4 Line Graph (Peak/Avg/Growth) | Comparativo período | Grid inferior, esquerda |
| #3 Statistic Card 12 (badge contexto) | Mini KPIs de apoio | Grid inferior, direita |
| #1 Stats Cards / #2 Live Dashboard | Padrão visual de KPI | Reaproveitado nos cards |

## Componentes a criar em `src/components/metricas/`

- `MetricsHeader.tsx` — título + Select de período (7/30/90 dias)
- `FunnelHeroCard.tsx` — ref #6: funil vertical animado (Framer Motion) + 2 KPIs com CountUp + lista de métricas secundárias com divisores
- `ConversionFunnel.tsx` — funil vertical com glow (SVG + Framer Motion), 5 etapas
- `InteractiveLineChart.tsx` — ref #7: 4 KPI buttons trocam dataKey + Recharts LineChart com `feDropShadow` colorido e pattern `dotGrid`
- `MultiSeriesChart.tsx` — ref #4: linha multi-série + cards Peak/Average/Growth calculados
- `ContextStatCard.tsx` — ref #3: ícone tonal + badge "vs período anterior"
- `CountUp.tsx` — hook/componente de animação numérica (raf-based, sem libs novas)

## Dados

Reutilizar os hooks/queries já existentes em `src/pages/Metricas.tsx` (vendas, visitas, perguntas, anúncios). Adicionar agregadores client-side:
- série diária por métrica (orders, revenue, ticket, visits)
- totais período atual vs anterior → variação %
- etapas do funil: `visitas → visitantes_unicos → perguntas+carrinho → compradores → vendas_concluidas`

Sem alterações de schema/edge functions. Apenas leitura.

## Design tokens

Tudo via `src/styles.css` (já tem semantic tokens). Cores das linhas/funil: usar variáveis Tailwind existentes (`--color-teal-500`, `--color-violet-500`, `--color-lime-500`, `--color-sky-500`). Glow via `feDropShadow` SVG na cor da métrica selecionada. Sem hard-coded hex em componentes.

## Dependências

Já instaladas: `recharts`, `framer-motion`, `lucide-react`, `class-variance-authority`, shadcn `card`/`badge`/`button`/`select`. **Nada novo a instalar.**

## Arquivos modificados

- **Criar:** 7 arquivos em `src/components/metricas/`
- **Reescrever:** `src/pages/Metricas.tsx` (composição nova, mantendo data fetching atual)
- **Não tocar:** rotas, layout, schema, edge functions

## Fora de escopo

- Dashboard, Vendas e outras páginas ficam como estão (só Métricas)
- Sem novos endpoints ou tabelas
- Sem mudanças de auth/permissões
- Sem refactor dos componentes de UI base do shadcn

Pronto pra implementar quando você aprovar.
