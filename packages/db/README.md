# @britus/db

Fronteira de **persistência** da BRITUS Platform: schema **Drizzle**, migrations,
conexão, transações e repositories (PostgreSQL).

**Não** contém regras de negócio nem contratos de API (esses ficam em
`@britus/contracts` e nos módulos de `apps/api`).

> **Estado atual (Etapa 1):** skeleton estrutural (`export {}`). Sem conexão,
> schema, migrations ou credenciais. Drizzle entra na etapa "banco".
