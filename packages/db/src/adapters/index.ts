import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  ClientRepository,
  ClientDuplicateChecker,
  AtendimentoRepository,
  AtendimentoLookup,
  AtendimentoConverter,
  CaseRepository,
} from "@britus/application";
import { createDrizzleClientStore } from "./client-store.js";
import { createDrizzleAtendimentoStore } from "./atendimento-store.js";
import { createDrizzleCaseStore } from "./case-store.js";

// Conjunto de adapters persistentes (ports do workflow operacional), org-scoped.
export interface DrizzlePersistence {
  readonly clients: ClientRepository & ClientDuplicateChecker;
  readonly atendimentos: AtendimentoRepository & AtendimentoLookup & AtendimentoConverter;
  readonly cases: CaseRepository;
}

// Composição EXPLÍCITA dos adapters Drizzle a partir de uma instância Drizzle já criada.
// A escolha memória vs Drizzle é feita explicitamente na composição da API — sem service
// locator nem dependência oculta. NÃO abre conexão aqui.
export function createDrizzlePersistence(db: NodePgDatabase): DrizzlePersistence {
  return {
    clients: createDrizzleClientStore(db),
    atendimentos: createDrizzleAtendimentoStore(db),
    cases: createDrizzleCaseStore(db),
  };
}

export { createDrizzleClientStore } from "./client-store.js";
export { createDrizzleAtendimentoStore } from "./atendimento-store.js";
export { createDrizzleCaseStore } from "./case-store.js";
export { PersistenceError, translatePersistenceError } from "./errors.js";
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
} from "./auth-stores.js";
export {
  createDrizzleBillingStores,
  createDrizzleCatalog,
  createDrizzleSubscriptionStore,
  createDrizzlePaymentStore,
  createDrizzleWebhookEventStore,
  type DrizzleBillingStores,
  type DrizzleCatalog,
} from "./billing-stores.js";
export {
  createDrizzleCaseReader,
  createDrizzleCaseTaskStore,
  createDrizzleDashboardReader,
} from "./case-task-stores.js";
