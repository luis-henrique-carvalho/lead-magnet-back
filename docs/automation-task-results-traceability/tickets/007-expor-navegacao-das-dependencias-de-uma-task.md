---
title: 'Expor navegacao das dependencias de uma task'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [26, 27, 28, 29, 32, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Expor `GET /automation-tasks/:taskId/dependencies` para listar predecessoras e `GET /automation-tasks/:taskId/dependents` para listar sucessoras. Cada item deve apresentar a task relacionada, o sentido da relacao, obrigatoriedade e estado atual sem confundir essas consultas com a rota existente de bloqueios pendentes.

## Acceptance criteria

- [x] A rota `dependencies` retorna todas as predecessoras da task, inclusive as ja concluidas.
- [x] A rota `dependents` retorna todas as sucessoras que dependem da task consultada.
- [x] As respostas usam DTOs explicitos e incluem identificador, tipo, status, obrigatoriedade e data da dependencia.
- [x] Uma task inexistente retorna HTTP 404 e listas validamente vazias retornam HTTP 200.
- [x] Consultas Prisma evitam N+1 e testes de controller e repository cobrem os dois sentidos da relacao.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

Foram entregues `GET /automation-tasks/:taskId/dependencies` e `GET /automation-tasks/:taskId/dependents`. O contrato plano informa `taskId`, tipo, status, sentido, obrigatoriedade e data da dependencia; a rota preexistente `dependencies/pending` continua restrita a bloqueios obrigatorios ainda nao concluidos.

O controller trata HTTP, o service converte ausencia em 404 e o repository Prisma carrega task e relacoes com `select` aninhado, sem consulta por item. A ordenacao usa data e id da dependencia para permanecer deterministica. Listas vazias distinguem uma task existente sem relacoes de uma task inexistente.

Arquivos principais: controller/service/repository de `automation-tasks/dependencies` e `AutomationTaskDependencyResponseDto`.

Validacoes: testes direcionados do modulo, suite completa com 96 testes, lint sem erros e build NestJS.
