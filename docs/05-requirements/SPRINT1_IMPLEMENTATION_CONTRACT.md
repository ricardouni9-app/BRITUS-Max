---
id: DOC-SPRINT1-CONTRACT
title: Sprint 1 Implementation Contract — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Produto
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [SPR-0009, DOC-DOMAIN-MODEL, DOC-DATA-MODEL, DOC-API-CONTRACTS, DOC-NFR]
---

# Sprint 1 Implementation Contract — Núcleo Operacional

Contrato preciso para impedir decisões arquiteturais improvisadas durante a implementação.

## Escopo (fluxo "atender um cliente")
Cliente → Atendimento → conversão em Caso → vínculo participantes → Documentos →
Timeline → Encerramento → Dashboard operacional. Começar por **Cliente + Atendimento/Caso + vínculo** (núcleo utilizável).

## Fora de escopo
IA/Assistente, automações, Base de Conhecimento, billing/planos/pagamentos, admin de
tenants, API pública, Licitações, MFA, rotina automática de descarte.

## Ordem de implementação
1. `packages/db` (schema Drizzle + migrations locais) e `packages/contracts` (Zod).
2. Consolidar `packages/types` em `packages/contracts` (preservar histórico Git; ajustar referências).
3. Módulos da API: `organization/auth` (mínimo) → `clients` → `atendimentos` → `cases` → `participants` → `documents` → `timeline` → `dashboard`.
4. `apps/web`: telas na mesma ordem; `packages/ui` conforme reuso real.

## Pacotes e dependências
Criar `packages/contracts`, `packages/db`; popular `apps/web`, `apps/api`, `packages/ui`,
`packages/config`. **Adiar** `packages/domain`, `auth`, `testing`, `validation`.
Instalar dependências apenas nesta Sprint (não antes). Grafo de dependências: ver Architecture Overview.

## Critérios de aceitação
- Fluxo ponta a ponta utilizável com **dados fictícios**.
- Todo dado nasce com `organization_id`; **teste de isolamento organizacional passa**.
- Todo Caso nasce com área + tipo + classificação financeira.
- Captura Única: dados existentes reutilizados (cliente→atendimento→caso).
- Autorização no servidor (deny-by-default); listagens paginadas.

## Testes (obrigatórios na Sprint 1)
Unit de domínio (máquinas de estado, duplicidade, regras de descarte); integração
API+DB (Postgres real de teste); **isolamento por organização**; contratos (Zod).
Adiados: E2E, a11y automatizada, backup/restore automatizado (manual primeiro). Vitest.

## Segurança
argon2id; cookies httpOnly/secure; deny-by-default; sem segredo no VCS; uploads validados +
hash; **dados reais proibidos** (só fictícios) até as condições do Security & Privacy Baseline.

## Documentação e Definição de Pronto
- Docs atualizados junto ao código (Docs-as-Code).
- DoD: fluxo utilizável + testes passando (incl. isolamento) + docs + sem dívida oculta registrada.

## Proibições
Não antecipar backlog; não implementar SaaS/billing; não usar dados reais; não decidir
arquitetura fora do já aprovado (usar RFC/ADR se necessário).
