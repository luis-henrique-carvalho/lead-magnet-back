# Historico de Buscas de Marketplace - Backend

## Problem Statement

O operador da plataforma precisa lembrar e auditar quais buscas de produtos ja foram feitas. Hoje o backend possui consulta por busca individual, produtos descobertos, capturas afiliadas relacionadas e diagnostico por `AutomationTask`, mas nao expoe uma listagem paginada das buscas criadas.

Isso obriga o operador a conhecer previamente um `searchId` ou navegar a partir de links recebidos logo apos a criacao da busca. Quando uma busca falha, fica pendente ou exige acao manual, ela tambem precisa aparecer no historico, porque o historico deve responder "o que foi tentado", nao apenas "o que teve resultado".

A ausencia dessa listagem tambem dificulta o frontend em `/marketplace-searches`, que ja esta posicionado como "Historico de Buscas", mas ainda nao possui contrato de API para carregar dados reais.

## Solution

Expor uma listagem paginada de `MarketplaceProductSearch` em `GET /marketplace-searches`, retornando todas as buscas criadas em ordem decrescente de criacao por padrao.

Cada item deve representar a busca como entidade de negocio e incluir um resumo da `AutomationTask` associada. A API deve permitir filtros por termo da busca, marketplace e status da task, mantendo a acao principal da UI orientada para os detalhes da busca. Diagnostico da task permanece acessivel por `taskId`, mas nao substitui a listagem de buscas.

## User Stories

1. As an operador da plataforma, I want listar todas as buscas criadas, so that eu consiga lembrar o que ja tentei pesquisar.
2. As an operador da plataforma, I want ver buscas pendentes e em processamento, so that eu acompanhe automacoes recentes sem depender do link inicial.
3. As an operador da plataforma, I want ver buscas concluidas, so that eu reabra seus produtos descobertos.
4. As an operador da plataforma, I want ver buscas falhas e com acao manual requerida, so that eu investigue problemas operacionais.
5. As an operador da plataforma, I want filtrar por termo da busca, so that eu encontre historicos relacionados a uma intencao comercial.
6. As an operador da plataforma, I want filtrar por marketplace, so that eu analise apenas buscas de um canal especifico.
7. As an operador da plataforma, I want filtrar por status da task, so that eu priorize falhas, bloqueios manuais ou buscas em andamento.
8. As an operador da plataforma, I want receber resultados ordenados por buscas mais recentes, so that o historico mostre primeiro o trabalho atual.
9. As an operador da plataforma, I want ver contadores de encontrados e salvos, so that eu entenda rapidamente o resultado da busca.
10. As an operador da plataforma, I want ver o `taskId` associado, so that eu abra o diagnostico quando precisar.
11. As an operador da plataforma, I want que uma busca sem produtos continue aparecendo, so that falhas antes da persistencia nao desaparecam.
12. As an operador da plataforma, I want paginar o historico, so that a API continue eficiente com volume crescente.
13. As an consumidor da API, I want parametros invalidos rejeitados com erro claro, so that o frontend consiga corrigir filtros e paginacao.
14. As an desenvolvedor, I want o contrato retornar dados de busca e resumo da task sem expor detalhes internos demais, so that o frontend mantenha a linguagem de dominio.
15. As an desenvolvedor, I want a consulta ser coberta por testes de controller e repository, so that filtros, ordenacao e paginacao nao regressem.

## Implementation Decisions

