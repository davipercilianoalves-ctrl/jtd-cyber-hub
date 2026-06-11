## Plano: Sidebar Hover-to-Open + JTD em estilo Cyber Acid

### Problemas atuais
1. Sidebar abre/fecha por clique no chevron — usuário quer auto abrir/fechar por **proximidade do mouse**.
2. Logo "JTD" está em caixa rosa sólida + texto "Gestão" ao lado — usuário quer voltar ao estilo **gradient Cyber Acid** (lime → cyan, como na tela de login) **sem o "Gestão"**.
3. Quando colapsada, o layout fica bugado: ícones desalinhados, breadcrumb se sobrepõe ao logo.
4. Toggle manual (chevron) fica visualmente quebrado.

### Solução

**1. Comportamento hover (sem bugar)**
- Sidebar fixa em `position: fixed` ocupando largura colapsada (64px) como espaço reservado no layout.
- Ao `onMouseEnter` na aside → expande para 220px **sobrepondo** o conteúdo (sem empurrar layout, evita reflow/bug).
- Ao `onMouseLeave` → recolhe de volta a 64px.
- Debounce de ~150ms no fechamento para não piscar se o mouse sair brevemente.
- Transição suave `transition-[width] duration-300 ease-out`.
- Remover botão chevron toggle (não é mais necessário).

**2. Logo JTD estilo Cyber Acid**
- Substituir caixa rosa por texto "JTD" usando classe `jtd-text-gradient` já existente (lime → cyan).
- Tamanho grande e bold (`text-3xl font-extrabold`), centralizado quando colapsado.
- Remover label "Gestão" ao lado.
- Quando colapsado: mostra apenas "JTD" centralizado em fonte menor (`text-xl`).
- Quando expandido: "JTD" maior (`text-3xl`) à esquerda.

**3. Layout sem bugs no estado colapsado**
- Container do logo com `justify-center` quando colapsado, `justify-start px-4` quando expandido.
- Ícones de navegação: `justify-center` quando colapsado (não `gap-3` quebrado).
- Footer (avatar do usuário): mesma regra — só avatar centralizado quando colapsado.
- Reservar espaço no Layout.tsx: o `<Sidebar />` ocupa 64px fixos; sidebar real é `fixed` por cima.

**4. Detalhes técnicos**
- `Sidebar.tsx`: trocar `useState(collapsed)` por `useState(isHovered)` controlado por mouse events.
- Adicionar `<div className="w-16 shrink-0" aria-hidden />` como spacer no Layout para manter o conteúdo no lugar.
- Aside vira `fixed left-0 top-0 h-screen z-40` com width animada.
- Manter cores `bg-sidebar`, `border-sidebar-border`, ativos com `text-[var(--lime)]` em vez de hex hardcoded.

### Arquivos a modificar
- `src/components/layout/Sidebar.tsx` — refatorar logo, hover behavior, remover chevron, alinhamento colapsado.
- `src/components/layout/Layout.tsx` — adicionar spacer de 64px para sidebar fixa.

### Não muda
- Lista de rotas (Dashboard, Produtos, Anúncios, Kits, Métricas, Fornecedores, Vendas, Compras, API, Configuração).
- Tokens de tema, paleta Cyber Acid.
- Outras telas/funcionalidades.
