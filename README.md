# BRITUS Platform

**Produto 001 da Digital Product Factory (DPF).**
Plataforma de Gestão Jurídica Inteligente — primeiro cliente: **Britus Advocacia**.

> Missão: transformar tecnologia em vantagem competitiva para a Britus Advocacia,
> validando a plataforma no uso real antes de evoluí-la para o mercado (SaaS).

---

## Mapa do monorepo

```
britus-platform/
├── apps/
│   ├── web/          # frontend (React + TS + Vite + Tailwind v4)  — a materializar
│   └── api/          # backend  (Node 22 + TS)                     — a materializar
├── packages/
│   ├── ui/           # design system compartilhado
│   ├── config/       # configurações/presets compartilhados
│   └── types/        # tipos compartilhados (domínio/contratos)
├── tooling/          # automação de engenharia/governança (Nível 2 — Plataforma)
├── scripts/          # scripts pontuais de manutenção
├── docs/             # Sistema de Gestão do Conhecimento (Docs-as-Code)
├── .github/          # CI e templates de colaboração
└── .vscode/          # recomendações de editor compartilhadas
```

## Stack (capacidade → utilidade atual)

| Capacidade | Utilidade atual |
|---|---|
| Runtime | Node.js 24 LTS |
| Linguagem | TypeScript |
| Gerenciador / monorepo | pnpm workspaces |
| Frontend | React + Vite |
| Estilo | Tailwind CSS v4 |
| Banco (capacidade de persistência) | PostgreSQL *(a definir)* |
| Versionamento | Git *(atualmente GitHub)* |

> **Independência evolutiva:** ferramentas são *utilidades*, não arquitetura.
> Trocar uma utilidade não deve exigir reescrever produto ou arquitetura.

## Estado atual

**Etapa 5 — Fundação física.** Estrutura, workspace e padrões criados.
**Sem** funcionalidades: nada de banco, ORM, auth, APIs, telas, IA ou automações
(dependem de especificação técnica das próximas Sprints).

## Por onde começar a ler

1. [`docs/00-foundation/PRODUCT_BRIEF.md`](docs/00-foundation/PRODUCT_BRIEF.md) — o que é o produto e o MVP.
2. [`docs/README.md`](docs/README.md) — organização da documentação.
3. Este README — mapa técnico do repositório.

## Requisitos de desenvolvimento

- Node.js **24 LTS** (ver `.nvmrc`)
- pnpm **≥ 11**

## Comandos

```bash
pnpm format         # formata o repositório (Prettier)
pnpm format:check   # verifica formatação
pnpm typecheck      # checagem de tipos (tsc --build)
```

> As dependências ainda **não** foram instaladas nesta etapa (Just-in-Time).
> Rode `pnpm install` quando iniciar o desenvolvimento da Sprint 1.

## Licença

Proprietária — todos os direitos reservados (ver `LICENSE`; definição formal pendente do Product Owner).
