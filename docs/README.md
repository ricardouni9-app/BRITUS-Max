---
id: DOC-DOCS-INDEX
title: Índice da Documentação — BRITUS Platform
status: Active
consumer: Both
updated: 2026-07-25
---

# Documentação — BRITUS Platform

A documentação é tratada como **código** (Docs-as-Code): versiona junto com o
repositório, é revisada em Pull Request e é fonte única de verdade por assunto
(**Single Source of Truth**).

## Estado atual

```
(raiz)  AI_INDEX.md — ponto de entrada para IAs

docs/
├── 00-foundation/    MASTER_CONSOLIDATED_REPORT, PROJECT_CHARTER, PRODUCT_BRIEF, CONSOLIDATION_LOG
├── 01-governance/    RISK_REGISTER (+ Open Questions)
├── 02-decisions/     ADRs (índice + ADR-0003, 0016–0022)
├── 04-sprints/       SPR-0009
├── 05-requirements/  NFR, PRODUCT_REQUIREMENTS, SPRINT1_IMPLEMENTATION_CONTRACT
├── 06-domain/        DOMAIN_MODEL, GLOSSARY
├── 07-architecture/  ARCHITECTURE_OVERVIEW
├── 08-database/      DATA_MODEL (ER)
├── 09-api/           CONTRACTS
├── 12-security/      SECURITY_PRIVACY_BASELINE
├── 13-operations/    RELIABILITY_BASELINE
├── 14-business/      BUSINESS_MODEL
├── 15-roadmap/       ROADMAP, BACKLOG
└── _templates/       ADR (+ outros a criar)
```

## Organização definitiva (taxonomia aprovada)

A taxonomia numérica aprovada (00-foundation, 01-governance, 02-decisions,
03-rfc, 04-sprints, 05-requirements, 06-domain, 07-architecture, 08-database,
09-api, 10-frontend, 11-backend, 12-security, 13-operations, 14-business,
15-roadmap, 16-ai, 17-testing, 18-deployment, 19-diagrams, 20-meetings,
`_templates`, `_archive`) é a referência. Cada pasta **nasce quando o primeiro
documento real dela existir** (Just-in-Time) — não se criam pastas vazias.

## Regras

- Todo documento oficial nasce de um **template** (`_templates/`).
- Todo documento começa com **front-matter YAML** (id, título, status, consumidor…).
- Documentos que representam **estado** (índices, listas, grafos) serão
  **gerados** por `@britus/tooling`, nunca mantidos à mão.

## Ordem de leitura recomendada

0. `00-foundation/MASTER_CONSOLIDATED_REPORT.md` — âncora de governança, limites, estado e continuidade
1. `AI_INDEX.md` (raiz) e `00-foundation/PROJECT_CHARTER.md`
2. `00-foundation/PRODUCT_BRIEF.md` e `06-domain/GLOSSARY.md`
3. `07-architecture/ARCHITECTURE_OVERVIEW.md`
4. `06-domain/DOMAIN_MODEL.md` → `08-database/DATA_MODEL.md` → `09-api/CONTRACTS.md`
5. `12-security/SECURITY_PRIVACY_BASELINE.md` → `13-operations/RELIABILITY_BASELINE.md`
6. `05-requirements/` (NFR, PRODUCT_REQUIREMENTS, Sprint 1 Contract) e `02-decisions/` (ADRs)
7. `14-business/BUSINESS_MODEL.md`, `15-roadmap/ROADMAP.md`+`BACKLOG.md`, `01-governance/RISK_REGISTER.md`

## Como adicionar um novo documento

1. Gere o ID e parta do template correspondente.
2. Preencha o front-matter.
3. Abra um PR; a documentação acompanha a mudança de código que a origina.
