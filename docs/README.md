# Documentação — BRITUS Platform

A documentação é tratada como **código** (Docs-as-Code): versiona junto com o
repositório, é revisada em Pull Request e é fonte única de verdade por assunto
(**Single Source of Truth**).

## Estado atual (início enxuto — Product First / Just-in-Time)

Criamos apenas o necessário para a fundação:

```
docs/
├── 00-foundation/
│   └── PRODUCT_BRIEF.md   # o que é o produto, MVP, KPIs (v1.0 aprovado)
└── _templates/            # modelos de artefatos (a preencher)
```

## Organização definitiva (proposta — a expandir sob demanda)

A taxonomia numérica completa (00–99: architecture, decisions/ADR, rfc,
sprints, requirements, domain, database, api, frontend, backend, security,
operations, business, roadmap, ai, testing, deployment, diagrams, meetings)
foi **aprovada conceitualmente**, mas **não** será materializada de uma vez:
cada pasta nasce quando o primeiro documento real dela existir. Criar 20 pastas
vazias hoje seria estrutura ociosa (contra Just-in-Time).

## Regras

- Todo documento oficial nasce de um **template** (`_templates/`).
- Todo documento começa com **front-matter YAML** (id, título, status, consumidor…).
- Documentos que representam **estado** (índices, listas, grafos) serão
  **gerados** por `@britus/tooling`, nunca mantidos à mão.

## Ordem de leitura recomendada

1. `00-foundation/PRODUCT_BRIEF.md`
2. (futuro) `01-architecture/` → `02-decisions/` (ADRs) → `04-sprints/`

## Como adicionar um novo documento

1. Gere o ID e parta do template correspondente.
2. Preencha o front-matter.
3. Abra um PR; a documentação acompanha a mudança de código que a origina.
