---
title: "Processar busca de produtos em worker"
status: "needs-triage"
type: "AFK"
epic: "docs/marketplace-module/epic.md"
parent: "Docs/v2/marktplaces-modules.md"
blocked_by:
  [
    "docs/marketplace-module/tasks/004-configurar-bullmq-e-transformar-busca-em-task-assincrona.md",
  ]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Implementar o processor da fila `marketplace-product-search` para consumir jobs de busca, chamar o provider correto e atualizar a `AutomationTask` conforme sucesso, falha ou necessidade de acao manual.

## Acceptance criteria

- [ ] Existe `MarketplaceProductSearchProcessor` registrado na fila `marketplace-product-search`.
- [ ] Ao iniciar o job, a task e marcada como `processing`.
- [ ] Em sucesso, o provider correto e chamado e a task e marcada como `completed` com contadores de resultado.
- [ ] Erros de CAPTCHA sao mapeados para `manual_required`.
- [ ] Timeouts e erros internos sao mapeados para tipos de erro apropriados e a task e marcada como `failed`.
- [ ] Ha testes cobrindo sucesso, CAPTCHA e falha generica.
- [ ] A secao `Result` documenta o comportamento entregue, os principais arquivos ou contratos, decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/004-configurar-bullmq-e-transformar-busca-em-task-assincrona.md`
