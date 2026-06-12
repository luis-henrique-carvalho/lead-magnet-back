---
title: 'Adicionar infraestrutura de browser e sessao autenticada'
status: 'needs-triage'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by:
  [
    'docs/marketplace-module/tasks/007-adicionar-captura-de-link-afiliado-como-fluxo-assincrono.md',
  ]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Criar a infraestrutura de browser para automacoes autenticadas, com `PlaywrightService` capaz de abrir paginas por marketplace usando `storageState` carregado de uma fonte controlada.

## Acceptance criteria

- [ ] Playwright esta instalado e encapsulado em um modulo de infra de browser.
- [ ] `PlaywrightService` reutiliza browser, cria contextos isolados e fecha recursos no destroy do modulo.
- [ ] Existe metodo para abrir pagina autenticada por marketplace com `storageState`.
- [ ] A ausencia de credencial/sessao e tratada com erro explicito.
- [ ] Ha testes ou mocks cobrindo criacao de pagina autenticada e encerramento do browser.
- [ ] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/007-adicionar-captura-de-link-afiliado-como-fluxo-assincrono.md`
