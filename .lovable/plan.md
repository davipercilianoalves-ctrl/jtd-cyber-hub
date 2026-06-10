# Ajustes — Painel Flutuante Universal + Header do Concorrente

Escopo: `src/pages/Produtos/ProdutoForm.tsx` e `src/components/FloatingKeywordPanel.tsx`.

## 1. Painel flutuante universal (uma única instância sempre montada)

- Hoje o painel é montado/desmontado por concorrente e o "destino" das keywords é fixo no momento da abertura.
- Mudar para: **uma única instância do painel**, persistente, sempre disponível. O destino das keywords é **sempre o concorrente atualmente aberto** (`openCompetitorIndex`).
- Comportamento:
  - Abrir o painel = `panelOpen = true` (estado independente do concorrente).
  - Toda keyword digitada/adicionada vai para `competitors[openCompetitorIndex].keywords_found`.
  - Se o usuário troca o concorrente aberto (clica outra seta), o painel **continua aberto na mesma posição/tamanho**, mas a partir desse momento as novas palavras vão para o novo concorrente.
  - Não há mais "salvar texto pendente ao trocar" — não precisa, o input continua o mesmo, só muda o destino.
  - As keywords exibidas dentro do painel ("Deste concorrente") atualizam para refletir o concorrente aberto agora.
  - Se nenhum concorrente está aberto, mostrar aviso curto "Abra um concorrente para adicionar keywords" e desabilitar o ADD.
- A lista global `allKeywords` continua vindo de todos os concorrentes + keywords do produto, mostrada como sugestões (clique = adiciona ao concorrente aberto atual).
- Fluxo final permanece: o botão "Enviar para Lista do Produto" envia as keywords do concorrente aberto para a lista principal do produto.

## 2. Header do card de concorrente — barra inteira clicável

Layout novo do header (toda a barra de cima é o trigger de expandir/recolher):

```text
┌──────────────────────────────────────────────────────────┐
│ [˅]  TÍTULO DO ANÚNCIO CONCORRENTE — editável            │  ← barra toda clicável
├──────────────────────────────────────────────────────────┤
│ #N    link do anúncio...              R$ [preço]   [🗑] │
└──────────────────────────────────────────────────────────┘
```

- A **barra superior inteira** (não só a seta) é o botão que abre/fecha o card. Cursor `pointer` em toda a área.
- Dentro dessa barra: ícone seta à esquerda + **título do anúncio** ao lado da seta (input de título fica nessa linha, com `onClick`/`onMouseDown` parando propagação para não acionar o toggle).
- Linha de baixo: `#N`, link, preço, lixeira (fora do trigger, como hoje).
- Mantém comportamento exclusivo: abrir um fecha o outro.

## Técnico

- `FloatingKeywordPanel`: nova prop `targetTitle` (título do concorrente aberto) + `disabled` (quando nenhum aberto). Remover `onPendingChange`/`flushPending` (não precisam mais).
- `ProdutoForm`:
  - Estado: `panelOpen: boolean` (substitui `openPanel: number | null`), `panelPending` removido.
  - `openCompetitorIndex` continua governando qual concorrente recebe as keywords.
  - Botão "+ Adicionar Palavras-chave" dentro do card apenas faz `setPanelOpen(true)` (não precisa setar índice — já é o aberto).
  - Reescrever header do card conforme item 2; input de título com `onClick={(e) => e.stopPropagation()}`.

## Fora de escopo

Banco, schema, outras seções, "Análise Geral do Produto", lista de keywords do produto.
