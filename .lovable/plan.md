# Ajustes — Análise de Concorrentes + Painel Flutuante

Escopo: `src/pages/Produtos/ProdutoForm.tsx` e `src/components/FloatingKeywordPanel.tsx`. Sem mexer em banco nem em outras telas.

## 1. Cabeçalho da seção Análise de Concorrentes

- Remover os 3 cards MIN / MED / MAX que ficam no cabeçalho da seção (eles já aparecem na "Análise Geral do Produto" no rodapé do form).
- Cabeçalho fica só com o título + subtítulo.

## 2. Acordeão exclusivo (só 1 concorrente aberto por vez)

- A seta de expandir vira o **primeiro elemento** de cada card de concorrente (lado esquerdo, antes do `#N` ou agrupada com ele em coluna).
- O **título** do concorrente passa a ficar **abaixo da seta/numeração**, não ao lado.
- Layout do header de cada concorrente:

```text
[˅]                 [R$ preço]   [🗑]
 #1
 TÍTULO DO ANÚNCIO — editável
 link do anúncio...
```

- Clicar na seta de um concorrente fechado abre ele **e fecha automaticamente** qualquer outro concorrente aberto (`openCompetitorIndex` já é estado único — apenas garantir comportamento de toggle exclusivo).
- Clicar na seta do concorrente aberto fecha ele.

## 3. Painel flutuante de keywords vinculado ao concorrente

Hoje cada concorrente pode ter seu próprio painel aberto independentemente. Mudança:

- **Apenas 1 painel flutuante de concorrente pode estar aberto por vez.**
- Quando o usuário clica em "+ Adicionar palavras-chave" de outro concorrente (ou expande outro concorrente via seta) **enquanto há um painel aberto**:
  1. O texto que estiver digitado no campo "Nova palavra..." é **salvo automaticamente** como keyword do concorrente anterior (split por vírgula/enter, igual ao botão ADD).
  2. As keywords já existentes do concorrente anterior permanecem (já é o comportamento atual, garantir).
  3. O painel anterior fecha.
  4. O novo painel abre para o concorrente atual.
- `openPanels: number[]` vira `openPanel: number | null` (single).

## 4. Painel flutuante (`FloatingKeywordPanel.tsx`) — melhorias

### 4.1 Tamanho dinâmico baseado no conteúdo

- Largura/altura inicial calculadas a partir da quantidade de keywords (mais keywords = painel maior, até o máximo já existente 700×700).
- Quando o usuário adiciona keywords e ainda não redimensionou manualmente, o painel cresce sozinho. Após o primeiro resize manual, congela o tamanho.

### 4.2 Lista global de keywords já encontradas

- Nova prop `allKeywords: string[]` passada pelo ProdutoForm = união de `competitors.flatMap(c => c.keywords_found)` + `keywords` do produto.
- Dentro do painel, abaixo do input "Nova palavra...", adicionar bloco **"JÁ USADAS EM OUTROS CONCORRENTES"** com chips menores em cor diferente (`bg-muted/30 border-muted-foreground/20`), clicáveis para adicionar ao concorrente atual.
- Cada chip dessa lista que já está no concorrente atual aparece marcado/desabilitado, evitando duplicar.

### 4.3 Redimensionar nas 3 direções (largura, altura, diagonal)

- Adicionar 3 handles: borda direita (resize horizontal), borda inferior (vertical) e canto inferior-direito (diagonal, já existe).
- Cursores: `ew-resize`, `ns-resize`, `se-resize`.

### 4.4 Mobilidade melhorada

- Permitir arrasto também encostando topo/laterais (já clampa hoje — manter).
- Header de arrasto fica mais largo e com cursor `grab`/`grabbing` durante arrasto.
- Quando minimizado, manter posição arrastável.
- Garantir que o painel não fica atrás do header do app (z-index alto, já tem `z-100`).

## 5. Persistência do texto não-salvo ao trocar de painel

Hoje `newKeyword` é estado interno do `FloatingKeywordPanel`. Para o item 3 funcionar:
- Adicionar prop opcional `onBeforeClose?: (pendingText: string) => void`.
- No ProdutoForm, ao trocar `openPanel` para outro índice, ler o input atual via callback e injetar o texto como keyword(s) do concorrente anterior antes de abrir o novo.
- Implementação: usar `useImperativeHandle` no painel ou simplesmente disparar `onBeforeClose(newKeyword)` no `useEffect` de cleanup quando o painel é desmontado.

## Fora de escopo

- Não alterar a lista de palavras-chave do produto principal.
- Não alterar schema, save logic, ou outras seções.
- Não mexer no rodapé "Análise Geral do Produto" (lá ficam os preços agora).
