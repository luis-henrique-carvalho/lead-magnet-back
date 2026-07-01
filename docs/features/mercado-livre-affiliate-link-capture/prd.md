# Captura de Link Afiliado do Mercado Livre

## Problem Statement

O usuario precisa transformar produtos encontrados no fluxo de busca em links afiliados do Mercado Livre, preservando a relacao entre produto, marketplace, URL original e URL afiliada capturada.

Hoje o backend ja possui o fluxo assincrono de captura de link afiliado, com tarefa de automacao, fila, processor, registry de providers, persistencia de resultado e status consultavel. O problema esta na captura real do Mercado Livre: o fluxo deve usar a URL original do produto descoberta pela busca e executar a geracao do link afiliado na experiencia autenticada do Mercado Livre.

Essa lacuna afeta quem usa o Lead Magnet para buscar produtos no Mercado Livre e preparar materiais promocionais com link monetizado. Sem a captura automatizada, o usuario precisa abrir manualmente cada produto, gerar o link afiliado e copiar o resultado para dentro do sistema, quebrando o objetivo de automacao do pipeline.

Resolver esse problema importa porque o link afiliado e o principal artefato de monetizacao do fluxo. A busca de produtos so se torna acionavel para publicacao quando o sistema consegue obter e armazenar a URL afiliada correspondente.

## Solution

O sistema deve capturar o link afiliado do Mercado Livre a partir de uma tarefa de captura existente, usando `originalProductUrl` como entrada principal da automacao.

Quando uma captura for solicitada para Mercado Livre, o backend deve criar a tarefa, enfileirar o job e delegar ao provider do Mercado Livre a execucao do fluxo Playwright em uma sessao autenticada. O provider deve abrir a pagina do produto a partir da URL original, acionar a interface de geracao de link afiliado, lidar com modal ou nova pagina quando existir, gerar o link e retornar a URL afiliada capturada.

O processor deve continuar responsavel apenas por orquestrar o ciclo de vida da tarefa: marcar processamento, chamar o provider correto, salvar o resultado e finalizar a task. Ele nao deve conter seletores, cliques ou regras especificas do Mercado Livre.

Ao final bem-sucedido, o resultado da tarefa deve conter o produto interno, marketplace, URL original do produto e URL afiliada gerada. Em falhas conhecidas, como sessao expirada, CAPTCHA ou mudanca de layout, a tarefa deve ser marcada como exigindo acao manual.

## User Stories

1. As an affiliate operator, I want the system to generate a Mercado Livre affiliate link from a searched product URL, so that I can monetize products without copying links manually.

2. As an affiliate operator, I want the captured result to keep the original product URL, so that I can audit which product generated each affiliate link.

3. As an affiliate operator, I want the captured result to keep the internal product identifier, so that the generated link remains connected to the product discovered by search.

4. As an affiliate operator, I want the capture flow to run asynchronously, so that I do not need to wait for browser automation inside the initial HTTP request.

5. As an API client, I want the capture endpoint to return a task identifier and status URL, so that I can poll or subscribe to task progress.

6. As an API client, I want the completed task result to include `productId`, `marketplace`, `originalProductUrl`, and `capturedAffiliateUrl`, so that I can use the generated link in later pipeline steps.

7. As an API client, I want invalid marketplace, product ID, or product URL input to be rejected before queueing, so that malformed capture tasks are not created.

8. As an automation worker, I want to select the Mercado Livre provider through the provider registry, so that marketplace-specific behavior stays behind a stable provider interface.

9. As an automation worker, I want the provider to use `originalProductUrl` as the page navigation target, so that the capture begins from the same product page found by search.

10. As an automation worker, I want the Mercado Livre provider to detect whether link generation opens a modal or a new page, so that the automation can continue in the correct Playwright page context.

11. As an automation worker, I want the Mercado Livre provider to click the product-page affiliate link generation control, so that the system follows the same flow an authenticated affiliate uses manually.

12. As an automation worker, I want the provider to support the "Gerar link / ID de produto" path when presented by Mercado Livre, so that the automation remains aligned with the current UI.

13. As an automation worker, I want the provider to read the generated URL from the visible result field, link, textarea, copied value, or equivalent UI output, so that UI presentation changes do not break the happy path unnecessarily.

14. As an automation worker, I want the generated URL to be validated as HTTP(S), so that an invalid or empty value is never persisted as an affiliate link.

15. As an automation worker, I want the generated URL to be different from or meaningfully transformed from the original product URL when possible, so that the system does not mistake a regular product URL for a captured affiliate link.

16. As an affiliate operator, I want expired sessions to mark the task as manual required, so that I know I need to refresh the Mercado Livre authenticated session.

