---
title: 'Criar persistencia e status de AutomationTask'
status: 'done'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by: []
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Criar o modulo `automation-tasks` para registrar tarefas de automacao, acompanhar status, resultado e erro, e expor consulta por `taskId`.

## Acceptance criteria

- [x] Existem enums de status, tipo de task e tipo de erro de automacao.
- [x] O schema Prisma possui persistencia minima para `AutomationTask`.
- [x] O service cria tasks como `pending` e permite marcar `processing`, `completed`, `partial`, `failed` e `manual_required`.
- [x] `GET /automation-tasks/:id` retorna status, `statusUrl`, resultado, erro e tipo de erro quando existirem.
- [x] Ha testes cobrindo criacao, consulta e transicoes principais de status.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Result

Implementado o feature module `automation-tasks` no backend, com controller,
service, contrato de repository e implementacao Prisma. O service centraliza a
criacao e as transicoes de status, incrementa tentativas ao iniciar o
processamento e registra timestamps de inicio e conclusao.

O schema Prisma agora persiste tipo, marketplace, status, resultado, erro, tipo
de erro, tentativas e timestamps da task. A migration
`20260612011535_add_automation_task` foi criada e aplicada.

`GET /automation-tasks/:id` devolve um DTO publico com `statusUrl`, resultado e
informacoes de erro, e responde HTTP `404` para ids inexistentes.

Validacao executada:

- `pnpm lint`
- `pnpm test --runInBand` com 27 testes aprovados
- `pnpm build`
- `pnpm exec prisma migrate status`

## Blocked by

None - can start immediately.
