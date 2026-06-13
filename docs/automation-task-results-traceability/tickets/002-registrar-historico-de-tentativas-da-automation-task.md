---
title: "Registrar historico de tentativas da AutomationTask"
status: "needs-triage"
type: "AFK"
parent: "docs/automation-task-results-traceability/prd.md"
blocked_by: []
user_stories: [11, 12, 13, 14, 15, 16, 17]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `AutomationTaskAttempt` para persistir cada execucao efetiva da task, mantendo numero da tentativa, `jobId` do BullMQ, status, erro, tipo de erro, timestamps e metadados tecnicos sem sobrescrever o historico anterior.

## Acceptance criteria

- [ ] Cada inicio de processamento cria uma tentativa nova e persistida.
- [ ] Cada tentativa guarda `jobId`, status, erro, tipo de erro e timestamps proprios.
- [ ] A task continua expondo um resumo agregado rapido para leitura.
- [ ] A consulta da task exibe o historico completo de tentativas.

## Blocked by

None - can start immediately.
