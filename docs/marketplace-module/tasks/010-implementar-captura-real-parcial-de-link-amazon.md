---
title: "Implementar captura real parcial de link Amazon"
status: "needs-triage"
type: "HITL"
epic: "docs/marketplace-module/epic.md"
parent: "Docs/v2/marktplaces-modules.md"
blocked_by:
  [
    "docs/marketplace-module/tasks/008-adicionar-infraestrutura-de-browser-e-sessao-autenticada.md",
  ]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Substituir o provider fake de captura da Amazon por uma implementacao real ou parcial, respeitando o fluxo escolhido para afiliados, sessao autenticada e limitacoes praticas da plataforma.

## Acceptance criteria

- [ ] O fluxo alvo de captura/geracao de link da Amazon foi decidido e documentado no ticket ou na implementacao.
- [ ] O provider da Amazon abre a pagina necessaria em sessao autenticada quando aplicavel.
- [ ] O provider retorna `capturedAffiliateUrl` ou erro mapeavel para `manual_required`/`layout_changed`.
- [ ] Sessao invalida ou bloqueio da plataforma nao derruba o worker sem atualizar a task.
- [ ] O resultado salvo usa diretamente `capturedAffiliateUrl`, sem redirect/tracking proprio.
- [ ] O fluxo foi validado manualmente contra uma conta/sessao real ou fixture aprovada.
- [ ] A secao `Result` documenta o comportamento entregue, os principais arquivos ou contratos, decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/008-adicionar-infraestrutura-de-browser-e-sessao-autenticada.md`
