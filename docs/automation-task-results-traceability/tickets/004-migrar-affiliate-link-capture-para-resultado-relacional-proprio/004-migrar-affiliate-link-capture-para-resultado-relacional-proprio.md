---
title: 'Migrar affiliate-link-capture para resultado relacional proprio'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by:
  - 'docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md'
user_stories: [21, 23, 24, 36, 37, 40]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Substituir o uso de JSON generico como fonte de verdade do resultado de `affiliate_link_capture` por uma entidade 1:1 propria ligada a `AutomationTask`, preservando o contrato publico de consulta enquanto o armazenamento passa a ser relacional.

## Acceptance criteria

- [x] O resultado da captura de link fica persistido em tabela propria ligada a task.
- [x] A consulta publica de task continua retornando um resumo coerente do resultado.
- [x] O fluxo de escrita salva o resultado relacional antes de concluir a task.
- [x] O padrao fica reutilizavel para outros tipos de automacao com resultado proprio.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/tickets/001-persistir-buscas-de-marketplace-como-entidade-relacional.md`

## Result

`AffiliateLinkCaptureResult` e a fonte relacional do resultado da captura. O processor persiste por um repository dedicado antes de marcar a task como concluida, e a consulta publica projeta o mesmo formato anterior a partir da relacao.

Quando o produto canonico existe, a captura tambem recebe a foreign key; o identificador de entrada continua preservado em `sourceProductId` para compatibilidade e auditoria.
