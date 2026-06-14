---
title: "Publicar eventos do ciclo de vida de capturas afiliadas"
status: "needs-triage"
type: "AFK"
parent: "conversation"
blocked_by: ["docs/tickets/002-expor-stream-sse-de-automacoes-via-redis.md"]
user_stories: [82, 92, 95]
---

## Parent

Especificação definida na conversa sobre a integração SSE do fluxo de descoberta de produtos.

## What to build

Publicar notificações `task.created` e `task.updated` para capturas de link afiliado, preservando a origem relacional da busca e do produto. O evento deve carregar `searchId` e `productId` quando disponíveis para atualizar a coleção correta no frontend.

## Acceptance criteria

- [ ] `task.created` é publicado somente depois da task, dependência com a busca e enfileiramento da captura estarem concluídos com sucesso.
- [ ] O evento de criação inclui `searchId` quando a captura nasceu de uma busca e inclui o `productId` informado no comando.
- [ ] As transições para `processing`, `completed`, `failed` e `manual_required` publicam `task.updated` após persistência e preservam os identificadores de domínio disponíveis.
- [ ] Capturas sem origem de busca continuam produzindo eventos válidos sem inventar `searchId`.
- [ ] Os testes cobrem captura com busca, captura independente, estados terminais e ausência de publicação para operações rejeitadas.
- [ ] A seção `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicável, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicável e necessário), decisões e limites relevantes e as validações executadas.

## Blocked by

- `docs/tickets/002-expor-stream-sse-de-automacoes-via-redis.md`
