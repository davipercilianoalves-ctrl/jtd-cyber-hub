# JTD | Última atualização: 19/06/2026

## Etapas MVP
- [x] Etapa 0: Base + Auth + Design System — CONCLUÍDA
- [x] Etapa 1: Fornecedores — CONCLUÍDA
- [x] Etapa 2: Produtos — CONCLUÍDA
- [x] Etapa 3: Anúncios — CONCLUÍDA
- [x] Etapa 4: Kits — CONCLUÍDA
- [x] Etapa 5: API Mercado Livre — CONCLUÍDA
- [x] Etapa 6: Dashboard — CONCLUÍDA

## Pós-MVP
- [x] Aba Vendas — CONCLUÍDA
- [x] Aba Métricas — EM DESENVOLVIMENTO
- [x] Upgrade Produtos — CONCLUÍDA
  - [x] Galeria de imagens por produto (upload, visualização, download, exclusão)
  - [x] Bucket product-images criado
- [x] Upgrade Anúncios — CONCLUÍDA
  - [x] Keywords com sistema híbrido auto+manual
  - [x] 3 pílulas fixas (Títulos agrupado + BD + DC)
  - [x] Faixa de keywords abaixo das descrições
  - [x] Descrição Completa adicionada
  - [x] Imagens do produto vinculado com seleção
  - [x] Imagens próprias do anúncio (upload + reordenação + drag&drop)
  - [x] Seção de vídeo completa (upload + roteiro + link + embed YouTube)
  - [x] Buckets ad-images e ad-videos criados

## Ferramentas configuradas
- [x] Lovable + Supabase + GitHub
- [x] API Mercado Livre (OAuth + Edge Functions)

## Tabelas no Supabase
- [x] suppliers, products, product_competitors
- [x] ads, kits, kit_products
- [x] ml_tokens, sale_overrides, metrics_cache
- [x] product_images (RLS ativo)
- [x] ad_images (RLS ativo)

## Buckets no Storage
- [x] product-images (privado)
- [x] ad-images (privado)
- [x] ad-videos (privado)

## Próximas etapas em ordem
1. Upgrade aba Kits
2. Finalizar Tab Custos & Receita + restaurar VIEW 3
3. Integrar vinculação ML × App em Configurações
4. Aba Mensagens
5. Aba Compras
