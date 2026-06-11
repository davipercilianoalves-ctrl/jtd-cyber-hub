# Reformular listas de Produtos, Anúncios e Fornecedores

## Objetivo
Substituir as tabelas atuais (horríveis, mal distribuídas) por uma experiência de listagem moderna com **3 modos de visualização** alternáveis, melhor hierarquia visual e busca refinada.

## 1. Modos de visualização (view switcher)

Criar um seletor de modo (ícones toggle no canto direito da toolbar, ao lado do CTA), persistido em `localStorage` por página:

- **Tabela compacta** (`Rows`) — versão refinada do atual: tipografia menor, zebra striping sutil, hover destacado, células com mais respiro, status como pílula colorida, valores monetários alinhados à direita, badge de keywords agrupado.
- **Cards grid** (`LayoutGrid`) — grade responsiva 1/2/3/4 colunas. Cada card mostra: thumb/ícone do produto, nome em destaque, SKU em mono, fornecedor como chip, custo grande, mini-stats (keywords, concorrentes) em rodapé, status como faixa lateral colorida.
- **Lista detalhada** (`List`) — linhas largas tipo "feed", com avatar quadrado à esquerda, nome + descrição em duas linhas, metadados em pílulas, ações alinhadas à direita. Ideal para leitura rápida em desktop largo.

## 2. Toolbar/busca melhorada

Refinar `ListToolbar`:
- Busca cresce em foco (`focus-within:max-w-xl`), com atalho `⌘K` visível
- Adicionar **ordenação** (dropdown: nome, custo, data, status)
- Adicionar **densidade** (compact/comfortable) só para modo tabela
- View switcher (3 ícones segmentados) à esquerda do CTA
- Contador "1/1" vira chip com cor Cyber Acid quando filtro ativo

## 3. Componente unificado

Criar `src/components/data/DataView.tsx` que recebe:
- `data`, `columns` (definição de campos), `view` (table/grid/list)
- Renderiza o modo escolhido a partir de uma única fonte de dados
- Subcomponentes: `DataTable`, `DataGrid`, `DataList`

E `src/hooks/useViewMode.ts` para persistência em localStorage.

## 4. Aplicar nas 3 páginas

- **Produtos** — campos: nome, sku, fornecedor, custo, keywords, concorrentes, status. Card destaca custo + status.
- **Anúncios** — campos: produto, marketplace, preço, comissão, status. Card destaca preço + marketplace badge colorido por canal.
- **Fornecedores** — campos: nome, cidade/UF, contato, produtos vinculados, status. Card destaca localização + contagem de produtos.

## Arquivos
**Criar:** `src/components/data/DataView.tsx`, `DataTable.tsx`, `DataGrid.tsx`, `DataList.tsx`, `ViewSwitcher.tsx`, `src/hooks/useViewMode.ts`
**Editar:** `src/components/layout/ListToolbar.tsx` (sort + view switcher + busca expansível), `src/pages/Produtos/index.tsx`, `src/pages/Anuncios/index.tsx`, `src/pages/Fornecedores.tsx`

## Fora do escopo
Lógica de fetch, schema do banco, sidebar, tokens globais. Apenas apresentação.
