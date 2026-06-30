# Documentação Técnica: Módulo de Marketplaces (Marketplace Module)

Este documento centraliza e descreve a arquitetura, fluxos, componentes e decisões técnicas do **Módulo de Marketplaces** do backend do Lead Magnet.

O módulo foi estruturado para suportar a busca assíncrona de produtos por meio de múltiplos provedores e a captura de links afiliados de forma automatizada, utilizando filas de processamento assíncrono e controle de navegadores headless.

---

## 1. Visão Geral e Arquitetura

O módulo de marketplaces é composto por dois fluxos de negócio principais:

1. **Busca de Produtos (`marketplace_product_search`)**: Busca produtos em marketplaces a partir de filtros (termo de busca, categoria, limite), normaliza os dados e os persiste.
2. **Captura de Links Afiliados (`affiliate_link_capture`)**: Acessa o marketplace em uma sessão autenticada do usuário (afiliado), simula as ações de geração de link no painel da plataforma e extrai a URL final com comissão.

Ambos os fluxos operam de maneira **assíncrona** por meio do **BullMQ** com persistência de status através da entidade `AutomationTask`.

---

## 2. Diagramas de Sequência

### Fluxo de Busca de Produtos (Assíncrono)

O fluxo de busca desacopla a requisição HTTP da execução do scraper ou consulta do provider:

```mermaid
sequenceDiagram
    participant Client as Frontend/Cliente
    participant API as POST /marketplaces/search
    participant Tasks as AutomationTasksService
    participant DB as PostgreSQL (Prisma)
    participant Queue as BullMQ (Redis)
    participant Worker as MarketplaceProductSearchProcessor
    participant Registry as MarketplaceProductProviderRegistry
    participant Provider as Provider (ex: MercadoLivreProductProvider)

    Client->>API: Envia marketplace, query, category, limit
    API->>Tasks: criar AutomationTask (tipo: marketplace_product_search)
    Tasks->>DB: Salva AutomationTask com status 'pending'
    DB-->>API: Retorna taskId
    API->>API: Gera searchId (UUID)
    API->>Queue: Enfileira job 'search-products' (taskId, searchId, filters)
    API-->>Client: Retorna taskId, statusUrl, searchId (HTTP 201)

    Note over Queue, Worker: BullMQ entrega o job em background
    Queue->>Worker: Executa job
    Worker->>Tasks: Atualiza status da task para 'processing'
    Worker->>Registry: Solicita provider para o marketplace
    Registry-->>Worker: Retorna Provider correspondente
    Worker->>Provider: searchProducts(query, category, limit)
    Provider->>Provider: Valida sessão, CAPTCHA e layout antes de raspar
    Provider-->>Worker: Retorna lista de produtos normalizados
    Worker->>Worker: Persiste produtos descobertos no DB (evitando duplicatas)
    Worker->>Tasks: Atualiza status da task para 'completed' com metadados (foundCount, savedCount)
    Provider-->>Worker: Ou lança MarketplaceProductSearchError(errorType)
    Worker->>Tasks: Atualiza status para 'manual_required' ou 'failed'
```

---

### Fluxo de Captura de Link Afiliado

O fluxo de captura utiliza o **Playwright** para simular ações em portais logados de afiliados:

