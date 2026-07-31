---
id: DOC-AI-INDEX
title: AI Index — ponto de entrada para IAs
status: Active
version: 1.0
consumer: AI
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-25
updated: 2026-07-25
related: [DOC-PROJECT-CHARTER, DOC-PRODUCT-BRIEF, DOC-ARCH-OVERVIEW]
---

# AI Index — Britus

> Ponto de entrada para qualquer IA que atue no projeto. **Leia antes de agir.**
> (Este documento é mantido à mão por ora; idealmente será **gerado por tooling**
> — ADR-0009 — quando `@britus/tooling` existir.)

## O que é o projeto
**Britus — Gestão Simplificada da Advocacia**: software de gestão jurídica instalável
no ambiente do cliente, com **dados sob custódia do cliente** (ADR-0021). Core
universal + módulos acopláveis (ADR-0020). Ver `docs/00-foundation/PROJECT_CHARTER.md`.

## Ordem de leitura
0. **`docs/00-foundation/MASTER_CONSOLIDATED_REPORT.md`** — âncora de governança, limites,
   estado e continuidade (**ler primeiro**).
1. `docs/00-foundation/PROJECT_CHARTER.md` e `PRODUCT_BRIEF.md`
2. `docs/06-domain/GLOSSARY.md` e `DOMAIN_MODEL.md`
3. `docs/07-architecture/ARCHITECTURE_OVERVIEW.md`
4. `docs/02-decisions/` (ADRs) — **atenção às supersessões**
5. `docs/05-requirements/`, `docs/12-security/`, `docs/13-operations/`
6. `docs/15-roadmap/ROADMAP.md` e `BACKLOG.md`

## Decisões arquiteturais vigentes (destaques)
- **ADR-0020** Core universal + módulos acopláveis.
- **ADR-0021** Custódia local dos dados (**supersede ADR-0016 e ADR-0017**).
- **ADR-0022** Licenciamento/distribuição de módulos.
- **ADR-0018** REST + contratos Zod (Active, complementado: não pressupõe hospedagem).
- **ADR-0019** Atendimento × Caso + Registro Comercial Mínimo.
- **Superseded:** ADR-0016 (deploy hospedado), ADR-0017 (multitenancy de servidor).

## Estado atual
Sprint 1 em andamento. Etapas concluídas: 0.9 (arquitetura), 1 (workspace), 2 (banco).
Etapa 2.5: consolidação documental (esta). **Não** avançar para entidades de negócio
sem autorização. Índice de decisões: `docs/02-decisions/README.md`.

Estado técnico consolidado (Macro Pacotes 004–011, **relatado e auditado conceitualmente**):
ver `docs/00-foundation/MASTER_CONSOLIDATED_REPORT.md` §12. Limites inultrapassáveis e
protocolo de dúvidas/alteração: §§6–9 do mesmo documento.
