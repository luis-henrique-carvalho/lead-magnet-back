# Validacao Manual: Captura Afiliada Mercado Livre

Este roteiro valida o fluxo real de captura afiliada do Mercado Livre com uma sessao autenticada. Ele nao deve rodar em CI, porque depende de conta logada, UI externa, CAPTCHA, estado da sessao e possiveis variacoes de layout.

## Pre-requisitos

- Redis e banco configurados para o backend.
- Dependencias instaladas.
- Navegador Playwright instalado.
- Uma conta Mercado Livre afiliada com acesso ao controle de geracao de link.
- Uma URL real de produto do Mercado Livre.

## Preparar sessao autenticada

Se `.auth/mercadolivre-storage-state.json` nao existir ou estiver expirado:

```bash
npm run pw:install
npm run pw:ml:save-session
```

O script abre o navegador. Faca login manualmente, resolva 2FA/CAPTCHA se aparecer, volte ao terminal e pressione Enter para salvar a sessao. O arquivo `.auth/mercadolivre-storage-state.json` contem cookies ativos e nao deve ser versionado.

## Validar visualmente a UI antes do backend

Opcionalmente, abra o playground:

```bash
npm run pw:ml:open
```

Confirme que a conta logada consegue abrir uma pagina de produto e ver a acao de gerar link afiliado. Se os seletores tiverem mudado, registre o ajuste necessario antes de validar a task.

## Disparar captura pelo fluxo assincrono

Suba o backend:

```bash
npm run start:dev
```

Em outro terminal, substitua `PRODUCT_ID` pelo UUID interno do produto salvo no Lead Magnet e `ORIGINAL_PRODUCT_URL` por uma URL real de produto do Mercado Livre:

```bash
curl -sS -X POST http://localhost:3000/affiliate-link-capture \
  -H 'Content-Type: application/json' \
  -d '{
    "productId": "PRODUCT_ID",
    "marketplace": "mercado_livre",
    "originalProductUrl": "ORIGINAL_PRODUCT_URL"
  }'
```

A resposta esperada contem `taskId` e `statusUrl`.

## Consultar resultado

Consulte a task retornada:

```bash
curl -sS http://localhost:3000/automation-tasks/TASK_ID
```

Resultado esperado em sucesso:

- `status` igual a `completed`.
- `result.productId` igual ao UUID enviado.
- `result.marketplace` igual a `mercado_livre`.
- `result.originalProductUrl` igual a URL enviada.
- `result.capturedAffiliateUrl` preenchido com URL HTTP(S) gerada pelo Mercado Livre.

Resultado esperado em bloqueio conhecido:

- `status` igual a `manual_required`.
- `errorType` igual a `session_invalid`, `captcha_required` ou `layout_changed`.
- `error` descrevendo o bloqueio operacional.

## Registrar evidencia no ticket

Ao executar a validacao real, atualize o ticket HITL com:

- URL de produto usada, omitindo parametros sensiveis se necessario.
- `taskId` gerado.
- Status final da task.
- Link afiliado capturado ou tipo de bloqueio manual.
- Ajustes de seletor feitos, se houver.
- Comandos de validacao executados.
