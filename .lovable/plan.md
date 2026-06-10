
## Objetivo

Adicionar todos os campos solicitados ao bloco **Informações Básicas** de `src/pages/Produtos/ProdutoForm.tsx`, mantendo 100% o design Acid Cyber e sem alterar outras telas.

## 1. Migração no Supabase (tabela `products`)

Adicionar as colunas que ainda não existem:

| Campo | Coluna | Tipo |
|---|---|---|
| Marca | `brand` | text |
| Produção | `production_type` | text (`propria` \| `terceiros`) |
| Data de validade | `expiration_date` | date |
| Frete Grátis | `free_shipping` | boolean default false |
| Peso Líquido (g) | `net_weight_g` | numeric |
| Peso Bruto (g) | `gross_weight_g` | numeric |
| Largura | `width` | numeric |
| Altura | `height` | numeric |
| Profundidade | `depth` | numeric |
| Volumes | `volumes` | integer default 1 |
| Itens por caixa | `items_per_box` | integer default 1 |
| Unidade de medida | `measurement_unit` | text (`m` \| `cm` \| `mm`) default `cm` |
| GTIN/EAN | `gtin` | text |
| GTIN/EAN tributário | `gtin_tax` | text |
| Listas de preço | `price_lists` | jsonb default `[]` |
| Formato | `format` | text (`simples` \| `variacoes` \| `composicao`) default `simples` |
| Tipo | `type` | text (`produto` \| `servico`) default `produto` |
| Situação | `status` | text (`ativo` \| `inativo`) default `ativo` |
| Preço de venda | `sale_price` | numeric |
| Unidade | `unit` | text (ex.: UN, PC, KG) default `UN` |
| Condição | `condition` | text (`novo` \| `usado` \| `recondicionado`) default `novo` |

Manter colunas existentes (`weight_g`, `dimensions`, etc.) intactas para compatibilidade.

## 2. Reformular bloco "Informações Básicas"

Em `src/pages/Produtos/ProdutoForm.tsx`, substituir o grid atual do bloco 1 por uma estrutura organizada em sub-seções dentro do mesmo card `jtd-glass`:

```
Informações Básicas
├── Identificação:     Nome*, Código (SKU), Marca, Categoria, Fornecedor
├── Classificação:     Formato, Tipo, Situação, Condição, Unidade
├── Preço:             Preço de Venda, Preço de Custo, Listas de Preço
├── Códigos fiscais:   GTIN/EAN, GTIN/EAN tributário
├── Logística:         Frete Grátis, Volumes, Itens p/ caixa, Data de Validade
└── Dimensões & Peso:  Unidade de Medida, Largura, Altura, Profundidade,
                       Peso Líquido, Peso Bruto
```

Padrão visual (idêntico aos campos atuais):
- `label` com `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`
- `input/select` com `rounded border border-sidebar-border bg-internal-20 p-3 text-sm focus:border-primary`
- Selects nativos com `appearance-none cursor-pointer`
- Toggles iguais ao do `is_active` para "Frete Grátis"
- Botão "GERAR" também para GTIN quando vazio (opcional, mantendo coerência com SKU)
- Grid `grid-cols-3 gap-x-6 gap-y-4`, com separadores sutis `border-t border-sidebar-border/20 pt-4` entre sub-seções e mini-títulos em `text-[10px] font-black uppercase text-primary/70`

## 3. Estado do formulário

Expandir o `useState` `formData` com todos os novos campos e respectivos defaults. Atualizar `handleSubmit` automaticamente (já usa spread `...formData`).

## 4. Fora de escopo

- Não mexer no bloco "Textos do Produto", "Análise de Concorrentes" nem em listagens/outras telas.
- Não alterar lógica de keywords, concorrentes, salvamento ou navegação.
- Não tocar em Kits/Anúncios.

## Confirmação necessária

Antes de implementar:
1. Confirma a criação da migração com os ~21 campos acima na tabela `products`?
2. Manter os campos antigos `weight_g` e `dimensions` apenas como legado (sem mostrar no form), usando os novos `net_weight_g` / `gross_weight_g` / `width` / `height` / `depth`?
