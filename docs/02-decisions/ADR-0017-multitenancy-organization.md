---
id: ADR-0017
title: Multitenancy — Organization desde o primeiro modelo
status: Superseded
superseded_by:
  - ADR-0020
  - ADR-0021
version: 1.1
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-24
updated: 2026-07-25
related: [ADR-0016, ADR-0020, ADR-0021, DOC-DOMAIN-MODEL, DOC-DATA-MODEL, DOC-SECURITY-PRIVACY]
---

# ADR-0017 — Multitenancy: Organization desde o primeiro modelo

## Status
**Superseded — 2026-07-25 (por ADR-0020 e ADR-0021).** Aceito originalmente em 2026-07-24.

> Preserva-se historicamente que este ADR definiu **multitenancy de servidor**. Na
> nova arquitetura (ADR-0021): `Organization` **permanece como conceito do Core**;
> **não** há multitenancy operacional em servidor controlado pela Britus; os dados
> ficam no ambiente do cliente; o **isolamento organizacional pode continuar dentro
> desse ambiente**. **Não** se afirma que toda instalação contém obrigatoriamente uma
> única organização; **não** se elimina nem se impõe `organization_id` nesta etapa.

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
- 2026-07-25 — **Superseded por ADR-0020 e ADR-0021** (Core/módulos; custódia local).
  Sprint 1 — Etapa 2.5.