17. As an affiliate operator, I want CAPTCHA challenges to mark the task as manual required, so that the system does not retry aggressively and increase account-blocking risk.

18. As an affiliate operator, I want layout changes to mark the task as manual required, so that a broken selector is visible as an operational issue instead of a silent failure.

19. As an operator, I want technical failures to be logged and represented in task status, so that I can diagnose whether the problem is transient infrastructure or marketplace-specific manual intervention.

20. As an operator, I want browser contexts to close after success or failure, so that repeated capture jobs do not leak resources.

21. As a developer, I want Mercado Livre automation details isolated in the provider, so that the processor remains simple, reusable, and testable.

22. As a developer, I want the provider behavior covered by focused tests, so that changes in selector strategy or error mapping can be validated without running a real browser session.

23. As a developer, I want the processor tests to remain marketplace-agnostic, so that they only verify orchestration, status transitions, persistence calls, and error handling.

24. As a product pipeline consumer, I want the stored affiliate link capture result to be available through existing task and search-related views, so that downstream workflows can consume it without a second integration path.

25. As an operations maintainer, I want capture timeouts to remain configurable, so that production can adapt to slow marketplace pages without code changes.

26. As an affiliate operator, I want already discovered Mercado Livre products to keep their existing search metadata while adding captured affiliate URLs, so that search history remains consistent.

27. As a developer, I want the provider to use the stored authenticated browser session, so that the flow can access affiliate-only controls without implementing credential entry.

28. As a developer, I want the system to avoid adding Mercado Livre UI rules to the database schema, so that UI instability stays in the automation layer rather than becoming a persistent data concern.

## Implementation Decisions

The existing asynchronous capture architecture will be preserved. The capture service will continue creating an `affiliate_link_capture` automation task, relating it to the origin search when present, enqueueing a capture job, publishing task events, and returning a task identifier with a status URL.

The affiliate link capture processor will remain marketplace-agnostic. Its responsibility is to mark the task as processing, resolve the provider from the registry, pass `productId`, `marketplace`, and `originalProductUrl` to the provider, save the returned affiliate URL, and mark the task completed. It must not perform Playwright navigation or contain Mercado Livre selectors.

The Mercado Livre affiliate link capture provider will own the browser automation. For Mercado Livre, `originalProductUrl` is the canonical input for the capture flow. The internal `productId` is used for traceability and persistence, not as the Mercado Livre item identifier.

The provider should begin by opening the original product URL in an authenticated browser page for Mercado Livre. From that page, it should execute the observed affiliate generation workflow using the product-page link generation action. If Mercado Livre opens a popup, tab, or modal, the provider should continue automation in the active generated-link surface.

The provider should support the current observed UI path that includes the affiliate generation button and the "Gerar link / ID de produto" option. If the UI requests or exposes a product link field, the provider should use `originalProductUrl`. If a product ID path is required, the provider may derive the Mercado Livre external item ID from the original URL using the existing Mercado Livre URL parsing capability.

No schema change is required for the first implementation. Existing capture result persistence already stores the source product, related product when present, marketplace, original product URL, captured affiliate URL, creation time, and task relation.

No API contract change is required for the first implementation. The existing capture request contains the necessary fields: optional search origin, internal product ID, marketplace, and original product URL. Additional optional fields such as suggested text, tracking ID, channel, or campaign name are out of the first implementation unless the Mercado Livre UI proves they are mandatory for successful generation.

The provider must continue mapping known manual blocks to typed manual-required errors: CAPTCHA, invalid or expired session, and layout changed. These should not be retried as ordinary technical errors by the capture processor.

The provider should keep URL extraction defensive. It may read from input value, textarea value, href, text content, or equivalent visible output. The final value must be normalized and validated as HTTP(S) before being returned.

The capture timeout should remain configurable using the existing provider timeout pattern. The default timeout should be conservative enough for browser UI rendering without making failed jobs hang unnecessarily.

The storage state approach remains the authentication mechanism. The feature does not implement login, QR-code handling, two-factor handling, credential storage, or interactive session refresh.

## Testing Decisions

Provider unit tests should cover the Mercado Livre happy path using mocked Playwright page and locator behavior. The observable behavior is that a valid `originalProductUrl` produces a valid `capturedAffiliateUrl` and closes the browser session.

Provider tests should cover page-context branching where the generation action stays in the same page, opens a popup/new page, or displays a modal. These tests should validate that the provider continues against the correct surface without moving this logic into the processor.

Provider tests should cover known manual-required states: missing storage state, invalid storage state, redirect to login, visible login form, CAPTCHA challenge, missing generation action, missing output field, and invalid generated URL.

