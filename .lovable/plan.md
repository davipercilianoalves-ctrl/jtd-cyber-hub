## Problema

A marcação atual destaca **toda ocorrência** da palavra no texto. Como "aaaaa" se repete, o texto inteiro fica amarelo. O correto é marcar **apenas o trecho exato** que o usuário selecionou (offset inicial e final), mesmo que o mesmo texto apareça em outros pontos.

## Solução — Marcações por Range (offsets)

Em vez de marcar por "palavra encontrada", armazenar **ranges** específicos: `{ start, end, text }`. Cada seleção vira um range único na descrição daquele concorrente.

### Mudanças

**1. Estrutura de dados (`Competitor`)**
Adicionar campo paralelo:
```ts
highlights: { start: number; end: number; text: string }[]
```
`keywords_found` continua existindo (lista de strings para o painel/produto). Cada highlight também adiciona seu texto a `keywords_found` se ainda não estiver lá.

**2. Captura da seleção**
No `onMouseUp` do textarea, já temos `selectionStart` e `selectionEnd`. Passar esses offsets para o menu flutuante junto com o texto.

**3. Ação "Marcar Keyword"**
Ao clicar, criar um novo highlight `{ start, end, text }` no concorrente atual + adicionar `text` em `keywords_found` (sem duplicar). Não tocar em outras ocorrências do mesmo texto.

**4. Renderização da camada de destaque**
Reescrever a camada `<div>` sobreposta ao textarea para iterar o texto **por offsets ordenados**, não por regex:
- Ordenar highlights por `start`
- Mesclar/ignorar overlaps (se nova seleção sobrepõe outra, manter a maior ou mesclar)
- Renderizar fatias: `texto[0..start]` normal → `<mark>texto[start..end]</mark>` amarelo → repeat → resto normal

**5. Sincronização com edição de texto**
Quando o usuário edita a descrição:
- Se a edição ocorre **antes** de um highlight: deslocar `start`/`end` pelo delta
- Se ocorre **dentro** de um highlight: invalidar (remover) esse highlight
- Implementação simples: comparar `oldValue` vs `newValue`, achar ponto de divergência, calcular delta, ajustar/remover highlights afetados

**6. Remover highlight**
Clicar no `<mark>` (via overlay clicável ou botão no menu quando seleção está dentro de range existente) remove aquele range. Para v1, basta um botão "Remover marcação" no menu flutuante quando a seleção sobrepõe um highlight existente.

**7. Persistência**
Salvar `highlights` no banco junto com o concorrente (coluna `highlights jsonb` em `product_competitors`). Migração nova.

### Detalhes técnicos

- O `<mark>` na camada overlay precisa estar com texto transparente e fundo `bg-yellow-400/60`, **alinhado perfeitamente** ao textarea (mesma fonte, padding, line-height, `white-space: pre-wrap`, `word-break: break-all`).
- Scroll do textarea deve sincronizar com o overlay (`onScroll` → `overlay.scrollTop = textarea.scrollTop`).
- `autoResize` continua sincronizando altura.
- Performance: highlights são poucos por concorrente, render O(n) trivial.

### Arquivos afetados

- `src/pages/Produtos/ProdutoForm.tsx` — estrutura `Competitor`, lógica de seleção, renderização da camada, sincronização edição/scroll, ação do menu.
- Migração Supabase — adicionar coluna `highlights jsonb default '[]'` em `product_competitors`.
- `fetchProduct` e `handleSubmit` — incluir `highlights` no mapeamento.

### Fora do escopo desta entrega

- Edição visual avançada de highlights (arrastar bordas).
- Cores diferentes por highlight.
- Highlights na descrição interna do produto (apenas concorrentes).