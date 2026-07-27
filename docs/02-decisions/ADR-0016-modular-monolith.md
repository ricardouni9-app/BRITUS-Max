---
id: ADR-0016
title: Estilo arquitetural — monólito modular com deploy único
status: Superseded
superseded_by:
  - ADR-0021
version: 1.1
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-24
updated: 2026-07-25
related: [ADR-0017, ADR-0018, ADR-0021, DOC-ARCH-OVERVIEW]
---

# ADR-0016 — Estilo arquitetural: monólito modular com deploy único

## Status
**Superseded — 2026-07-25 (por ADR-0021).** Aceito originalmente em 2026-07-24.

> A premissa de **aplicação hospedada** com SPA/API em **um único deploy** **não
> orienta mais** novas implementações (ver ADR-0021 — custódia local; app
> instalável no ambiente do cliente). O conceito de *monólito modular* pode ser
> **reafirmado** no novo contexto, mas **não** permanece válido apenas por força
> deste ADR. O conteúdo histórico abaixo é preservado como registro da decisão original.

## Contexto
Produto interno-primeiro, equipe enxuta, Product First e Just-in-Time. Necessidade
de entrega rápida sem impedir evolução futura para SaaS.

## Problema
Definir o estilo arquitetural do núcleo sem introduzir complexidade distribuída
prematura nem inviabilizar separação futura.

## Alternativas consideradas
- **Aplicação full-stack única (meta-framework)** — menos boilerplate, mas revisaria a stack aprovada (React+Vite).
- **Microsserviços** — complexidade distribuída injustificada nesta fase.
- **Monólito modular (escolhida)** — API única modular servindo a SPA; fronteiras internas claras; um deploy.

## Decisão
Adotar **monólito modular**: `apps/api` (Fastify) com módulos de domínio internos,
servindo o build de `apps/web`. Um único deploy. Sem microsserviços/filas/gateway/
event bus. `apps/web` e `apps/api` separados estruturalmente, não operacionalmente.

## Consequências
- Entrega e operação simples; menor superfície de falha.
- Fronteiras internas permitem separação futura sem reescrita.
- Escala horizontal e distribuição ficam adiadas (JIT), reavaliáveis antes do SaaS.

## Histórico
- 2026-07-24 — criação (decisão do CTO na Sprint 0.9).
- 2026-07-25 — **Superseded por ADR-0021** (custódia local; app instalável no
  ambiente do cliente). Sprint 1 — Etapa 2.5.
