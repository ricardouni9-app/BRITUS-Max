---
id: DOC-ARCH-OVERVIEW
title: Architecture Overview — Britus
status: Active
version: 2.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-25
related: [SPR-0009, ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022, DOC-DOMAIN-MODEL, DOC-DATA-MODEL]
---

# Architecture Overview — Britus

## Estado atual
- Produto **em preparação**; implementação do núcleo em andamento (Sprint 1).
- Arquitetura **local-first**: o software é **instalável/executável no ambiente do
  cliente** e os **dados operacionais permanecem sob custódia do cliente** (ADR-0021).
- Ambiente com **dados reais ainda não autorizado**; política jurídica de retenção
  **pendente de validação**.

Descreve **capacidade planejada**, não funcionalidade existente.

## Estilo arquitetural
Aplicação **instalável no ambiente do cliente** (ADR-0021). A organização interna
segue o padrão de **monólito modular** — uma aplicação com fronteiras internas
explícitas por módulo de domínio — reafirmado **no novo contexto local-first** (o
antigo ADR-0016, que pressupunha deploy hospedado único, está **Superseded** por
ADR-0021). **Sem** microsserviços, filas, gateway, event bus (adiados por JIT).

**Topologia não decidida:** desktop, aplicação web local, mobile e sincronização são
decisões futuras (ver BACKLOG). A **API poderá operar localmente/em rede privada**;
**exposição externa não é pressuposta** (ADR-0018, complementado).

## Core universal e módulos (ADR-0020)
Um **Core** com conceitos compartilhados e **módulos acopláveis** que adicionam
conhecimento/comportamento de área/especialidade, **sem duplicar** o Core. Hierarquia
**Domínio → Área → Especialidade → Recursos** (Advocacia primeiro).

## Fronteira da infraestrutura online da Britus (ADR-0021)
Distribuição, licença, catálogo, download, atualização, suporte e treinamento. **Não**
armazena dados jurídicos operacionais; estes **não** são enviados por padrão à Britus.

## Stack (capacidade → decisão)
| Camada | Decisão |
|---|---|
| Runtime | Node.js 24 LTS (ADR-0003) |
| Linguagem | TypeScript |
| Frontend | React + Vite + Tailwind v4 + shadcn/ui + TanStack Query + React Hook Form + Zod + React Router |
| Backend | Fastify (modular) |
| Estilo de API | REST + contratos Zod (ADR-0018) — sem pressupor hospedagem pública |
| Persistência | PostgreSQL + Drizzle (banco no ambiente do cliente) |
| `Organization` | conceito do **Core** (ADR-0020/0021); isolamento dentro do ambiente do cliente; uma instalação não é obrigatoriamente mono-organização |
| Documentos | metadados no banco + binários fora do banco (armazenamento no ambiente do cliente) |

> Utilidades (armazenamento, provedor de banco, distribuição) são substituíveis e
> serão definidas antes do piloto com dados reais — nenhuma foi contratada.

## Estrutura física (monorepo)
```
apps/web   → SPA React (Vite)
apps/api   → API Fastify (modular); domínio em módulos internos
packages/contracts → schemas Zod + tipos inferidos (SSoT)
packages/db        → schema Drizzle, migrations, conexão, repositories
packages/ui        → design system
packages/config    → presets compartilhados
```
Grafo permitido: `apps/web → ui, contracts` · `apps/api → contracts, db` ·
`contracts`/`db` não dependem de apps.

## Capacidade futura (NÃO existente — ver BACKLOG/ADR-0022)
Catálogo, licenciamento, download/instalação/atualização de módulos; gestão financeira;
decisões de topologia (desktop/mobile/web local/sincronização). **Não** há SaaS
operacional hospedado pela Britus no roadmap atual.

## Princípios inegociáveis
Autorização sempre no **backend** (deny-by-default); validação no backend; nenhum
segredo no frontend; SSoT via `packages/contracts`; simplicidade antes de abstração;
`Organization` como fronteira de escopo **quando** houver dados a isolar (decidido na
modelagem — Etapa 3+).
