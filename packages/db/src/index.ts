// @britus/db — fronteira de persistência (PostgreSQL + Drizzle).
//
// Exporta apenas fábricas explícitas: importar este pacote NÃO abre conexão, não
// cria pool e não exige DATABASE_URL. Ver README e ADR-0017.
export { getDatabaseUrl } from "./env.js";
export type { DatabaseEnv } from "./env.js";
export { createDatabasePool } from "./pool.js";
export { createDatabaseClient } from "./client.js";
export * as schema from "./schema/index.js";
