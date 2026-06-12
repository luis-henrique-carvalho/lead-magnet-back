---
title: "Persistir produtos descobertos pela busca"
status: "needs-triage"
type: "AFK"
epic: "docs/marketplace-module/epic.md"
parent: "Docs/v2/marktplaces-modules.md"
blocked_by:
  ["docs/marketplace-module/tasks/005-processar-busca-de-produtos-em-worker.md"]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Adicionar persistencia minima para produtos descobertos por marketplace e fazer o worker salvar os produtos retornados pelos providers antes de concluir a task.

## Acceptance criteria

- [ ] O schema Prisma possui modelo para produto descoberto com marketplace, URL original, titulo, preco e dados opcionais.
- [ ] Produtos sao relacionados ao `searchId` ou entidade equivalente da busca.
- [ ] O worker salva os produtos normalizados retornados pelo provider.
- [ ] A task concluida informa `foundCount` e `savedCount`.
- [ ] Reprocessar uma busca nao cria duplicatas para o mesmo marketplace e URL externa.
- [ ] Ha testes cobrindo salvamento e deduplicacao basica.
- [ ] A secao `Result` documenta o comportamento entregue, os principais arquivos ou contratos, decisoes e limites relevantes e as validacoes executadas.

## Blocked by

- `docs/marketplace-module/tasks/005-processar-busca-de-produtos-em-worker.md`
