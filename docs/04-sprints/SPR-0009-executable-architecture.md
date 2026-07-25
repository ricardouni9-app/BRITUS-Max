---
id: SPR-0009
title: Sprint 0.9 — Arquitetura Executável do Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Conhecimento
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [DOC-PRODUCT-BRIEF, ADR-0016, ADR-0017, ADR-0018, ADR-0019]
---

# SPR-0009 — Arquitetura Executável do Núcleo Operacional

## Objetivo
Transformar a visão do Produto 001 em uma **arquitetura executável** — precisa o
suficiente para que a Sprint 1 seja implementada sem decisões estruturais
improvisadas. **Não** produz software.

## Escopo
- Modelagem de domínio (Atendimento, Caso, Cliente, participantes, catálogos).
- Modelo de dados (Postgres/Drizzle, `Organization`, retenção/descarte).
- Contratos de API (REST + Zod).
- Baselines de segurança/privacidade, confiabilidade e requisitos não-funcionais.
- Contrato de implementação da Sprint 1.

## Fora de escopo
Qualquer código funcional, packages, migrations, telas, dependências, endpoints,
billing, IA, automações.

## Entregáveis
Documentos: Architecture Overview, Domain Model, Data Model, API Contracts,
Security & Privacy Baseline, Reliability Baseline, NFR, Sprint 1 Implementation
Contract, Risk Register; ADR-0016 a ADR-0019.

## Critérios de aceite
- Documentação coerente com o repositório real e com a taxonomia aprovada.
- Requisitos verificáveis; nenhuma validação falsa; nenhuma afirmação jurídica definitiva.
- Nomenclatura "Registro Comercial Mínimo" aplicada; Licitações fora de escopo.

## Tempo estimado / realizado
Estimado: 1 ciclo de especificação. Realizado: registrado no fechamento.

## Riscos
Ver `RISK-REGISTER`. Principal: política de retenção/descarte pendente de
validação jurídica antes de dados reais.

## Resultado
Fase A concluída e aprovada (CTO + PO). Fase B materializada nesta Sprint.

## Pendências
Validação jurídica (LGPD/OAB) antes de dados reais; escolha de utilidades
(host/DB/storage) antes do piloto real.

## ADRs e requisitos vinculados
ADR-0016, ADR-0017, ADR-0018, ADR-0019; requisitos em `NFR` e
`SPRINT1-IMPLEMENTATION-CONTRACT`.
