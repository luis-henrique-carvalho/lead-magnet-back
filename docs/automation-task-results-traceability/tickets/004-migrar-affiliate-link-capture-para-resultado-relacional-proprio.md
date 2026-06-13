---
title: "Migrar affiliate-link-capture para resultado relacional proprio"
status: "needs-triage"
type: "AFK"
parent: "docs/automation-task-results-traceability/prd.md"
blocked_by:
  - "docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md"
user_stories: [21, 23, 24, 36, 37, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Substituir o uso de JSON generico como fonte de verdade do resultado de `affiliate_link_capture` por uma entidade 1:1 propria ligada a `AutomationTask`, preservando o contrato publico de consulta enquanto o armazenamento passa a ser relacional.

## Acceptance criteria

- [ ] O resultado da captura de link fica persistido em tabela propria ligada a task.
- [ ] A consulta publica de task continua retornando um resumo coerente do resultado.
- [ ] O fluxo de escrita salva o resultado relacional antes de concluir a task.
- [ ] O padrao fica reutilizavel para outros tipos de automacao com resultado proprio.

## Blocked by

- `docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md`
