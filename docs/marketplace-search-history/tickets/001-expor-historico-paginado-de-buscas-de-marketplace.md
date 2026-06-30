---
title: "Expor historico paginado de buscas de marketplace"
status: "completed"
type: "AFK"
parent: "docs/marketplace-search-history/prd.md"
blocked_by: []
user_stories: [1, 2, 3, 4, 8, 9, 10, 11, 12, 14, 15]
---

## Parent

`docs/marketplace-search-history/prd.md`

## What to build

Expor `GET /marketplace-searches` como uma listagem paginada de todas as buscas de marketplace criadas. A resposta deve tratar `MarketplaceProductSearch` como entidade principal, incluir um resumo da `AutomationTask` associada e ordenar por buscas mais recentes primeiro.

Essa fatia entrega o historico sem filtros opcionais. Filtros por `query`, `marketplace` e `status` entram em ticket separado.

## Acceptance criteria

- [x] `GET /marketplace-searches` retorna HTTP 200 com `{ items, page, limit, total }`.
- [x] Cada item retorna `searchId`, `taskId`, `marketplace`, `query`, `category`, `requestedLimit`, `foundCount`, `savedCount`, `createdAt` e `completedAt`.
- [x] Cada item retorna resumo da task associada com `status`, `error`, `errorType`, `startedAt`, `finishedAt` e `updatedAt` quando aplicavel.
- [x] A listagem inclui buscas em todos os estados de task: `pending`, `processing`, `completed`, `partial`, `failed` e `manual_required`.
- [x] A ordenacao padrao mostra buscas mais recentes primeiro, com ordenacao secundaria deterministica.
- [x] A paginacao usa os DTOs/pipes existentes e respeita os limites ja usados nas outras listas do modulo.
- [x] Lista sem buscas retorna HTTP 200 com `items: []` e `total: 0`, nao HTTP 404.
- [x] Testes de controller cobrem contrato HTTP, paginacao valida, paginacao invalida e lista vazia.
- [x] Testes de repository cobrem join com `AutomationTask`, ordenacao, paginacao, contadores e estados de task.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

### Comportamento Entregue
Implementado o endpoint `GET /marketplace-searches` com paginação padrão (`page`, `limit`), retornando a lista de buscas de produtos no marketplace junto com um resumo das automações associadas (`AutomationTask`), ordenado decrescentemente por `createdAt`.

### Arquivos e Contratos
1. **[marketplace-product-searches.repository.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/marketplace-product-searches.repository.ts)**:
   - Adicionada a assinatura do método `findAll`.
   - Criados os tipos `MarketplaceProductSearchHistoryItem` e `PaginatedMarketplaceProductSearchHistory`.
2. **[prisma-marketplace-product-searches.repository.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/prisma-marketplace-product-searches.repository.ts)**:
   - Implementado o método `findAll` realizando a consulta paginada com transação no Prisma e ordenação decrescente estável (`createdAt: 'desc', id: 'desc'`). Inclui a tabela `AutomationTask` associada (`include: { task: true }`).
3. **[marketplace-product-searches.service.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/marketplace-product-searches.service.ts)**:
   - Adicionado o método `findAll` para repassar a chamada ao repositório.
4. **[marketplace-product-searches.controller.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/marketplace-product-searches.controller.ts)**:
   - Adicionada a rota `GET /` mapeando os DTOs correspondentes e delegando a execução ao serviço.
5. **[marketplace-product-search-history-response.dto.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/dto/marketplace-product-search-history-response.dto.ts)**:
   - Define a estrutura de dados de retorno da API incluindo o resumo da task.
6. **[marketplace-search-history-query.dto.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/dto/marketplace-search-history-query.dto.ts)**:
   - Recebe e valida os parâmetros de requisição.

### Validações Executadas
- Testes unitários do Prisma repository cobrindo a transação, ordenação determinística e retorno de lista vazia.
- Testes unitários do serviço cobrindo o mapeamento.
- Testes de controller validando o pipeline de validação HTTP e retorno da resposta paginada correta.
