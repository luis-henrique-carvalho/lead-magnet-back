---
title: "Backfill e compatibilidade com dados legados"
status: "needs-triage"
type: "HITL"
parent: "docs/automation-task-results-traceability/prd.md"
blocked_by:
  - "docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md"
  - "docs/tickets/004-migrar-affiliate-link-capture-para-resultado-relacional-proprio.md"
user_stories: [20, 35, 38, 39, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Executar a migracao aditiva dos dados legados para o novo modelo relacional apenas quando a correlacao puder ser comprovada, mantendo registros nao inferiveis como legado e formalizando a politica de compatibilidade e retencao.

## Acceptance criteria

- [ ] Dados correlacionaveis sao migrados para as novas tabelas sem heuristica.
- [ ] Registros sem correlacao segura permanecem identificados como legado.
- [ ] O contrato de leitura continua funcionando durante a transicao.
- [ ] A politica de exclusao/retencao fica explicitada para o time.

## Blocked by

- `docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md`
- `docs/tickets/004-migrar-affiliate-link-capture-para-resultado-relacional-proprio.md`
