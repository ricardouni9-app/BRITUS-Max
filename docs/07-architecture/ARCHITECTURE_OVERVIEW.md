---
id: DOC-ARCH-OVERVIEW
title: Architecture Overview — BRITUS Platform
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [SPR-0009, ADR-0016, ADR-0017, ADR-0018, ADR-0019, DOC-DOMAIN-MODEL, DOC-DATA-MODEL]
---

# Architecture Overview — BRITUS Platform

## Estado atual (evitar interpretações equivocadas)
- Produto **interno em preparação**; implementação **ainda não iniciada**.
- Arquitetura **definida e aprovada**.
- Ambiente com **dados reais ainda não autorizado**.
- Política jurídica de retenção **pendente de validação**.

Este documento descreve **capacidade planejada**, não funcionalidade existente.

## Estilo arquitetural
**Monólito modular** (ADR-0016). Uma API única (Fastify) com fronteiras internas
explícitas por módulo de domínio, servindo o build da SPA. **Um único deploy**
inicial. **Sem** microsserviços, filas, gateway, event bus ou service discovery
(adiados por Engenharia Just-in-Time).

## Stack (capacidade → decisão)
| Camada | Decisão |
|---|---|
| Runtime | Node.js 24 LTS (ADR-0003) |
| Linguagem | TypeScript |
| Frontend | React + Vite + Tailwind v4 + shadcn/ui + TanStack Query + React Hook Form + Zod + React Router |
| Backend | Fastify (modular) |
| Estilo de API | REST + contratos Zod (ADR-0018) |
| Persistência | PostgreSQL + Drizzle |
| Multitenancy | `Organization` desde o primeiro modelo (ADR-0017) |
| Documentos | metadados no banco + binários em storage de objetos (fora do banco) |

> Utilidades (host, provedor de Postgres, storage) são substituíveis e serão
> definidas antes do piloto com dados reais — nenhuma foi contratada.

## Estrutura física (monorepo)
```
apps/web   → SPA React (Vite)
apps/api   → API Fastify (serve o build da SPA); domínio em módulos internos
packages/contracts → schemas Zod + tipos inferidos (SSoT front↔back)   [criar na Sprint 1]
packages/db        → schema Drizzle, migrations, conexão, repositories  [criar na Sprint 1]
packages/ui        → design system
packages/config    → presets compartilhados
```
`apps/web` e `apps/api` são separados **estruturalmente**, não operacionalmente
(um deploy). O domínio começa como módulos dentro de `apps/api`; extração para
`packages/domain` só quando houver segundo consumidor real.

## Grafo de dependências permitido
```
apps/web → packages/ui, packages/contracts
apps/api → packages/contracts, packages/db
packages/contracts, packages/db → (não dependem de apps)
```

## Capacidade planejada (a construir por Sprint)
Operação jurídica organizada; isolamento por organização; controle de acesso;
documentos; timeline; auditoria; confiabilidade proporcional.

## Capacidade futura (NÃO existente)
Múltiplos escritórios em produção; planos; cobrança; medição de uso; API pública;
recursos comerciais avançados. Preparados estruturalmente, **não** implementados.

## Princípios inegociáveis
Autorização sempre no servidor (deny-by-default); isolamento por organização;
nenhum segredo no frontend; validação no servidor; SSoT via `packages/contracts`;
simplicidade antes de abstração.
