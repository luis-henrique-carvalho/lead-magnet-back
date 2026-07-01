---
title: 'Modelar dependencias direcionadas entre AutomationTasks'
status: 'done'
type: 'AFK'
parent: 'docs/automation-task-results-traceability/prd.md'
blocked_by: []
user_stories: [25, 26, 27, 28, 29, 30, 31, 32]
---

## Parent

`docs/automation-task-results-traceability/prd.md`

## What to build

Criar `AutomationTaskDependency` como relacao dirigida entre tasks predecessoras e sucessoras, com validacao de duplicidade, autorreferencia e ciclos, e com consulta clara do que ainda bloqueia uma task.

## Acceptance criteria

- [x] E possivel registrar uma dependencia entre duas tasks persistidas.
- [x] Uma task sucessora pode depender de mais de uma predecessora.
- [x] Dependencias duplicadas e autorreferencias sao rejeitadas.
- [x] A API ou service de consulta informa quais predecessoras ainda impedem a liberacao.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

None - can start immediately.

## Result

Foi criada a relacao dirigida `AutomationTaskDependency`. O service rejeita autorreferencias e traduz os resultados de dominio, enquanto o repository valida existencia, duplicidade e ciclos na mesma transacao da gravacao. Um advisory lock do PostgreSQL serializa alteracoes concorrentes no grafo para impedir ciclos como `A -> B` e `B -> A`.

O banco reforca unicidade e autorreferencia. A API oferece `POST /automation-tasks/:id/dependencies` e `GET /automation-tasks/:id/dependencies/pending`, e os testes cobrem as invariantes e a ordem entre lock, validacao e insercao.
