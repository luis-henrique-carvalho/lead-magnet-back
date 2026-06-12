---
title: 'Processar busca de produtos em worker'
status: 'done'
type: 'AFK'
epic: 'docs/marketplace-module/epic.md'
parent: 'Docs/v2/marktplaces-modules.md'
blocked_by:
  [
    'docs/marketplace-module/tasks/004-configurar-bullmq-e-transformar-busca-em-task-assincrona.md',
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

- [x] Existe `MarketplaceProductSearchProcessor` registrado na fila `marketplace-product-search`.
- [x] Ao iniciar o job, a task e marcada como `processing`.
- [x] Em sucesso, o provider correto e chamado e a task e marcada como `completed` com contadores de resultado.
- [x] Erros de CAPTCHA sao mapeados para `manual_required`.
- [x] Timeouts e erros internos sao mapeados para tipos de erro apropriados e a task e marcada como `failed`.
- [x] Ha testes cobrindo sucesso, CAPTCHA e falha generica.
- [x] A secao `Result` documenta o comportamento entregue, Diagrama Mermaid caso aplicavel, os principais arquivos ou contratos, Responsabilidade de cada arquivo, explicações sobre conceitos (caso aplicavel e necessario), decisoes e limites relevantes e as validacoes executadas.

## Result

Implementado o `MarketplaceProductSearchProcessor` como consumer da fila
`marketplace-product-search`. O processor usa constructor injection para
receber o registry de providers e o `AutomationTasksService`, mantendo a
selecao do marketplace e as transicoes persistidas em seus componentes de
dominio existentes.

Ao receber um job, o worker marca a task como `processing`, seleciona o
provider pelo marketplace e chama `searchProducts` com os filtros do payload.
Em sucesso, tanto o retorno do job quanto o resultado persistido na task usam o
contrato:

```ts
type MarketplaceProductSearchJobResult = {
  searchId: string;
  requestedCount: number;
  foundCount: number;
};
```

CAPTCHA, identificado por mensagem ou codigo `CAPTCHA_REQUIRED`, encerra o job
sem retry e marca a task como `manual_required` com erro
`captcha_required`. Timeouts identificados por mensagem ou codigo `ETIMEDOUT`
sao persistidos como `failed/timeout`. Outros erros sao persistidos como
`failed/internal_error`. Nos dois casos de falha, o erro original e relancado
para que o BullMQ aplique as tentativas e o backoff configurados na task 004.

Arquivos principais:

- `src/modules/marketplaces/jobs/marketplace-product-search.processor.ts`:
  consumo do job, orquestracao da busca e mapeamento de erros.
- `src/modules/marketplaces/jobs/marketplace-product-search.job.ts`: contrato
  tipado do resultado do worker.
- `src/modules/marketplaces/marketplaces.module.ts`: registro do processor no
  feature module.
- `src/modules/marketplaces/jobs/marketplace-product-search.processor.spec.ts`:
  testes isolados de sucesso, CAPTCHA, timeout e falha generica.

Limite desta entrega: os produtos retornados ainda nao sao persistidos. Por
isso o resultado informa `foundCount`, mas nao `savedCount`; persistencia,
deduplicacao e o contador de itens salvos pertencem a task 006.

Validacao executada:

- `pnpm lint`
- `pnpm test --runInBand` com 29 testes aprovados em 9 suites
- `pnpm build`

## Blocked by

- `docs/marketplace-module/tasks/004-configurar-bullmq-e-transformar-busca-em-task-assincrona.md`
