---
title: 'Persistir buscas de marketplace como entidade relacional'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 18, 19, 20, 33, 34]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `MarketplaceProductSearch` como a entidade de dominio da execucao de busca, ligar `MarketplaceProductSearchResult.searchId` a essa entidade por foreign key e mover para o modelo relacional os parametros, contadores e relacoes que hoje dependem de JSON legado.

## Acceptance criteria

- [x] Existe uma entidade persistida para a busca com `taskId`, `marketplace`, `query`, `category` e `limit`.
- [x] `MarketplaceProductSearchResult.searchId` referencia a busca por foreign key.
- [x] A consulta por `taskId` retorna um resumo da busca com produtos associados sem ler `searchId` de JSON.
- [x] Reprocessar a mesma busca continua idempotente e nao cria resultados duplicados.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

`MarketplaceProductSearch` passou a ser criado na mesma transacao da `AutomationTask`. O job recebe identidades persistidas e o repository de produtos associa resultados por foreign key, atualiza contadores e preserva idempotencia por `(searchId, productId)`.

```mermaid
graph LR
  T[AutomationTask] --> S[MarketplaceProductSearch]
  S --> R[MarketplaceProductSearchResult]
  R --> P[MarketplaceProduct]
```

Arquivos principais: `prisma/schema.prisma`, `marketplace-product-searches.repository.ts`, `prisma-marketplace-product-searches.repository.ts`, `prisma-marketplace-products.repository.ts` e `automation-task-response.dto.ts`.

Validacoes: Prisma format/validate/generate, testes Jest, lint e build.
