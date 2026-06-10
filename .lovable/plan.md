# Ajustes Header Concorrente + Painel Keywords

Escopo: `src/pages/Produtos/ProdutoForm.tsx` e `src/components/FloatingKeywordPanel.tsx`.

## 1. Header do card de concorrente — só texto ao lado da seta

- A barra superior do card continua sendo o trigger inteiro de abrir/fechar.
- Ao lado da seta, mostrar **apenas o título como texto** (não input). Sem edição inline ali.
- A edição do título do concorrente continua existindo, mas **só aparece quando o card está aberto**, dentro do corpo expandido (campo "TÍTULO DO ANÚNCIO" como já existe para outros campos). Assim o clique na barra de cima nunca interfere com edição.
- Linha de baixo do header (`#N`, link, preço, lixeira) permanece como hoje.

## 2. Painel de Keywords — lista unificada + modo compacto

### 2a. Lista unificada
Remover a separação "Deste Concorrente" vs "Já usadas em outros". Uma única lista com **todas as keywords de todas as análises + produto**, ordenadas. Cada chip indica visualmente a origem:

- Keywords do concorrente atualmente aberto: estilo "ativo" (fundo primário cheio, com `×` para remover).
- Keywords de outros concorrentes / produto: estilo "fantasma" (borda fina, sem `×`); clique adiciona ao concorrente aberto.
- Pequeno marcador de origem ao lado: `#2`, `#3`, `P` (produto) — para "determinar onde foram encontradas". Tooltip com o nome completo.
- Se a mesma palavra existe em mais de um lugar, mostra um único chip com múltiplos marcadores (`#2 #3`).

### 2b. Botão compactar input
- Novo botão no header do painel (ícone) alterna entre dois modos:
  - **Modo lista** (padrão): mostra input + lista de keywords.
  - **Modo input-only**: mostra **só** o campo "nova palavra" + botão ADD. A lista some, painel encolhe para o mínimo.
- Estado persiste enquanto o painel estiver aberto.

### 2c. Compactação geral
- Reduzir paddings, font-sizes e gaps no painel para ocupar o mínimo necessário.
- Tamanho inicial menor (ex.: 320×ajustado ao conteúdo). Auto-grow continua até o usuário arrastar.
- Banner do alvo atual (`→ CONCORRENTE #N — título`) continua, mas em uma linha mais fina.

## Técnico

- `FloatingKeywordPanel`:
  - Nova prop `keywordSources: { keyword: string; sources: Array<{ label: string; isCurrent: boolean }> }[]` (substitui `keywords` + `allKeywords`).
  - Estado interno `compact: boolean` para modo input-only; botão no header alterna.
  - Render único da lista unificada com estilo condicional por `isCurrent`.
- `ProdutoForm`:
  - Montar `keywordSources` no momento de renderizar o painel: percorre todos os concorrentes + lista do produto, agrupa por palavra, marca `isCurrent` quando `sourceIndex === openCompetitorIndex`.
  - Header do card: substituir input de título por `<span>` com o título; mover o input editável para dentro do corpo expandido.

## Fora de escopo
Banco, outras seções, lógica de envio para o produto (mantém botão atual).
