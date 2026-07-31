# @britus/db

Fronteira de **persistência** da BRITUS Platform: infraestrutura de banco
**PostgreSQL + Drizzle** (configuração, pool, cliente, ambiente e migrations).

## Estado atual (MACRO PACOTE 013 — fundação de persistência multiorganizacional)

- **Schemas materializados:** `organizations`, `clients`, `atendimentos`, `cases`
  (`src/schema/`). Entidades operacionais são **tenant-aware** (`organization_id`
  obrigatório), com FKs coerentes, índices por organização e **unicidade documental
  parcial por organização** (`(organization_id, cpf|cnpj) WHERE ... is not null`).
- **Adapters Drizzle** dos ports do workflow (`src/adapters/`): Client, Atendimento e
  Case — **sempre org-scoped**; `findById` só retorna dentro da organização, a conversão
  atinge apenas a própria organização; erros de infraestrutura são **traduzidos** sem
  vazar SQL/detalhes.
- **Migrations GERADAS, NÃO APLICADAS:** `0000` (organizations) e `0001`
  (clients/atendimentos/cases). Nenhum banco foi criado ou migrado — não há PostgreSQL
  disponível neste ambiente (bloqueio **ambiental**, não estrutural).
- **Sem conexão automática**: importar `@britus/db` não abre pool, não conecta e não
  exige `DATABASE_URL`. Tudo por **fábricas explícitas**; a escolha memória vs Drizzle é
  feita explicitamente na composição da API.

## API pública

- `getDatabaseUrl(env)` — valida/obtém a `DATABASE_URL` a partir de um objeto de
  ambiente fornecido; lança erro (sem expor a credencial) se ausente/vazia.
- `createDatabasePool(config)` — cria explicitamente o pool `pg`.
- `createDatabaseClient(pool)` — cria explicitamente a instância Drizzle.
- `schema` — namespace dos schemas (`organizations`, `clients`, `atendimentos`, `cases`).
- `createDrizzlePersistence(db)` — compõe os adapters org-scoped dos ports do workflow
  (`clients`, `atendimentos`, `cases`); **não** abre conexão. Também exportados
  individualmente (`createDrizzle{Client,Atendimento,Case}Store`) e `PersistenceError`.

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

Materializado no schema (FKs para `organizations`, índices por `organization_id`,
unicidade documental parcial por organização) e **imposto nos adapters** (toda consulta e
mutação recebe e aplica `organizationId`; nunca por ID global). O contrato comportamental
compartilhado (`@britus/application/testing`) garante que os adapters **em memória** e
**Drizzle** cumpram as mesmas regras observáveis.

**Prova de integração real (bloqueada por ambiente):** o teste
`src/adapters/drizzle-contract.integration.test.ts` executa o mesmo contrato contra
PostgreSQL. Ele só roda com `DATABASE_URL` **e** `BRITUS_DB_TEST_DISPOSABLE=1` (banco
descartável, pois **trunca** as tabelas). Sem isso, é `skip`. Desbloqueio: subir um
Postgres descartável, `db:migrate`, então `DATABASE_URL=… BRITUS_DB_TEST_DISPOSABLE=1 pnpm test`.
