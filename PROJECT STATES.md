PROJECT_STATE.md — Estado atual:

# JTD | Última atualização: 12/06/2026

## Etapas
- [x] Etapa 0: Base + Auth + Design System — CONCLUÍDA
- [x] Etapa 1: Fornecedores — CONCLUÍDA
- [x] Etapa 2: Produtos — CONCLUÍDA
- [x] Etapa 3: Anúncios — CONCLUÍDA
- [x] Etapa 4: Kits — CONCLUÍDA
- [x] Etapa 5: API Mercado Livre — CONCLUÍDA
- [ ] Etapa 6: Dashboard — PENDENTE

## Ferramentas configuradas
- [x] Lovable + Supabase
- [x] Lovable + GitHub
- [x] API Mercado Livre (OAuth + Edge Functions)

## Tabelas criadas no Supabase
- [x] suppliers (RLS ativo)
- [x] products (RLS ativo)
- [x] product_competitors (RLS ativo)
- [x] ads (RLS ativo)
- [x] kits (RLS ativo)
- [x] kit_products (RLS ativo)
- [x] ml_tokens (RLS ativo)

## Edge Functions deployadas
- [x] ml-auth-callback
- [x] ml-refresh-token
- [x] ml-proxy

## Decisões tomadas
- Stack: Lovable + Supabase + GitHub
- Auth: email/senha via Supabase Auth
- API ML: OAuth sem PKCE, somente leitura via proxy seguro
- Client Secret: nunca exposto ao frontend

## Próxima etapa
Etapa 6 — Dashboard
