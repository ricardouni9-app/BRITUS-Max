---
id: ADR-0018
title: Estilo de API — REST com contratos Zod compartilhados
status: Accepted
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0016, DOC-API-CONTRACTS]
---

# ADR-0018 — Estilo de API: REST com contratos Zod compartilhados

## Status
Accepted — 2026-07-24.

## Contexto
Frontend (React/Vite) e backend (Fastify) no mesmo monorepo; futura API pública e
integrações no caminho para SaaS; Captura Única / Single Source of Truth.

## Problema
Escolher o estilo de comunicação front↔back que maximize independência e prepare
integração externa, sem acoplar ao cliente TypeScript atual.

## Alternativas consideradas
- **tRPC** — DX excelente para uso interno, mas acopla ao cliente TS e dificulta API pública/apps futuros.
- **REST + contratos Zod (escolhida)** — schemas Zod em `packages/contracts` como fonte única; tipos inferidos; validação idêntica front/back; OpenAPI derivável.

## Decisão
Adotar **REST** com **contratos Zod compartilhados** (`packages/contracts`):
schemas de entrada/saída, tipos inferidos, enums contratuais, paginação e erros
públicos padronizados. **Sem tRPC.** **Sem versionamento `/v1`** enquanto houver um
único consumidor e nenhum contrato público — reavaliar antes da primeira integração externa.

## Consequências
- Independência front/back; caminho natural para API pública e apps.
- Validação e tipos a partir de uma única fonte (SSoT); menos divergência.
- Um pouco mais de boilerplate que tRPC, compensado pela portabilidade.

## Histórico
- 2026-07-24 — criação (decisão do CTO na Sprint 0.9).
