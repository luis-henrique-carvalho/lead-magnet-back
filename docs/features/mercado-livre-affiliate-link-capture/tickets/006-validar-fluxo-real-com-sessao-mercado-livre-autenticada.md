---
title: 'Validar fluxo real com sessao Mercado Livre autenticada'
status: 'blocked'
type: 'HITL'
parent: 'docs/features/mercado-livre-affiliate-link-capture/prd.md'
blocked_by:
  [
    'docs/features/mercado-livre-affiliate-link-capture/tickets/001-capturar-link-afiliado-mercado-livre-pela-pagina-do-produto.md',
    'docs/features/mercado-livre-affiliate-link-capture/tickets/002-suportar-modal-popup-ou-nova-pagina-na-geracao-afiliada.md',
    'docs/features/mercado-livre-affiliate-link-capture/tickets/003-suportar-gerar-link-id-de-produto-como-fallback.md',
    'docs/features/mercado-livre-affiliate-link-capture/tickets/004-mapear-bloqueios-mercado-livre-para-manual-required.md',
  ]
user_stories: [1, 10, 11, 12, 13, 16, 17, 18, 25, 27]
---

## Parent

Referencia ao PRD `docs/features/mercado-livre-affiliate-link-capture/prd.md`.

## What to build

Executar uma validacao operacional com uma sessao autenticada real do Mercado Livre para confirmar que o fluxo implementado gera link afiliado a partir de uma URL original de produto. Esta fatia e HITL porque depende de conta logada, arquivo de storage state valido, UI externa, CAPTCHA e possiveis variacoes de rollout.

## Acceptance criteria

- [x] Existe um roteiro documentado para preparar ou apontar `.auth/mercadolivre-storage-state.json` sem versionar segredo.
- [ ] Um produto real do Mercado Livre e usado para disparar captura via fluxo assincrono existente.
- [ ] A task chega a `completed` com `capturedAffiliateUrl` quando a sessao e a UI permitem a automacao.
- [ ] Um caso de sessao invalida ou bloqueio manual e verificado ou documentado como comportamento esperado.
- [ ] Qualquer ajuste de seletor descoberto na validacao real e registrado antes de considerar a fatia concluida.
- [x] A validacao nao se torna requisito obrigatorio de CI deterministico.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicacoes sobre conceitos caso necessario, decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/features/mercado-livre-affiliate-link-capture/tickets/001-capturar-link-afiliado-mercado-livre-pela-pagina-do-produto.md`
- `docs/features/mercado-livre-affiliate-link-capture/tickets/002-suportar-modal-popup-ou-nova-pagina-na-geracao-afiliada.md`
- `docs/features/mercado-livre-affiliate-link-capture/tickets/003-suportar-gerar-link-id-de-produto-como-fallback.md`
- `docs/features/mercado-livre-affiliate-link-capture/tickets/004-mapear-bloqueios-mercado-livre-para-manual-required.md`

## Result

### Comportamento entregue

Foi criado um roteiro operacional para validar manualmente a captura real com uma sessao autenticada do Mercado Livre. O roteiro cobre preparacao de `.auth/mercadolivre-storage-state.json`, verificacao visual opcional com Playwright, chamada do endpoint assincrono de captura, consulta da task e criterios de sucesso ou bloqueio manual.

### Bloqueio atual

Esta task permanece `blocked` porque a validacao real exige insumo humano: uma URL real de produto Mercado Livre a ser usada como amostra, confirmacao de que a conta afiliada autenticada pode gerar links no momento da execucao e aceitacao de eventuais desafios externos como CAPTCHA/2FA. Sem essa execucao real, nao e correto marcar os criterios de task `completed` com `capturedAffiliateUrl` como concluidos.

### Principais arquivos e responsabilidades

- `manual-validation.md`: roteiro local de validacao manual da captura afiliada Mercado Livre.
- `.auth/mercadolivre-storage-state.json`: arquivo local de sessao autenticada usado pela automacao, nao versionado.
- `scripts/playwright-ml-save-session.mjs`: utilitario existente para salvar/renovar sessao manualmente.
- `scripts/playwright-ml-playground.mjs`: utilitario existente para inspecionar a UI autenticada do Mercado Livre.

### Decisoes e limites

- A validacao real nao foi adicionada ao CI.
- O roteiro usa `POST /affiliate-link-capture` e `GET /automation-tasks/:id`, preservando o fluxo assincrono real.
- O ticket deve ser desbloqueado quando houver produto real e janela operacional para executar a conta afiliada.

### Validacoes

- Confirmado que existe `.auth/mercadolivre-storage-state.json` no ambiente local.
- Roteiro documentado em `docs/features/mercado-livre-affiliate-link-capture/manual-validation.md`.
- Nao foi executada captura real nesta rodada por falta de URL real de produto e confirmacao humana da conta/sessao.
