# @britus/config

Configurações **compartilhadas** da BRITUS Platform, centralizadas para que
apps e pacotes herdem os mesmos padrões (uma mudança, um lugar).

## Conteúdo previsto (adicionado sob demanda)

- Presets de TypeScript por tipo de projeto (base já vive em `tsconfig.base.json` na raiz).
- Preset do formatter (Prettier) — hoje na raiz; pode ser centralizado aqui se crescer.
- Preset do linter — **ESLint** (decidido pelo Arquiteto-Chefe; materialização na Sprint 1, junto ao primeiro app). Prettier segue como formatador.

> **Estado atual:** apenas o espaço estrutural. Presets serão movidos/adicionados
> quando houver mais de um consumidor real (Just-in-Time).