```mermaid
sequenceDiagram
    participant Client as Cliente
    participant API as POST /affiliate-link-capture
    participant Tasks as AutomationTasksService
    participant Queue as BullMQ (Redis)
    participant Worker as AffiliateLinkCaptureProcessor
    participant Registry as AffiliateLinkCaptureProviderRegistry
    participant Provider as Provider (ex: AmazonAffiliateLinkCaptureProvider)
    participant Browser as PlaywrightService
    participant Portal as Portal do Marketplace (ex: SiteStripe)

    Client->>API: Envia productId, marketplace, originalProductUrl
    API->>Tasks: criar AutomationTask (tipo: affiliate_link_capture)
    API->>Queue: Enfileira job 'capture-affiliate-link' (taskId, etc.)
    API-->>Client: Retorna taskId e statusUrl (HTTP 201)

    Note over Queue, Worker: BullMQ entrega o job em background
    Queue->>Worker: Executa job
    Worker->>Tasks: Atualiza status para 'processing'
    Worker->>Registry: Obtém provider correspondente
    Registry-->>Worker: Retorna Provider
    Worker->>Provider: captureAffiliateLink(url)
    Provider->>Browser: openAuthenticatedPage(marketplace, url)
    Browser->>Portal: Abre página do produto usando 'storageState' salvo
    Provider->>Provider: Detecta CAPTCHA ou login inválido
    Provider->>Portal: Clica no elemento de compartilhamento / "Obter Link"
    Portal-->>Provider: Exibe elemento com o link gerado
    Provider->>Provider: Extrai a URL gerada e valida protocolo HTTP(S)
    Provider-->>Worker: Retorna capturedAffiliateUrl
    Worker->>Tasks: Atualiza status para 'completed' com a URL de afiliado
    Provider->>Browser: Fecha contexto/página em 'finally'
```

---

## 3. Estados da Automação (`AutomationTask`)

A entidade `AutomationTask` controla o ciclo de vida das operações assíncronas do backend. O fluxo de estados e transições é representado abaixo:

```mermaid
graph TD
    Start([Solicitação Recebida]) --> Pending[pending]

    Pending -->|Worker consome o Job| Processing[processing]

    Processing -->|Sucesso Total| Completed[completed]
    Processing -->|Sucesso Parcial| Partial[partial]

    Processing -->|Erro Técnico ou Timeout| Failed[failed]

    Failed -->|Se attempts < limite| Processing
    Failed -->|Se attempts >= limite| FailedDef[failed definitivo]

    Processing -->|CAPTCHA / Sessão Expirada / Layout Alterado| Manual[manual_required]

    Completed --> End([Fim da Execução])
    Partial --> End
    FailedDef --> End
    Manual -->|Requer Intervenção Humana| End

    %% Estilos de cores premium %%
    classDef startEnd fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef state fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef success fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef error fill:#ffebee,stroke:#d32f2f,stroke-width:2px;
    classDef manual fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    class Start,End startEnd;
    class Pending,Processing state;
    class Completed,Partial success;
    class Failed,FailedDef error;
    class Manual manual;
```

Seus estados são mapeados da seguinte forma:

- **`pending`**: A tarefa foi criada no banco de dados e adicionada na fila de processamento, mas o worker ainda não a iniciou.
- **`processing`**: O worker iniciou o processamento do job. O contador de tentativas (`attempts`) é incrementado neste momento.
- **`completed`**: A tarefa terminou com sucesso. O resultado (ex: contagem de produtos ou URL capturada) é salvo no campo `result`.
- **`partial`**: Reservado para execuções parciais (ex: encontrou produtos, mas com alguns erros tratáveis).
- **`failed`**: Ocorreu um erro técnico recuperável (ex: timeout de rede, erro interno). O erro é registrado em `error` e `errorType` (ex: `timeout`, `internal_error`), e o job é recolocado na fila se restarem tentativas configuradas no BullMQ.
- **`manual_required`**: Um bloqueio conhecido ocorreu e requer intervenção humana imediata (ex: CAPTCHA detectado, sessão inválida ou expirada, layout alterado). **O job é abortado imediatamente sem tentativas de re-execução** para evitar detecção de comportamento robótico e bloqueio de contas.

---

## 4. Persistência de Dados e Deduplicação

Para evitar a duplicação desnecessária de registros de produtos no banco de dados, o schema do Prisma divide as entidades em:

1.  **`MarketplaceProduct`**: Tabela canônica que armazena os detalhes dos produtos descobertos.
    - **Identificador Único**: Chave composta única em `[marketplace, originalUrl]`.
    - Se um produto já existir no banco, seus dados (preço, título, etc.) são atualizados (`upsert`).
2.  **`MarketplaceProductSearchResult`**: Tabela de relacionamento de descobertas.
    - Vincula um `searchId` (execução da busca) a um `productId` (`MarketplaceProduct`).
    - **Identificador Único**: Chave composta única em `[searchId, productId]`.
    - Isso garante idempotência de reprocessamento (um mesmo job reexecutado não gera novas linhas de vínculo).

