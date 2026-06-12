---
title: "Definir contrato e providers fake de busca de produtos"
status: "done"
type: "AFK"
epic: "docs/marketplace-module/epic.md"
parent: "Docs/v2/marktplaces-modules.md"
blocked_by: []
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Criar a base extensivel do modulo de marketplaces para busca de produtos, com enum de marketplaces, contrato `MarketplaceProductSearchProvider`, providers fake para Mercado Livre e Amazon, e registry que seleciona o provider correto por marketplace.

## Acceptance criteria

- [x] Existe um enum compartilhado de marketplace com pelo menos `mercado_livre`, `amazon` e `shopee`.
- [x] Existe uma interface de provider de busca com `searchProducts` e `getProductDetails`.
- [x] Mercado Livre e Amazon possuem providers fake retornando produtos normalizados e respeitando `limit`.
- [x] O registry retorna o provider correto e falha de forma explicita quando o marketplace nao esta registrado.
- [x] Ha testes cobrindo providers fake e registry.
- [x] A secao `Result` documenta o comportamento entregue, os principais arquivos ou contratos, decisoes e limites relevantes e as validacoes executadas.

## Result

Implemented in `lead-magnet-back/src/modules/marketplaces/providers/`:

- `marketplace-product-search-provider.interface.ts`
- `mercado-livre-product.provider.ts`
- `amazon-product.provider.ts`
- `marketplace-product-provider.registry.ts`
- specs for Mercado Livre provider, Amazon provider, and registry

Also registered the providers and registry in `lead-magnet-back/src/modules/marketplaces/marketplaces.module.ts`.

Validation:

- `pnpm test --runInBand` passed.
- `pnpm build` passed.
- `pnpm lint` passed without errors; one pre-existing warning remains in `src/main.ts`.

## Blocked by

None - can start immediately.
