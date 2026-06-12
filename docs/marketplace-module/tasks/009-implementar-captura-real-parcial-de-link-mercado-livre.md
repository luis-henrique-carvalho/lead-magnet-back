---
title: "Implementar captura real parcial de link Mercado Livre"
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

Substituir o provider fake de captura do Mercado Livre por uma implementacao real ou parcial usando browser autenticado, seletores validados e tratamento de CAPTCHA, sessao invalida e layout alterado.

## Acceptance criteria

- [ ] O provider do Mercado Livre abre a pagina do produto em sessao autenticada.
- [ ] O fluxo tenta localizar a acao de compartilhar/gerar link afiliado e extrair a URL gerada.
- [ ] CAPTCHA e sessao invalida geram erro mapeavel para `manual_required`.
- [ ] Link nao encontrado gera erro mapeavel para `layout_changed`.
- [ ] O resultado salvo usa diretamente `capturedAffiliateUrl`, sem redirect/tracking proprio.
- [ ] O fluxo foi validado manualmente contra uma conta/sessao real ou fixture aprovada.
- [ ] A secao `Result` documenta o comportamento entregue, os principais arquivos ou contratos, decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/008-adicionar-infraestrutura-de-browser-e-sessao-autenticada.md`