### Métricas de Resultados

- **`foundCount`**: Quantidade total de produtos retornados pelo provider (pode incluir itens já conhecidos).
- **`savedCount`**: Quantidade de novos produtos vinculados àquela busca pela primeira vez.

### Validação antes da Persistência

O fluxo de busca só persiste produtos depois que o provider retorna itens normalizados. Erros conhecidos do scraper devem ser lançados antes de chamar `MarketplaceProductsService.saveSearchResults`, evitando que páginas de login, ajuda, segurança ou privacidade sejam salvas como produtos.

No `MercadoLivreProductProvider`, a busca executa guardas em três momentos:

1.  Após abrir a sessão autenticada e aguardar `networkidle`.
2.  Após confirmar que a página do hub carregou seletores esperados.
3.  Após executar a busca por query dentro do hub.

Se a página atual indicar login, sessão expirada, CAPTCHA, throttling ou layout não reconhecido, o provider lança `MarketplaceProductSearchError` com um `AutomationErrorType` explícito. O processor usa esse tipo para atualizar a `AutomationTask` corretamente.

O parser do Mercado Livre também faz uma segunda camada de defesa:

- Rejeita URLs de navegação, login, registro, privacidade, acessibilidade, ajuda e segurança (`/jms/`, `/login`, `/registration`, `/privacidade`, `/acessibilidade`, `/ato-complaint`, etc.).
- Aceita somente URLs com marcadores de produto/anúncio, como páginas `/p/MLB...`, IDs `MLB...`, `wid`, `pdp_filters` ou URLs de clique patrocinado com identificador de item.
- Rejeita títulos que pareçam menus, textos de autenticação, privacidade, acessibilidade ou CSS/JS capturado da página.
- Rejeita cards sem nenhum sinal mínimo de produto (`externalId`, imagem ou preço).

---

## 5. Configuração do Ambiente e Variáveis

### Configuração do BullMQ / Redis

| Variável     | Valor Padrão | Descrição                 |
| :----------- | :----------- | :------------------------ |
| `REDIS_HOST` | `localhost`  | Host da instância Redis.  |
| `REDIS_PORT` | `6379`       | Porta da instância Redis. |

**Parâmetros Padrão do BullMQ**:

- `attempts`: `3` (Três tentativas antes de falhar de forma definitiva).
- `backoff`: `exponential` com delay base de `5000ms`.
- `removeOnComplete`: `100` (Mantém as 100 tarefas concluídas mais recentes na fila).
- `removeOnFail`: `500` (Mantém as 500 tarefas com falhas mais recentes).

### Configuração do Playwright e Sessão

| Variável                           | Valor Padrão | Descrição                                                             |
| :--------------------------------- | :----------- | :-------------------------------------------------------------------- |
| `PLAYWRIGHT_HEADLESS`              | `true`       | Determina se o navegador rodará oculto (`true`) ou visível (`false`). |
| `PLAYWRIGHT_NAVIGATION_TIMEOUT_MS` | `30000`      | Tempo limite para navegação do Playwright.                            |
| `AMAZON_STORAGE_STATE_PATH`        | _Nenhum_     | Caminho absoluto para o arquivo JSON de cookies de sessão da Amazon.  |
| `MERCADO_LIVRE_STORAGE_STATE_PATH` | _Nenhum_     | Caminho absoluto para o JSON de cookies de sessão do Mercado Livre.   |
| `SHOPEE_STORAGE_STATE_PATH`        | _Nenhum_     | Caminho absoluto para o JSON de cookies de sessão da Shopee.          |

> [!WARNING]
> Arquivos de sessão contêm tokens e cookies ativos. Eles foram adicionados ao `.gitignore` (`*.storage-state.json` e `.auth/`) e **nunca** devem ser versionados.

---

## 6. Provedores e Cobertura (Registry)

Os providers são selecionados dinamicamente via padrões de **Registry** injetáveis (evitando acoplamento rígido).

