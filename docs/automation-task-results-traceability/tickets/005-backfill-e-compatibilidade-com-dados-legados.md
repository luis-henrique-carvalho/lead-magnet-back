---
title: 'Backfill e compatibilidade com dados legados'
status: 'done'
type: 'HITL'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by:
  - 'docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md'
  - 'docs/tickets/004-migrar-affiliate-link-capture-para-resultado-relacional-proprio.md'
user_stories: [20, 35, 38, 39, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Executar a migracao aditiva dos dados legados para o novo modelo relacional apenas quando a correlacao puder ser comprovada, mantendo registros nao inferiveis como legado e formalizando a politica de compatibilidade e retencao.

## Acceptance criteria

- [x] Dados correlacionaveis sao migrados para as novas tabelas sem heuristica.
- [x] Registros sem correlacao segura permanecem identificados como legado.
- [x] O contrato de leitura continua funcionando durante a transicao.
- [x] A politica de exclusao/retencao fica explicitada para o time.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md`
- `docs/tickets/004-migrar-affiliate-link-capture-para-resultado-relacional-proprio.md`

## Result

A migration aditiva cria buscas apenas quando `AutomationTask.result.searchId` comprova a correlacao. Associacoes antigas sem correspondencia mantem `legacySearchId` e `searchId` nulo, sem inventar relacoes.

O contrato publico usa primeiro os resultados relacionais e recorre ao JSON legado quando nao existe resultado especifico. Exclusoes de task, busca e produto usam `Restrict` onde o historico nao pode ser perdido silenciosamente; somente associacoes pertencentes a uma busca usam cascade.

Validacoes: schema Prisma validado e client gerado; a aplicacao passou em testes, lint e build.
