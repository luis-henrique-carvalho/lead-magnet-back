---
title: 'Expor historico paginado de tentativas'
status: 'done'
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

- [x] O endpoint retorna tentativas da task com numero, `jobId`, status, erro, tipo de erro, metadados e timestamps.
- [x] A resposta e paginada e ordenada de forma deterministica, sem carregar todas as tentativas em memoria.
- [x] Parametros de paginacao invalidos retornam HTTP 400 e uma task inexistente retorna HTTP 404.
- [x] Controller, service e repository possuem responsabilidades separadas e contratos tipados.
- [x] Testes de controller com Supertest e testes do repository cobrem resposta, ordenacao, paginacao e erros.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

Foi entregue `GET /automation-tasks/:taskId/attempts` com pagina `{ items, page, limit, total }`. Cada item expoe numero, `jobId`, status, erro, tipo de erro, metadados e timestamps persistidos.

O controller valida e converte `page` e `limit`; o service diferencia task inexistente de historico vazio; o repository usa `count`, `skip` e `take` no banco, ordenando por `startedAt` e numero decrescentes. A consulta nao carrega o agregado completo de `AutomationTask`.

Arquivos principais: modulo `automation-tasks/attempts`, seus DTOs e o registro dos providers em `AutomationTasksModule`.

Validacoes: testes Supertest, service e repository direcionados; suite completa, lint e build NestJS.
