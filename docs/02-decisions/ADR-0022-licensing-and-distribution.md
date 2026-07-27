---
id: ADR-0022
title: Licenciamento, distribuição e atualização de módulos
status: Accepted
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-25
updated: 2026-07-25
related: [ADR-0020, ADR-0021, DOC-BUSINESS-MODEL, DOC-BACKLOG]
---

# ADR-0022 — Licenciamento, distribuição e atualização de módulos

## Status
Accepted — 2026-07-25.

## Contexto
Os módulos (ADR-0020) poderão ser adquiridos separadamente; a distribuição usa a
infraestrutura online da Britus (ADR-0021), **não** os dados operacionais.

## Problema
Definir **conceitualmente** como módulos são licenciados, distribuídos e atualizados,
sem fixar tecnologia agora.

## Decisão (conceitual)
Prever, como capacidades **futuras** (não implementadas nesta etapa):
- **módulos licenciáveis**; **catálogo**; **versões**; **compatibilidade**;
  **dependências**; **instalação**; **atualização**; **validação de licença**.
- **Operação offline da licença**: a decidir futuramente.

**Não** se escolhe agora: tecnologia, fornecedor, criptografia, marketplace ou
política comercial definitiva.

## Consequências
- Base conceitual para o **modelo comercial** (BUSINESS_MODEL) e o **roadmap**.
- Nenhuma dessas funções entra no MVP (ver BACKLOG).

## Histórico
- 2026-07-25 — criação (Sprint 1 — Etapa 2.5).
