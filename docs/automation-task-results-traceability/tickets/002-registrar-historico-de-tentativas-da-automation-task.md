---
title: 'Registrar historico de tentativas da AutomationTask'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [11, 12, 13, 14, 15, 16, 17]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `AutomationTaskAttempt` para persistir cada execucao efetiva da task, mantendo numero da tentativa, `jobId` do BullMQ, status, erro, tipo de erro, timestamps e metadados tecnicos sem sobrescrever o historico anterior.

## Acceptance criteria

- [x] Cada inicio de processamento cria uma tentativa nova e persistida.
- [x] Cada tentativa guarda `jobId`, status, erro, tipo de erro e timestamps proprios.
- [x] A task continua expondo um resumo agregado rapido para leitura.
- [x] A consulta da task exibe o historico completo de tentativas.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

`AutomationTaskAttempt` registra cada consumo efetivo do job. `startAttempt` incrementa o resumo da task e cria a tentativa em transacao; `finishAttempt` encerra a tentativa correspondente ao `jobId` e atualiza o estado agregado.

Arquivos principais: `prisma-automation-tasks.repository.ts`, `automation-tasks.service.ts`, processors de marketplace e affiliate link, e `automation-task-response.dto.ts`.

Validacoes: testes de transicoes, historico exposto na resposta, suite Jest, lint e build.
