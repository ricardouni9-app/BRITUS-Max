# Changelog

Todas as mudanças relevantes da BRITUS Platform são registradas aqui.
Formato baseado em *Keep a Changelog*; versionamento segue *SemVer*.

## [Unreleased]

### Changed
- **Runtime oficial revisado de Node.js 22 LTS para Node.js 24 LTS** (Etapa 5.1;
  ver `docs/02-decisions/ADR-0003-runtime.md`). Atualizados `.nvmrc`, `engines`,
  CI e documentação.

### Added
- **Etapa 5 — Fundação física do monorepo:** estrutura de diretórios
  (`apps/`, `packages/`, `tooling/`, `scripts/`, `docs/`), workspace pnpm,
  base TypeScript, arquivos de padronização (Prettier, EditorConfig, gitattributes)
  e reprodutibilidade (`.nvmrc`, `engines`), esqueleto de documentação,
  CI mínima e registro do `PRODUCT_BRIEF.md` v1.0 como primeiro artefato oficial.
