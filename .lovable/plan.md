# Reorganização do ProdutoForm + UX de Palavras-Chave

Escopo: somente `src/pages/Produtos/ProdutoForm.tsx`, `src/components/FloatingKeywordPanel.tsx` e `src/pages/Anuncios/AnuncioForm.tsx` (remoção do bloco de preço). Sem mudar banco nem lógica de salvamento.

## 1. Nova ordem dos blocos no ProdutoForm

```text
1. Informações Básicas (com botão copiar ao lado de cada campo)
2. Palavras-Chave do Produto (lista selecionável + copiar)
3. Análise de Concorrentes (com painéis flutuantes)
4. Textos do Produto (descrição, FAQ, notas)
5. Análise Geral do Produto (substitui a barra fixa)
6. Rodapé com botões Cancelar / Salvar (não-fixo, no fim da página)
```

## 2. Remover barra fixa inferior

- Apagar o `<footer fixed bottom-0 ...>` atual.
- Criar nova seção `jtd-glass` **"Análise Geral do Produto"** no fim do form contendo os mesmos contadores (Keywords cadastradas, Concorrentes analisados, Faixa de Preço Min/Med/Max) em layout de cards horizontais com o visual Acid Cyber (mesmas cores verde/ciano/magenta usadas em concorrentes).
- Botões **Cancelar** e **Salvar Produto** passam para uma barra normal logo abaixo dessa análise (não fixa), mantendo o mesmo estilo dos botões atuais.

## 3. Preço: mover de Anúncios para Produtos

- Em `src/pages/Anuncios/AnuncioForm.tsx`: remover qualquer bloco/campo de precificação do anúncio (preço sugerido, preço do anúncio, etc.). Manter restante intacto.
- Em Produtos: a sub-seção **Preço** já existe em Informações Básicas (Preço de Venda, Custo, Listas) — confirmar que cobre o que era exibido nos anúncios. Sem novos campos no schema.

## 4. Ícone de copiar em cada campo das Informações Básicas

- Adicionar componente local `CopyButton` (ícone `Copy` da lucide-react, 14px) à direita de cada input/select/textarea das 6 sub-seções (Identificação, Classificação, Preço, Códigos Fiscais, Logística, Dimensões & Peso).
- Implementação: wrapper `relative`, botão `absolute right-2 top-1/2`, on click → `navigator.clipboard.writeText(value)` + `toast.success("Copiado!")`.
- Toggles (Frete Grátis, Ativo) ficam sem botão de copiar.

## 5. Lista de Palavras-Chave melhorada

- Manter chips clicáveis para selecionar.
- Adicionar acima da lista uma barra de ações maior e mais visível com:
  - Contador "X selecionadas de Y"
  - Botão **Selecionar Todas** / **Desmarcar Todas**
  - Botões **COPIAR SELECIONADAS** e **COPIAR TODAS** em destaque (estilo botão primário outline em vez de link texto)
  - Botão **LIMPAR** discreto à direita
- Chips selecionados ficam com fundo `bg-primary text-black` (já existe) — aumentar levemente o tamanho e contraste para melhor visibilidade.

## 6. Painel flutuante de keywords (`FloatingKeywordPanel.tsx`)

Problema atual: fundo opaco que tapa o conteúdo, baixo contraste, pouca mobilidade.

Ajustes:
- Trocar `bg-black/95` por `bg-card` + `backdrop-blur-xl` + `border-2 border-primary` + `shadow-[0_0_40px_rgba(191,255,0,0.3)]` → respeita tema claro/escuro automaticamente.
- Adicionar handle de redimensionar no canto inferior direito (resize via mouse: largura 280–600px, altura 200–600px).
- Limitar arrasto à viewport (clamp x/y para não sair da tela).
- Adicionar botão **Minimizar** (colapsa para apenas header).
- Aumentar contraste dos chips dentro do painel usando as mesmas cores `bg-primary/15 border-primary/40 text-primary`.
- Botão **ENVIAR PARA LISTA DO PRODUTO** ganha destaque maior (já tem, manter).

## 7. Análise Geral do Produto (novo bloco)

Cards em grid `grid-cols-4`:

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ KEYWORDS     │ CONCORRENTES │ FAIXA PREÇO  │ PREÇO VENDA  │
│ X cadastr.   │ X analisados │ R$ min — max │ R$ X,XX      │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

Cada card no padrão Acid Cyber (`jtd-glass`, borda colorida, label uppercase 10px, valor em destaque).

## Fora de escopo

- Não alterar schema do Supabase.
- Não tocar em Kits, Dashboard, Fornecedores, outras telas.
- Não alterar lógica de save, navegação ou keywords (apenas reorganização visual e UX).
