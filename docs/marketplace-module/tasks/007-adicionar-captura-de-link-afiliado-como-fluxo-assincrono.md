---
title: 'Adicionar captura de link afiliado como fluxo assincrono'
status: 'needs-triage'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by:
  [
    'docs/marketplace-module/tasks/003-criar-persistencia-e-status-de-automation-task.md',
  ]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Criar o modulo `affiliate-link-capture` com contrato de provider, provider fake, registry, controller, service e processor para capturar link afiliado de forma assincrona por task.

## Acceptance criteria

- [ ] `POST /affiliate-link-capture` aceita `productId`, `marketplace` e `originalProductUrl`.
- [ ] A request cria uma `AutomationTask` do tipo `affiliate_link_capture` e enfileira job `capture-affiliate-link`.
- [ ] O processor chama o provider fake e marca a task como `completed` com `capturedAffiliateUrl`.
- [ ] Erros manuais previstos sao mapeados para `manual_required`.
- [ ] A resposta inicial contem `taskId` e `statusUrl`.
- [ ] Ha testes cobrindo criacao do job e processamento de sucesso.
- [ ] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/003-criar-persistencia-e-status-de-automation-task.md`
