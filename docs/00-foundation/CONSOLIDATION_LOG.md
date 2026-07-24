---
id: DOC-CONSOLIDATION-5.1
title: Consolidação da Fundação (Etapa 5.1)
status: Active
consumer: Both
level: Plataforma
date: 2026-07-24
updated: 2026-07-24
---

# Consolidação da Fundação — Etapa 5.1

Registro formal das decisões **operacionais** da consolidação. Escolhas
operacionais pequenas são registradas aqui (não geram uma ADR individual);
decisões que alteram arquitetura vão para `docs/02-decisions/` (ADR).

## Runtime
Node.js 22 → **24 LTS**. Revisão arquitetural formal: `ADR-0003-runtime.md`.
Ambiente confirmado: `node -v` = v24.16.0.

## Lint & Formatação
- **ESLint** adotado para linting (decisão do Arquiteto-Chefe).
- **Prettier** mantido para formatação (separação análise estática × formatação).
- **Biome descartado** neste momento.
- Materialização (instalação/config do ESLint) **adiada** para a Sprint 1, junto
  ao primeiro app funcional (Just-in-Time) — não há código real que justifique regras agora.

## Testes
- **Vitest**: preferência inicial para testes unitários e de integração de baixo nível.
- **Não instalado** nesta etapa; materialização junto ao primeiro código testável.
- **E2E** (Playwright/Cypress): **não decidido** — aguarda especificação.

## Pacotes `domain` e `db`
- **Não criados.** Dependem da modelagem da Sprint 1 (fronteiras de domínio e
  mecanismo de persistência ainda não aprovados). Permanecem como **recomendação** para a Sprint 1.

## Licença
- Proprietária **provisória**; titular provisório **Britus Advocacia**.
- **Pendência formal:** confirmar o titular jurídico definitivo (instrumento
  jurídico; razão social/CNPJ não presumidos).

## CODEOWNERS
- **Sem proprietário definido** (handle do GitHub não confirmado). Arquivo mantido
  apenas com comentário explicativo — escolha mais limpa que registrar owner presumido
  e mais rastreável que remover o arquivo.

## Commit inicial
- Autorizado (local). **Sem remoto, sem push.** Mensagem: `chore: materialize initial project foundation`.

## Itens deliberadamente adiados (Just-in-Time)
- `pnpm install` / dependências; config de ESLint e Vitest; CI efetiva (requer deps + remoto);
  `packages/domain` e `packages/db`; geração de `AI_INDEX`/`llms.txt` via `tooling`;
  templates de documentos.