- A listagem principal sera de `MarketplaceProductSearch`, nao de `AutomationTask`.
- `AutomationTask` continua sendo o mecanismo tecnico de ciclo de vida, status, erro e diagnostico.
- `MarketplaceProductSearch` continua sendo a entidade de negocio para a execucao da busca.
- O endpoint sera `GET /marketplace-searches`, no mesmo controller das rotas de detalhes ja existentes.
- A resposta sera paginada e seguira o padrao `{ items, page, limit, total }` ja usado nas listas de produtos e capturas.
- A ordenacao padrao sera `createdAt desc`, com criterio secundario estavel por identificador quando necessario.
- Os filtros do MVP serao `query`, `marketplace` e `status`.
- O filtro `query` deve procurar no termo salvo da busca. Categoria pode permanecer fora do filtro textual no MVP.
- O filtro `marketplace` deve aceitar apenas valores validos do enum de marketplace.
- O filtro `status` deve filtrar pelo status da `AutomationTask` relacionada.
- Cada item deve incluir `searchId`, `taskId`, `marketplace`, `query`, `category`, `requestedLimit`, `foundCount`, `savedCount`, `createdAt`, `completedAt` e um resumo da task com `status`, erro resumido quando houver, `errorType`, `startedAt`, `finishedAt` e `updatedAt`.
- A API deve listar todas as buscas criadas, incluindo `pending`, `processing`, `completed`, `partial`, `failed` e `manual_required`.
- A busca individual e suas listas relacionadas permanecem nos endpoints ja existentes.
- Nao sera criado `GET /automation-tasks` como substituto desta feature.
- A consulta deve ser implementada no repository de buscas, mantendo o service como orquestrador de regras e tratamento de ausencia quando aplicavel.
- A listagem vazia deve retornar pagina valida com `items: []` e `total: 0`, nao HTTP 404.
- A feature nao exige alteracao de schema, pois `MarketplaceProductSearch` ja possui relacao 1:1 com `AutomationTask`.
- A autenticacao e autorizacao devem seguir o padrao atual do modulo. Caso a aplicacao ganhe multiusuario, a consulta devera ser restringida por conta ou workspace antes de virar funcionalidade compartilhada.

## Testing Decisions

- Testar o controller para contrato HTTP, parametros de paginacao, filtros aceitos e resposta vazia.
- Testar o repository com dados reais de banco ou Prisma testavel para garantir join com `AutomationTask`, filtros e ordenacao deterministica.
- Testar que buscas em todos os estados de task aparecem na listagem.
- Testar filtro por `query`, `marketplace` e `status` isoladamente.
- Testar combinacao de filtros para evitar que joins ou where clauses retornem dados incorretos.
- Testar paginacao no banco com `page`, `limit` e `total`.
- Testar que parametros invalidos de paginacao e enums invalidos sao rejeitados pelos DTOs/pipes.
- Reutilizar como prior art os testes existentes de `MarketplaceProductSearchesController`, `MarketplaceProductSearchesService` e `PrismaMarketplaceProductSearchesRepository`.
- Nao e necessario teste e2e de SSE para esta feature, porque a listagem e uma consulta REST e nao muda a semantica de eventos.

## Out of Scope

- Criar listagem global de `AutomationTask`.
- Criar retry manual de busca falha.
- Criar acoes em lote no historico.
- Criar filtros por data no MVP.
- Criar ordenacoes configuraveis alem do padrao por criacao decrescente.
- Criar dashboard agregado de buscas, produtos ou performance.
- Alterar providers de marketplace, filas BullMQ ou processamento de busca.
- Alterar schema relacional existente.
- Remover ou substituir endpoints de detalhes, produtos, capturas ou diagnostico.

## Further Notes

- Decisao de produto ja tomada: historico deve listar todas as buscas criadas, inclusive falhas e bloqueadas.
- Decisao de arquitetura ja tomada: busca e a entidade primaria para historico; task e diagnostico tecnico.
- A tela de detalhes da busca continuara sendo a acao principal mesmo para falhas. O diagnostico da task sera acao secundaria.
- O MVP nao inclui filtro por data porque ainda nao ha dor explicita de volume alto.
- O uso e pessoal, entao o contrato pode expor atalhos tecnicos como `taskId`, mas sem transformar a listagem em uma tela centrada em tasks.
- A documentacao tecnica do modulo de marketplaces deve continuar distinguindo `searchId` de `taskId`.
