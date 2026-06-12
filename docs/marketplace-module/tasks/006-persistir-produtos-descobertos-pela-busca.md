---
title: 'Persistir produtos descobertos pela busca'
status: 'done'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by:
  ['docs/marketplace-module/tasks/005-processar-busca-de-produtos-em-worker.md']
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Adicionar persistencia minima para produtos descobertos por marketplace e fazer o worker salvar os produtos retornados pelos providers antes de concluir a task.

## Acceptance criteria

- [x] O schema Prisma possui modelo para produto descoberto com marketplace, URL original, titulo, preco e dados opcionais.
- [x] Produtos sao relacionados ao `searchId` ou entidade equivalente da busca.
- [x] O worker salva os produtos normalizados retornados pelo provider.
- [x] A task concluida informa `foundCount` e `savedCount`.
- [x] Reprocessar uma busca nao cria duplicatas para o mesmo marketplace e URL externa.
- [x] Ha testes cobrindo salvamento e deduplicacao basica.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Result

Adicionada persistencia transacional para os produtos normalizados retornados
pelos providers. O schema separa o produto canonico (`MarketplaceProduct`) do
vinculo com cada execucao (`MarketplaceProductSearchResult`), preservando o
historico de `searchId` sem duplicar produtos entre buscas.

A deduplicacao do produto usa a constraint unica `marketplace + originalUrl`.
Cada vinculo usa a constraint `searchId + productId`. O repository executa os
upserts e a criacao dos vinculos na mesma transacao Prisma; assim, reprocessar
o mesmo job atualiza os dados normalizados e nao cria novos registros ou
vinculos. `savedCount` representa quantos produtos foram associados pela
primeira vez aquela busca, enquanto `foundCount` continua representando a
quantidade retornada pelo provider.

O worker agora persiste os produtos antes de marcar a `AutomationTask` como
`completed`. Falhas de persistencia seguem o tratamento de falha generica do
worker e sao relancadas para o mecanismo de retry do BullMQ.

Arquivos principais:

- `prisma/schema.prisma` e migration
  `20260612030000_add_marketplace_products`: modelos, indices, constraints e
  relacionamento de descoberta.
- `src/modules/marketplaces/products/marketplace-products.service.ts`: limite
  de aplicacao usado pelo worker.
- `src/modules/marketplaces/products/marketplace-products.repository.ts`:
  contrato de persistencia injetado por token.
- `src/modules/marketplaces/products/prisma-marketplace-products.repository.ts`:
  upsert e associacao idempotente em transacao.
- `src/modules/marketplaces/jobs/marketplace-product-search/marketplace-product-search.processor.ts`:
  persistencia antes da conclusao e retorno de `savedCount`.

Limite desta entrega: nao foi criada uma API de consulta dos produtos
persistidos. A task cobre somente a gravacao e o relacionamento necessario ao
fluxo assincrono de busca.

Validacao executada:

- `pnpm exec prisma format`
- `pnpm exec prisma generate`
- `pnpm lint`
- `pnpm build`
- `pnpm test --runInBand` com 31 testes aprovados em 10 suites

## Blocked by

- `docs/marketplace-module/tasks/005-processar-busca-de-produtos-em-worker.md`
