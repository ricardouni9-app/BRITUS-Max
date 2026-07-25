---
id: ADR-0017
title: Multitenancy — Organization desde o primeiro modelo
status: Accepted
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0016, DOC-DOMAIN-MODEL, DOC-DATA-MODEL, DOC-SECURITY-PRIVACY]
---

# ADR-0017 — Multitenancy: Organization desde o primeiro modelo

## Status
Accepted — 2026-07-24.

## Contexto
O primeiro cliente é a própria Britus Advocacia (organização única). A evolução
prevista é Britus → parceiros → múltiplos escritórios → SaaS. Introduzir contexto
de organização depois é a mudança estrutural mais cara de reverter.

## Problema
Como preparar segregação por organização sem construir administração de tenants
no MVP.

## Alternativas consideradas
- **Single-tenant agora, migrar depois** — barato agora, reescrita cara depois.
- **Banco/schema por cliente** — isolamento forte, complexidade operacional injustificada agora.
- **Tenant lógico desde o início (escolhida)** — `Organization` + `organization_id` em toda entidade tenant-scoped; sem admin de tenants.

## Decisão
Introduzir a entidade **`Organization`** desde o primeiro modelo (Britus = primeira
organização). Toda entidade operacional carrega contexto organizacional direto ou
inequivocamente derivável. A **autorização confirma o vínculo usuário↔organização↔
recurso**; nenhuma consulta depende apenas do identificador global do registro.
**Testes de isolamento organizacional são obrigatórios desde a Sprint 1.**

## Consequências
- Segregação de dados desde o início; evolução para SaaS sem reescrita de modelo.
- **Não** autoriza: administração de tenants, planos, billing, onboarding automatizado, personalização avançada (JIT).
- Custo mínimo agora; evita o retrofit mais caro do projeto.

## Histórico
- 2026-07-24 — criação (decisão do CTO na Sprint 0.9).
