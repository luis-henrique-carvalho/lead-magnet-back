---
title: "Marketplace Module"
status: "needs-triage"
type: "epic"
slug: "marketplace-module"
parent: "Docs/v2/marktplaces-modules.md"
---

# Marketplace Module

## Description

Epic para estruturar o modulo de marketplaces do backend, cobrindo busca de produtos por providers/adapters, orquestracao assincrona com `AutomationTask` e BullMQ, persistencia de produtos descobertos e captura de links afiliados sem tracking proprio.

O fluxo principal esperado e:

1. A API recebe uma solicitacao de busca ou captura.
2. O backend cria uma `AutomationTask`.
3. Um job e publicado em fila BullMQ.
4. Um worker executa a automacao usando o provider correto.
5. O resultado e persistido e a task e atualizada para consulta posterior.

## Source

- [Docs/v2/marktplaces-modules.md](../../Docs/v2/marktplaces-modules.md)

## Tasks

- [001 - Definir contrato e providers fake de busca de produtos](tasks/001-definir-contrato-e-providers-fake-de-busca-de-produtos.md)
- [002 - Expor busca sincrona fake via POST /marketplaces/search](tasks/002-expor-busca-sincrona-fake-via-marketplaces-search.md)
- [003 - Criar persistencia e status de AutomationTask](tasks/003-criar-persistencia-e-status-de-automation-task.md)
- [004 - Configurar BullMQ e transformar busca em task assincrona](tasks/004-configurar-bullmq-e-transformar-busca-em-task-assincrona.md)
- [005 - Processar busca de produtos em worker](tasks/005-processar-busca-de-produtos-em-worker.md)
- [006 - Persistir produtos descobertos pela busca](tasks/006-persistir-produtos-descobertos-pela-busca.md)
- [007 - Adicionar captura de link afiliado como fluxo assincrono](tasks/007-adicionar-captura-de-link-afiliado-como-fluxo-assincrono.md)
- [008 - Adicionar infraestrutura de browser e sessao autenticada](tasks/008-adicionar-infraestrutura-de-browser-e-sessao-autenticada.md)
- [009 - Implementar captura real parcial de link Mercado Livre](tasks/009-implementar-captura-real-parcial-de-link-mercado-livre.md)
- [010 - Implementar captura real parcial de link Amazon](tasks/010-implementar-captura-real-parcial-de-link-amazon.md)
