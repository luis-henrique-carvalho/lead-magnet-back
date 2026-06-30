---
title: "Filtrar historico de buscas por query, marketplace e status"
status: "completed"
type: "AFK"
parent: "docs/marketplace-search-history/prd.md"
blocked_by: ["docs/marketplace-search-history/tickets/001-expor-historico-paginado-de-buscas-de-marketplace.md"]
user_stories: [5, 6, 7, 13, 15]
---

## Parent

`docs/marketplace-search-history/prd.md`

## What to build

Adicionar filtros combinaveis ao `GET /marketplace-searches` para permitir consultar o historico por termo da busca, marketplace e status da `AutomationTask`. Os filtros devem preservar paginacao, total e ordenacao padrao por buscas mais recentes.

## Acceptance criteria

- [x] O endpoint aceita filtro `query` e retorna buscas cujo termo salvo corresponde ao valor informado.
- [x] O endpoint aceita filtro `marketplace` e rejeita valores fora do enum de marketplaces suportados.
- [x] O endpoint aceita filtro `status` e rejeita valores fora do enum de status de `AutomationTask`.
- [x] Filtros `query`, `marketplace` e `status` podem ser combinados na mesma requisicao.
- [x] Filtros combinados preservam `page`, `limit`, `total` e ordenacao padrao.
- [x] Filtro sem resultados retorna HTTP 200 com `items: []` e `total: 0`.
- [x] Parametros desconhecidos ou invalidos sao rejeitados de acordo com a validacao global usada pelo modulo.
- [x] Testes de controller cobrem filtros validos, filtros invalidos e combinacao de filtros.
- [x] Testes de repository cobrem where clauses por termo, marketplace, status e combinacoes relevantes.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-search-history/tickets/001-expor-historico-paginado-de-buscas-de-marketplace.md`

## Result

### Comportamento Entregue
Implementado filtros combináveis opcionais (`query`, `marketplace`, `status`) para a rota `GET /marketplace-searches` mantendo a paginação e ordenação padrão.

### Arquivos e Contratos
1. **[marketplace-search-history-query.dto.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/dto/marketplace-search-history-query.dto.ts)**:
   - Adicionada validação de schema usando `class-validator` e `IsEnum` para os parâmetros `marketplace` e `status`.
   - Adicionada validação de comprimento máximo e tipo string para o parâmetro `query`.
2. **[prisma-marketplace-product-searches.repository.ts](file:///home/luis/Documentos/Git/lead_magnet/lead-magnet-back/src/modules/marketplaces/searches/prisma-marketplace-product-searches.repository.ts)**:
   - Onde o objeto `filters` contendo `query`, `marketplace`, e `status` é desestruturado e mapeado diretamente para a query `where` do Prisma:
     - `query`: `{ contains: filters.query, mode: 'insensitive' }`
     - `marketplace`: `filters.marketplace`
     - `status` (Mapeado no relacionamento da task): `{ task: { status: filters.status } }`

### Validações Executadas
- Testes unitários do Prisma repository garantindo que os filtros de termo de busca (case-insensitive), canal de marketplace e status da task gerem a cláusula query do Prisma de forma correta.
- Testes de controller cobrindo a rejeição de query-params desconhecidos ou com valores fora dos enums (`AutomationTaskStatus` e `Marketplace`).
- Validação end-to-end de filtros corretos na rota HTTP de busca.
