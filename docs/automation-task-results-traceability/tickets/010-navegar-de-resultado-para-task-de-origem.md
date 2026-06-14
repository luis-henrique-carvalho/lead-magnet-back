---
title: 'Navegar de resultado para task de origem'
status: 'needs-triage'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by:
  - 'docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md'
user_stories: [2]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Expor `GET /marketplace-search-results/:resultId/task` para navegar de uma descoberta especifica ate a busca e a `AutomationTask` que a produziram, usando somente relacoes persistidas e sem correlacionar identificadores por JSON.

## Acceptance criteria

- [ ] O endpoint retorna o identificador do resultado, a busca relacionada e o resumo da task de origem.
- [ ] A consulta navega pelas foreign keys `result -> search -> task` em uma unica operacao de repository.
- [ ] Resultado inexistente retorna HTTP 404 e resultado legado sem busca relacional retorna resposta de conflito ou ausencia documentada, sem inferencia.
- [ ] O contrato usa DTO de resposta e nao expoe modelos Prisma diretamente.
- [ ] Testes de controller e repository cobrem resultado relacional, resultado legado e recurso inexistente.
- [ ] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid graph TD caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md`
