---
title: "Persistir buscas de marketplace como entidade relacional"
status: "needs-triage"
type: "AFK"
parent: "docs/automation-task-results-traceability/prd.md"
blocked_by: []
user_stories: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20, 33, 34]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `MarketplaceProductSearch` como a entidade de dominio da execucao de busca, ligar `MarketplaceProductSearchResult.searchId` a essa entidade por foreign key e mover para o modelo relacional os parametros, contadores e relacoes que hoje dependem de JSON legado.

## Acceptance criteria

- [ ] Existe uma entidade persistida para a busca com `taskId`, `marketplace`, `query`, `category` e `limit`.
- [ ] `MarketplaceProductSearchResult.searchId` referencia a busca por foreign key.
- [ ] A consulta por `taskId` retorna um resumo da busca com produtos associados sem ler `searchId` de JSON.
- [ ] Reprocessar a mesma busca continua idempotente e nao cria resultados duplicados.

## Blocked by

None - can start immediately.
