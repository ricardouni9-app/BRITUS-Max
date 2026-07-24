# @britus/tooling

Automação de **engenharia e governança** da Digital Product Factory — tratada
como **módulo de produto** de primeira classe (Nível 2 — Plataforma), não como
mero suporte.

## Responsabilidade (a implementar sob demanda — Just-in-Time)

- Geração de IDs (ADR, RF, RNF, MOD, …) e registro central.
- Geração do grafo de conhecimento e índices derivados (AI_INDEX, llms.txt).
- Validação documental (front-matter) e validação arquitetural (fronteiras, ciclos).
- Scaffolds (novos módulos a partir de templates).

## Fronteira vs `scripts/`

- **`tooling/`** = automação durável, versionada, de qualidade de produto (workspace package).
- **`scripts/`** = scripts simples e pontuais de manutenção do repositório.

> **Estado atual:** apenas o espaço estrutural. Nada implementado nesta etapa.
