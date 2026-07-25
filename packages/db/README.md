# @britus/db

Fronteira de **persistência** da BRITUS Platform: infraestrutura de banco
**PostgreSQL + Drizzle** (configuração, pool, cliente, ambiente e migrations).

## Estado atual (Etapa 2 — somente infraestrutura)

- **Sem tabelas de produto** (Opção A). O barrel `src/schema/index.ts` está vazio;
  as tabelas começam na Etapa 3.
- **Sem conexão automática**: importar `@britus/db` não abre pool, não conecta e
  não exige `DATABASE_URL`. Tudo é feito por **fábricas explícitas**.

## API pública

- `getDatabaseUrl(env)` — valida/obtém a `DATABASE_URL` a partir de um objeto de
  ambiente fornecido; lança erro (sem expor a credencial) se ausente/vazia.
- `createDatabasePool(config)` — cria explicitamente o pool `pg`.
- `createDatabaseClient(pool)` — cria explicitamente a instância Drizzle.
- `schema` — namespace do schema (vazio nesta etapa).

## Ambiente

- Variável: `DATABASE_URL` (ver [`.env.example`](../../.env.example)).
- O carregamento de `.env` local é explícito (ex.: `node --env-file`); este pacote
  **não** depende de `dotenv` nem carrega `.env` automaticamente.

## Migrations

- `pnpm --filter @britus/db run db:generate` — gera migrations SQL versionadas.
- `pnpm --filter @britus/db run db:migrate` — aplica migrations (exige `DATABASE_URL`).
- Política (forward-only, revisão antes de aplicar, sem edição de migration aplicada):
  ver [`RELIABILITY_BASELINE`](../../docs/13-operations/RELIABILITY_BASELINE.md) e
  [`SECURITY_PRIVACY_BASELINE`](../../docs/12-security/SECURITY_PRIVACY_BASELINE.md).

## Isolamento por organização

Tabelas tenant-scoped seguirão o [ADR-0017](../../docs/02-decisions/ADR-0017-multitenancy-organization.md).
A implementação começa na **Etapa 3**; este pacote ainda **não** oferece isolamento
materializado.
