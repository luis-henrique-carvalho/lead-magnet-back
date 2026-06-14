---
title: "Publicar eventos do ciclo de vida de buscas"
status: "needs-triage"
type: "AFK"
parent: "conversation"
blocked_by: ["docs/tickets/002-expor-stream-sse-de-automacoes-via-redis.md"]
user_stories: [19, 20, 92, 95]
---

## Parent

Especificação definida na conversa sobre a integração SSE do fluxo de descoberta de produtos.

## What to build

Publicar notificações `task.created` e `task.updated` para todo o ciclo de vida de uma busca de marketplace. Cada evento deve ser publicado somente após a persistência correspondente e incluir o `searchId` necessário para o frontend reconciliar resumo e produtos.

## Acceptance criteria

- [ ] A criação transacional de task e busca publica `task.created` somente depois do commit, com `taskId`, `searchId`, tipo, status, marketplace e timestamp persistido.
- [ ] As transições para `processing`, `completed`, `partial`, `failed` e `manual_required` publicam `task.updated` após o repositório confirmar a atualização.
- [ ] Eventos terminais representam o estado já consultável por `GET /automation-tasks/:id` e `GET /marketplace-searches/:searchId`.
- [ ] Falha de publicação não faz rollback de uma transição já persistida, mas é registrada de forma observável para diagnóstico e reconciliação REST.
- [ ] Os testes demonstram que nenhuma notificação é publicada antes da persistência ou quando a task não existe.
- [ ] A seção `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicável, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicável e necessário), decisões e limites relevantes e as validações executadas.

## Blocked by

- `docs/tickets/002-expor-stream-sse-de-automacoes-via-redis.md`
