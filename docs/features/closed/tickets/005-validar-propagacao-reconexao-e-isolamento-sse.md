---
title: "Validar propagação, reconexão e isolamento SSE"
status: "needs-triage"
type: "AFK"
parent: "conversation"
blocked_by: ["docs/tickets/003-publicar-eventos-do-ciclo-de-vida-de-buscas.md", "docs/tickets/004-publicar-eventos-do-ciclo-de-vida-de-capturas-afiliadas.md"]
user_stories: [91, 92, 94, 95, 96]
---

## Parent

Especificação definida na conversa sobre a integração SSE do fluxo de descoberta de produtos.

## What to build

Validar o fluxo SSE completo em condições próximas da execução real: publicação após persistência, propagação Redis entre processos, autenticação, heartbeat, queda de conexão e retomada apoiada por reconciliação REST.

## Acceptance criteria

- [ ] Um evento publicado por um processo ou worker é recebido pelo stream mantido em outra instância HTTP através do Redis.
- [ ] Os testes verificam headers SSE, retry, heartbeat, IDs únicos e formato dos eventos de busca e captura.
- [ ] Conexões sem sessão válida são rejeitadas e conexões autenticadas respeitam a regra de isolamento definida no ticket 001.
- [ ] A desconexão do cliente encerra subscriptions e timers; uma nova conexão volta a receber eventos sem duplicar listeners.
- [ ] O cenário de evento perdido demonstra que os endpoints REST retornam o estado persistido atual para permitir reconciliação no frontend.
- [ ] A suíte documenta as dependências externas necessárias, incluindo Redis, e pode ser executada de forma determinística no ambiente de testes.
- [ ] A seção `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicável, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicável e necessário), decisões e limites relevantes e as validações executadas.

## Blocked by

- `docs/tickets/003-publicar-eventos-do-ciclo-de-vida-de-buscas.md`
- `docs/tickets/004-publicar-eventos-do-ciclo-de-vida-de-capturas-afiliadas.md`
