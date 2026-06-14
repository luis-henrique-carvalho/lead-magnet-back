---
title: 'Rastrear capturas de afiliado originadas por busca'
status: 'needs-triage'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by:
  - 'docs/automation-task-results-traceability/tickets/007-expor-navegacao-das-dependencias-de-uma-task.md'
  - 'docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md'
user_stories: [25, 27, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Registrar explicitamente a dependencia entre a task de busca e cada task de captura de link afiliado criada a partir dela, e expor `GET /marketplace-searches/:searchId/affiliate-link-capture-tasks`. A navegacao deve usar o grafo persistido de tasks e o resultado relacional de captura, sem inferir origem apenas pelo produto.

## Acceptance criteria

- [ ] Ao criar uma captura originada por uma busca, a dependencia dirigida entre as tasks e persistida antes da liberacao do job sucessor.
- [ ] O endpoint retorna as tasks de captura originadas pela busca com status, produto, URLs e timestamps relevantes.
- [ ] Capturas do mesmo produto sem dependencia com a busca nao aparecem no resultado.
- [ ] A listagem e paginada, evita N+1 e retorna HTTP 404 para busca inexistente.
- [ ] Testes cobrem criacao da dependencia, multiplas capturas, exclusao de falsos positivos e contrato HTTP.
- [ ] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/automation-task-results-traceability/tickets/007-expor-navegacao-das-dependencias-de-uma-task.md`
- `docs/automation-task-results-traceability/tickets/008-consultar-busca-e-produtos-descobertos.md`
