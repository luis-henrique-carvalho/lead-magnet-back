---
title: 'Expor busca sincrona fake via POST /marketplaces/search'
status: 'done'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by:
  [
    'docs/marketplace-module/tasks/001-definir-contrato-e-providers-fake-de-busca-de-produtos.md',
  ]
user_stories: []
---

## Epic

[Marketplace Module](../epic.md)

## Parent

Referencia ao plano de marketplaces em `Docs/v2/marktplaces-modules.md`.

## What to build

Adicionar um primeiro caminho end-to-end verificavel para busca de produtos, expondo `POST /marketplaces/search` e usando o registry para retornar produtos fake normalizados sem fila ainda.

## Acceptance criteria

- [x] `POST /marketplaces/search` aceita `marketplace`, `query`, `category` e `limit`.
- [x] O controller delega a busca ao service e o service usa o provider selecionado pelo registry.
- [x] A resposta contem produtos normalizados com `marketplace`, `title`, `originalUrl` e campos opcionais.
- [x] Marketplaces sem provider retornam erro HTTP apropriado.
- [x] Ha testes do controller/service cobrindo sucesso e marketplace nao suportado.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Result

Implementado o fluxo sincrono de busca fake em `POST /marketplaces/search`.
O controller valida a entrada e delega a operacao ao `MarketplacesService`, que
seleciona o provider pelo `MarketplaceProductProviderRegistry`, executa a busca
e converte os produtos para o DTO publico de resposta.

### Contrato HTTP

- Campos de entrada:
  - `marketplace`: obrigatorio e limitado aos valores do enum `Marketplace`.
  - `query`: opcional, string com no maximo 200 caracteres.
  - `category`: opcional, string com no maximo 100 caracteres.
  - `limit`: opcional, inteiro entre 1 e 100, com valor padrao `10`.
- Sucesso: HTTP `201` com uma lista de produtos normalizados.
- Request invalida: HTTP `400` por meio do `ValidationPipe` global.
- Marketplace sem provider registrado: HTTP `422`.
- A resposta publica inclui `marketplace`, `title`, `originalUrl` e os campos
  opcionais normalizados. O campo interno `rawData` nao e exposto.

### Arquivos principais

- `lead-magnet-back/src/modules/marketplaces/dto/search-marketplace-products.dto.ts`
- `lead-magnet-back/src/modules/marketplaces/dto/marketplace-product-response.dto.ts`
- `lead-magnet-back/src/modules/marketplaces/marketplaces.controller.ts`
- `lead-magnet-back/src/modules/marketplaces/marketplaces.service.ts`
- `lead-magnet-back/src/main.ts`

Tambem foram adicionadas as dependencias `class-validator` e
`class-transformer` para validacao e transformacao dos DTOs.

### Testes cobertos

- Delegacao do controller para o service.
- Aplicacao do `limit` padrao.
- Rejeicao de payload invalido antes da chamada ao service.
- Retorno HTTP `422` para marketplace sem provider.
- Selecao do provider pelo registry.
- Remocao de `rawData` da resposta publica.

### Validacao

- `pnpm lint` passed.
- `pnpm test --runInBand` passed with 16 tests.
- `pnpm build` passed.

## Blocked by

- `docs/marketplace-module/tasks/001-definir-contrato-e-providers-fake-de-busca-de-produtos.md`
