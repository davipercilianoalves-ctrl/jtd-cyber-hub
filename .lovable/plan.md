## Goal
Substituir o input único "Custo do Produto" na aba **Custos** da Precificação Inteligente do Kit por uma visão multi-produto: um card por produto do kit (com frete e embalagem individuais) + custos compartilhados do kit. O custo total resultante alimenta todas as outras abas (Resumo, Relatório, Simulações, etc.) sem mudar nenhuma lógica de cálculo.

## Escopo

Mudanças apenas em:
- `src/pages/Kits/KitForm.tsx` (estado + passagem de props ao `PricingModule`)
- `src/components/pricing/PricingModule.tsx` (nova variação da `CostsTab` para kits)
- Migration: nova coluna `product_costs JSONB` em `kits`

Nenhuma alteração em Produtos, Anúncios ou outras abas do app. Lógica de cálculo do `engine.ts` (preço ideal, mínimo, lucro, margem, etc.) permanece intacta — o motor continua recebendo `costs` como uma lista plana de itens fixos; nós apenas mudamos COMO essa lista é montada quando estamos num kit.

## Modelo de dados

Migration:
```sql
ALTER TABLE public.kits
  ADD COLUMN IF NOT EXISTS product_costs JSONB NOT NULL DEFAULT '{}'::jsonb;
```

Forma persistida em `kits.product_costs`:
```
{
  "<product_id>": { "frete": number, "embalagem": number }
}
```

Custos compartilhados (Transporte, Armazenagem, Custo Operacional, extras) continuam vivendo em `kits.pricing.costs` como hoje.

## UI — Aba Custos (modo Kit)

A `CostsTab` ganha um modo "kit" controlado por uma nova prop opcional no `PricingModule`:

```
<PricingModule
  ...
  kitItems={kitItems}            // [{ product_id, name, cost_price, quantity }]
  productCosts={formData.product_costs}
  onProductCostsChange={(next) => setFormData({ ...formData, product_costs: next })}
/>
```

Se `kitItems` for fornecido, a aba renderiza a versão kit; senão, a versão atual de produto único (mantém compatibilidade com `ProdutoForm`).

Layout da aba (modo kit):

1. **Um card por produto** (accordion, aberto por padrão):
   - Cabeçalho: `▼ Nome — Nx   Subtotal: R$ X`
   - Linha read-only: `Custo unitário: R$ X × N = R$ X` (vem de `kitItems[i].cost_price` × `quantity`)
   - Inputs editáveis: `Frete (R$)`, `Embalagem (R$)` — gravados em `product_costs[product_id]`
   - Subtotal do card = `cost_price × qty + frete + embalagem`

2. **Bloco "Custos compartilhados do kit"** abaixo:
   - Renderiza apenas itens de `value.costs` cujo `name` ∈ {Transporte, Armazenagem, Custo Operacional} + qualquer custo extra adicionado.
   - Itens com nome `Custo do Produto`, `Frete`, `Embalagem` ficam escondidos (gerenciados pelos cards de produto).
   - Botão `+ Novo Custo` mantém comportamento atual.

3. **Rodapé**:
   ```
   Subtotal produtos:       R$ X
   Custos compartilhados:   R$ X
   ──────────────────────────────
   CUSTO TOTAL DO KIT:      R$ X   (verde, bold)
   ```

4. **Sem produtos no kit**: mensagem orientativa — "Adicione produtos na composição do kit para ver os custos detalhados". Bloco de compartilhados continua disponível.

## Integração com o motor de cálculo

Para evitar duplicar lógica, o `KitForm` sincroniza `pricing.costs` toda vez que `kitItems` ou `product_costs` mudam:

- Mantém os custos compartilhados como estão.
- Substitui o item builtin `Custo do Produto` por um único item agregado `Produtos do Kit` cujo `value` = soma de (`cost_price × qty`) de todos os produtos.
- Substitui os builtins `Frete` e `Embalagem` por agregados cujo `value` = soma dos respectivos campos em `product_costs`.

Resultado: `computePricing()` continua vendo uma lista de custos fixos somando o mesmo total, então Resumo/Relatório/Simulações funcionam sem nenhuma mudança.

## Persistência

- `handleSubmit` já salva todo `formData` em `kits`; basta incluir `product_costs` no payload (nada a fazer além da migration).
- Ao carregar (`fetchKit`), `product_costs` vem do banco; default `{}` cobre kits antigos.
- Quando um produto é removido da composição, sua entrada em `product_costs` é limpa.

## Checklist final

- [ ] Migration `product_costs JSONB` aplicada em `kits`
- [ ] Card por produto com frete/embalagem editáveis e subtotal correto
- [ ] Bloco de custos compartilhados separado, com botão +Novo Custo
- [ ] Rodapé com Custo Total destacado
- [ ] Resumo/Relatório/Simulações refletem o novo total automaticamente
- [ ] Mensagem orientativa quando não há produtos
- [ ] `ProdutoForm` continua usando a aba Custos no modo antigo
