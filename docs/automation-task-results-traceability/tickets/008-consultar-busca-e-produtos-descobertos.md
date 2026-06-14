---
title: 'Consultar busca e produtos descobertos'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [2, 5, 6, 8, 19]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Expor `GET /marketplace-searches/:searchId` com os parametros, contadores e task de origem da busca, alem de `GET /marketplace-searches/:searchId/products` para consultar os produtos descobertos por ordem de descoberta com paginacao.

## Acceptance criteria

- [x] A consulta da busca retorna `searchId`, `taskId`, marketplace, query, categoria, limite solicitado, contadores e timestamps.
- [x] A consulta de produtos retorna a associacao e o produto canonico em ordem deterministica de descoberta.
- [x] A listagem de produtos e paginada no banco e valida seus parametros por DTOs e pipes.
- [x] Uma busca inexistente retorna HTTP 404 nas duas rotas.
- [x] Testes de controller com Supertest e testes do repository cobrem contrato, ordenacao, paginacao e ausencia da busca.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

Foram entregues `GET /marketplace-searches/:searchId` e `GET /marketplace-searches/:searchId/products`. A primeira rota retorna parametros, contadores, timestamps e `taskId`; a segunda retorna a associacao de descoberta e o produto canonico em pagina `{ items, page, limit, total }`.

`PaginationQueryDto` converte e valida `page` e `limit` (limite maximo 100). O repository aplica `skip/take` no banco e ordena produtos por `discoveredAt` e id crescentes. O service diferencia busca ausente de uma busca existente sem produtos e produz HTTP 404 apenas no primeiro caso.

Arquivos principais: `MarketplaceProductSearchesController`, DTOs em `marketplaces/searches/dto`, service e repository de buscas. O endpoint de criacao permanece em `/marketplaces/search`.

Validacoes: testes Supertest e de repository direcionados, suite completa com 96 testes, lint sem erros e build NestJS.
