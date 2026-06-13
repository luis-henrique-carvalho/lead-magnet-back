---
title: "Modelar dependencias direcionadas entre AutomationTasks"
status: "needs-triage"
type: "AFK"
parent: "docs/automation-task-results-traceability/prd.md"
blocked_by: []
user_stories: [25, 26, 27, 28, 29, 30, 31, 32]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `AutomationTaskDependency` como relacao dirigida entre tasks predecessoras e sucessoras, com validacao de duplicidade, autorreferencia e ciclos, e com consulta clara do que ainda bloqueia uma task.

## Acceptance criteria

- [ ] E possivel registrar uma dependencia entre duas tasks persistidas.
- [ ] Uma task sucessora pode depender de mais de uma predecessora.
- [ ] Dependencias duplicadas e autorreferencias sao rejeitadas.
- [ ] A API ou service de consulta informa quais predecessoras ainda impedem a liberacao.

## Blocked by

None - can start immediately.