Provider tests should cover the product-ID fallback behavior when the UI requires "Gerar link / ID de produto". The expected behavior is to derive the Mercado Livre external item ID from the original product URL when available and fail as layout changed or validation error when no usable identifier can be found.

Processor tests should continue validating orchestration only: mark processing, resolve provider, pass through `productId`, `marketplace`, and `originalProductUrl`, save the captured URL, mark completed, map manual-required provider errors, and mark unexpected errors as failed.

Controller and service tests should continue validating request validation, task creation, optional search-origin dependency, queue payload, event publication, and response shape. They do not need to know Mercado Livre selectors.

Repository tests should remain focused on persistence behavior. No dedicated schema migration tests are required if the first implementation avoids schema changes.

An end-to-end or smoke test may be useful for a manually maintained authenticated Mercado Livre session, but it should be treated as an operational verification rather than a deterministic CI requirement because the marketplace UI, session state, CAPTCHA, and anti-automation behavior are external and unstable.

Existing tests for Amazon affiliate capture are useful prior art for provider-level browser automation tests, especially around selector fallback, URL extraction, session invalid mapping, CAPTCHA mapping, and session closure in failure paths.

## Out of Scope

Creating a new affiliate link capture module is out of scope. The existing module, task model, queue, processor, registry, and persistence flow should be reused.

Moving Mercado Livre Playwright automation into the affiliate link capture processor is out of scope. Marketplace-specific UI behavior belongs in the Mercado Livre provider.

Replacing the existing asynchronous task flow with a synchronous HTTP response containing the affiliate URL is out of scope.

Implementing Mercado Livre login, QR-code authentication, two-factor authentication, session refresh, or credential management is out of scope.

Adding a public Mercado Livre affiliate API integration is out of scope unless Mercado Livre provides and validates an official endpoint for the required affiliate-generation behavior.

Building a frontend UI for managing failed manual-required captures is out of scope.

Adding support for other marketplaces is out of scope.

Changing product search behavior is out of scope, except that the capture flow depends on the search result's original product URL.

Adding campaign analytics, click tracking, commission reporting, or link performance dashboards is out of scope.

Guaranteeing successful capture when Mercado Livre presents CAPTCHA, blocks automation, changes layout, or expires the authenticated session is out of scope. Those cases should be surfaced as manual-required task states.

## Further Notes

Assumption: the search flow already persists Mercado Livre product URLs that are valid enough to open a product page and initiate affiliate generation.

Assumption: `productId` is the internal Lead Magnet product identifier. It should remain in the job result for traceability but should not be treated as the Mercado Livre item ID.

Assumption: when the Mercado Livre UI requires an item ID, the external marketplace ID can usually be derived from `originalProductUrl` using existing Mercado Livre URL parsing logic.

Assumption: the current observed Playwright flow is representative of the active Mercado Livre affiliate UI: open the product URL while authenticated, click the generation action, optionally choose "Gerar link / ID de produto", generate, then read the produced link.

Assumption: the authenticated storage state file for Mercado Livre is maintained outside this feature and remains excluded from version control.

Technical constraint: Mercado Livre UI automation is inherently brittle because selectors, page text, modal structure, popup behavior, and anti-automation controls can change without notice.

Technical constraint: CAPTCHA and session expiration are not recoverable by backend retry alone and should remain manual-required states.

Risk: the observed `generate_link_button` test ID may not be stable across all product page variants, account states, or Mercado Livre rollout cohorts. The provider should include fallback selectors where reasonable.

Risk: repeated browser automation against affiliate pages may trigger throttling or anti-automation checks. The implementation should avoid unnecessary retries for known manual blocks.

Open question: whether suggested text, channel, tracking ID, or campaign metadata are required by the Mercado Livre UI for some accounts. The first implementation assumes they are optional or have usable defaults.

Open question: whether the generated link should be shortened, canonical, or preserved exactly as Mercado Livre returns it. The first implementation should preserve the returned URL after HTTP(S) validation.

Future improvement: add optional request fields for campaign/channel/tracking metadata if the generation form requires or benefits from them.

Future improvement: persist additional capture diagnostics, such as provider strategy used, popup versus modal flow, or external marketplace item ID, if operational troubleshooting requires it.

Future improvement: add a manual recovery workflow that allows an operator to refresh the Mercado Livre session and retry manual-required tasks from the UI.

Relevant project documentation: the marketplace module documentation describes the asynchronous automation model, `AutomationTask` states, provider registry pattern, Playwright storage state, and manual-required error handling used by this feature.
