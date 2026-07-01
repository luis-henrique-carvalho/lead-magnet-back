---
title: 'Consultar recorrencia de produto entre buscas'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by:
  - 'docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md'
user_stories: [7]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Expor `GET /marketplace-products/:productId/searches` para consultar em quais buscas relacionais um produto canonico foi encontrado, preservando a data de descoberta e permitindo analisar sua recorrencia ao longo do tempo.

## Acceptance criteria

- [x] O endpoint retorna as buscas relacionadas ao produto com `searchId`, `taskId`, parametros resumidos e data de descoberta.
- [x] A resposta e paginada e ordenada da descoberta mais recente para a mais antiga.
- [x] Resultados legados sem `searchId` relacional nao recebem associacoes inferidas e sao tratados explicitamente no contrato.
- [x] Um produto inexistente retorna HTTP 404 e um produto sem buscas retorna uma lista vazia.
- [x] Testes de controller e repository cobrem recorrencia, paginacao, legado e erros.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md`

## Result

Foi entregue `GET /marketplace-products/:productId/searches`, com buscas resumidas, `taskId` e `discoveredAt`, paginadas e ordenadas por descoberta e id decrescentes.

O repository filtra somente associacoes cujo `searchId` e relacionalmente preenchido. Registros com apenas `legacySearchId` nao sao inferidos; a resposta explicita essa decisao com `legacyAssociationsExcluded: true`. Produto existente sem recorrencia retorna pagina vazia, enquanto produto inexistente retorna HTTP 404.

Arquivos principais: `MarketplaceProductsController`, `MarketplaceProductSearchesResponseDto`, service e repository de produtos. Controller, regra HTTP e persistencia permanecem separados por responsabilidade.

Validacoes: testes Supertest e de repository cobrindo paginacao, ordenacao, legado, vazio e 404; suite completa com 96 testes, lint sem erros e build NestJS.