### Matriz de Provedores Implementados

| Marketplace       | Provedor de Busca (`searchProducts`)                           | Provedor de Captura (`captureAffiliateLink`)                 |
| :---------------- | :------------------------------------------------------------- | :----------------------------------------------------------- |
| **Mercado Livre** | Real/Parcial (Playwright: Hub de Afiliados + parser defensivo) | Real/Parcial (Playwright: Clique em Compartilhar e extração) |
| **Amazon**        | Fake (Simulado)                                                | Real/Parcial (Playwright: SiteStripe / Get Link)             |
| **Shopee**        | _Não Implementado / Retorna Erro_                              | Fake (Gera link determinístico simulado)                     |

### Método de Tratamento de Erros dos Providers

Providers que automatizam páginas reais devem falhar de forma tipada. O padrão atual para busca de produtos é lançar `MarketplaceProductSearchError`, carregando:

- `message`: descrição operacional do bloqueio.
- `errorType`: valor de `AutomationErrorType` que será salvo no banco.
- `cause`: erro original opcional, usado para diagnóstico interno.

O `MarketplaceProductSearchProcessor` aplica a seguinte regra:

| `AutomationErrorType` | Status salvo na task | Retry BullMQ                     | Quando usar                                                           |
| :-------------------- | :------------------- | :------------------------------- | :-------------------------------------------------------------------- |
| `captcha_required`    | `manual_required`    | Não                              | Página exigiu CAPTCHA ou desafio antirobô.                            |
| `session_invalid`     | `manual_required`    | Não                              | Cookies/storageState expiraram ou a navegação caiu em login/registro. |
| `layout_changed`      | `manual_required`    | Não                              | Seletores essenciais sumiram ou o layout esperado não carregou.       |
| `manual_required`     | `manual_required`    | Não                              | Bloqueio conhecido que precisa de intervenção humana.                 |
| `auth_error`          | `manual_required`    | Não                              | Falha de autenticação explícita.                                      |
| `timeout`             | `failed`             | Sim, conforme tentativas da fila | Timeout técnico recuperável.                                          |
| `throttling`          | `failed`             | Sim, conforme tentativas da fila | Marketplace limitou requisições temporariamente.                      |
| `upstream_error`      | `failed`             | Sim, conforme tentativas da fila | Falha temporária externa.                                             |
| `validation_error`    | `failed`             | Sim, conforme tentativas da fila | Dados inválidos inesperados no fluxo técnico.                         |
| `internal_error`      | `failed`             | Sim, conforme tentativas da fila | Erro não classificado.                                                |

O mesmo princípio vale para captura de link afiliado, onde os providers usam erros manuais próprios (`AffiliateLinkCaptureManualRequiredError`) para salvar `captcha_required`, `session_invalid`, `layout_changed` ou `manual_required`.

#### Exemplo: Mercado Livre com sessão expirada

Quando o hub redireciona para login, o provider detecta a URL/título/texto de autenticação e lança:

```ts
throw new MarketplaceProductSearchError(
  'Mercado Livre authenticated session is invalid or expired',
  AutomationErrorType.SessionInvalid,
);
```

O processor então chama:

```ts
automationTasksService.markManualRequired(
  taskId,
  jobId,
  error.message,
  AutomationErrorType.SessionInvalid,
);
```

Com isso, a execução fica registrada como `manual_required` + `session_invalid`, sem persistir cards inválidos e sem retry automático.

---

## 7. Instruções para Desenvolvimento e Testes

### Executando os Testes do Módulo

Para rodar os testes unitários e de integração de maneira isolada e garantir que nenhum comportamento foi quebrado:

```bash
# Executa todos os testes unitários em sequência
pnpm test --runInBand

# Executa testes em modo watch para desenvolvimento local
pnpm test:watch
```

### Provisionando o Navegador Playwright

Antes de executar os fluxos em desenvolvimento ou homologação que façam chamadas reais aos providers do Mercado Livre e Amazon, certifique-se de que os binários do Chromium estão instalados:

```bash
pnpm exec playwright install chromium
```
