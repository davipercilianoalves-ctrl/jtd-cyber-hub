## Plano: Toolbar unificada para Produtos, Anúncios e Fornecedores

### Problema
Hoje cada uma das 3 telas (Produtos, Anúncios, Fornecedores) repete a mesma estrutura "horrível e mal distribuída":
- Título + subtítulo solto à esquerda
- Botão "+ NOVO X" jogado no canto direito
- Barra de busca enorme ocupando largura inteira numa linha separada
- Contador "Mostrando X de Y" como texto cinza órfão em outra linha
- Sem filtros visuais, sem indicação de quantidade total, sem toggle de view, layout desigual entre as 3 telas

### Solução: criar `<ListToolbar />` reutilizável

Componente único em `src/components/layout/ListToolbar.tsx` que distribui tudo numa única faixa coesa:

```text
┌──────────────────────────────────────────────────────────────┐
│ ICON  Título            [🔍 buscar...     ]  [filtros] [+ Novo] │
│       subtítulo · X de Y                                       │
└──────────────────────────────────────────────────────────────┘
```

**Estrutura visual (grid responsivo):**
- Coluna 1 (esquerda): ícone temático em badge + título + subtítulo/contador inline com pontinhos separadores
- Coluna 2 (meio, flex-1): campo de busca compacto (max-w-md) com ícone embutido
- Coluna 3 (direita): chips de filtro opcionais (ex: Status ATIVO/INATIVO, Marketplace) + botão CTA primário

**Comportamento:**
- Em mobile (`<sm`): vira 2 linhas — header + (busca | CTA)
- Em desktop: tudo em uma única linha alinhada
- Usa `grid grid-cols-[auto_1fr_auto]` com `min-w-0` no meio para a busca não estourar
- Bordas suaves, fundo `bg-internal-w03`, padding interno consistente

**Props da API:**
```tsx
<ListToolbar
  icon={Package}
  title="Produtos"
  subtitle="Gerencie sua base de produtos"
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Buscar por nome ou SKU..."
  totalCount={products.length}
  filteredCount={filtered.length}
  filters={[
    { label: "Ativos", active: filterActive, onClick: ... },
    { label: "Inativos", active: ..., onClick: ... },
  ]}
  cta={{ label: "Novo Produto", to: "/produtos/novo", icon: Plus }}
/>
```

### Arquivos a criar/modificar
1. **Criar** `src/components/layout/ListToolbar.tsx` — componente reutilizável
2. **Modificar** `src/pages/Produtos/index.tsx` — substituir header + busca + contador pelo `<ListToolbar />`
3. **Modificar** `src/pages/Anuncios/index.tsx` — idem, com filtros por marketplace
4. **Modificar** `src/pages/Fornecedores.tsx` — idem, com filtro Ativo/Inativo

### Não muda
- A tabela de cada listagem (só a barra superior é refatorada)
- Lógica de fetch/filtro no Supabase
- Sidebar, layout geral, tokens de cor

### Detalhes visuais
- Ícone do título em badge `h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 text-primary`
- Contador como pill discreta ao lado do subtítulo: `{filtered}/{total}` em mono
- Busca com `h-9` (mais compacta que os atuais `py-3`), ícone à esquerda em 14px
- CTA mantém estilo Cyber Acid (lime), agora alinhado e proporcional aos demais elementos
- Filtros como chips toggle pequenos (`text-xs`, `rounded-full`)
