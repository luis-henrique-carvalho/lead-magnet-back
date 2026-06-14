---
title: 'Expor historico paginado de tentativas'
status: 'needs-triage'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [11, 12, 13, 14, 15, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Expor `GET /automation-tasks/:taskId/attempts` para consultar o historico persistido de tentativas sem carregar toda a task. A consulta deve usar DTO de resposta, ordenar tentativas da mais recente para a mais antiga e aceitar paginacao validada.

## Acceptance criteria

- [ ] O endpoint retorna tentativas da task com numero, `jobId`, status, erro, tipo de erro, metadados e timestamps.
- [ ] A resposta e paginada e ordenada de forma deterministica, sem carregar todas as tentativas em memoria.
- [ ] Parametros de paginacao invalidos retornam HTTP 400 e uma task inexistente retorna HTTP 404.
- [ ] Controller, service e repository possuem responsabilidades separadas e contratos tipados.
- [ ] Testes de controller com Supertest e testes do repository cobrem resposta, ordenacao, paginacao e erros.
- [ ] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.
