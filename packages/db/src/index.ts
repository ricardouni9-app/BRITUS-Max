// @britus/db — fronteira de persistência (PostgreSQL + Drizzle).
//
// Exporta apenas fábricas explícitas: importar este pacote NÃO abre conexão, não
// cria pool e não exige DATABASE_URL. Ver README e ADR-0017.
export { getDatabaseUrl } from "./env.js";
export type { DatabaseEnv } from "./env.js";
export { createDatabasePool } from "./pool.js";
export { createDatabaseClient } from "./client.js";
export * as schema from "./schema/index.js";
export {
  createDrizzlePersistence,
  createDrizzleClientStore,
  createDrizzleAtendimentoStore,
  createDrizzleCaseStore,
  PersistenceError,
  type DrizzlePersistence,
} from "./adapters/index.js";
export {
  createDrizzleAuthStores,
  createDrizzleIdentityReader,
  createDrizzleMembershipReader,
  createDrizzleCredentialStore,
  createDrizzleCredentialWriter,
  createDrizzleAuthWriters,
  createDrizzleSessionStore,
  type DrizzleAuthStores,
  type DrizzleAuthWriters,
} from "./adapters/index.js";
export {
  createDrizzleBillingStores,
  createDrizzleCatalog,
  createDrizzleSubscriptionStore,
  createDrizzlePaymentStore,
  createDrizzleWebhookEventStore,
  type DrizzleBillingStores,
  type DrizzleCatalog,
} from "./adapters/index.js";
export {
  createDrizzleCaseReader,
  createDrizzleCaseTaskStore,
  createDrizzleDashboardReader,
} from "./adapters/index.js";
