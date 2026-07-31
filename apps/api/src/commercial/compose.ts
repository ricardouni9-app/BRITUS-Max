import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";
import {
  makeCreateClient,
  makeRegisterAtendimento,
  makeOpenCase,
  makeConvertAtendimentoToClient,
  withAuthorization,
  makeAuthorizationGuard,
  createInMemoryAuditLog,
  makeAuthenticator,
  type Authenticator,
  type MembershipReader,
} from "@britus/application";
import {
  createDatabasePool,
  createDatabaseClient,
  createDrizzleAuthStores,
  createDrizzleClientStore,
  createDrizzleAtendimentoStore,
  createDrizzleCaseStore,
} from "@britus/db";
import { buildApp } from "../app.js";
import { createInMemoryClientStore } from "../modules/client/in-memory-store.js";
import { createInMemoryAtendimentoStore } from "../modules/atendimento/in-memory-store.js";
import { createInMemoryCaseStore } from "../modules/case/in-memory-store.js";
import { createInMemoryAuthStores } from "../auth/in-memory.js";
import { createArgon2PasswordHasher, createSessionTokenFactory, createDummyPasswordHash } from "../auth/crypto.js";

export interface CommercialOptions {
  readonly backend: "memory" | "postgres";
  readonly databaseUrl?: string;
  readonly secureCookie: boolean;
  readonly sessionTtlSeconds: number;
  readonly logger?: boolean | { level: string };
  // Operador de demonstração (apenas backend memory) — provisionado em memória no boot.
  readonly demoOperator?: { email: string; password: string };
}

export interface CommercialApp {
  readonly app: FastifyInstance;
  readonly close: () => Promise<void>;
  // Presente apenas no backend memory quando um operador demo foi provisionado.
  readonly demo?: { email: string; organizationId: string };
}

// Constrói a aplicação COMERCIAL completa (auth real + rotas legítimas + UI) sobre o backend
// escolhido. Mesmos ports/casos de uso; troca-se apenas o adapter (hexagonal).
export async function composeCommercialApp(opts: CommercialOptions): Promise<CommercialApp> {
  const hasher = createArgon2PasswordHasher();
  const audit = createInMemoryAuditLog();
  const guard = makeAuthorizationGuard({ audit });

  let pool: ReturnType<typeof createDatabasePool> | undefined;
  let authStores: ReturnType<typeof createInMemoryAuthStores> | ReturnType<typeof createDrizzleAuthStores>;
  let clients: ReturnType<typeof createInMemoryClientStore> | ReturnType<typeof createDrizzleClientStore>;
  let atendimentos: ReturnType<typeof createInMemoryAtendimentoStore> | ReturnType<typeof createDrizzleAtendimentoStore>;
  let cases: ReturnType<typeof createInMemoryCaseStore> | ReturnType<typeof createDrizzleCaseStore>;
  let seeds: ReturnType<typeof createInMemoryAuthStores> | undefined;
  let demo: { email: string; organizationId: string } | undefined;

  if (opts.backend === "postgres") {
    if (!opts.databaseUrl) throw new Error("databaseUrl obrigatório no backend postgres");
    pool = createDatabasePool({ connectionString: opts.databaseUrl });
    const db = createDatabaseClient(pool);
    authStores = createDrizzleAuthStores(db);
    clients = createDrizzleClientStore(db);
    atendimentos = createDrizzleAtendimentoStore(db);
    cases = createDrizzleCaseStore(db);
  } else {
    const mem = createInMemoryAuthStores();
    seeds = mem;
    authStores = mem;
    clients = createInMemoryClientStore();
    atendimentos = createInMemoryAtendimentoStore();
    cases = createInMemoryCaseStore();
  }

  const authenticator: Authenticator = makeAuthenticator({
    identities: authStores.identities,
    credentials: authStores.credentials,
    memberships: authStores.memberships,
    sessions: authStores.sessions,
    audit,
    hasher,
    tokens: createSessionTokenFactory(),
    sessionTtlMs: opts.sessionTtlSeconds * 1000,
    dummyHash: createDummyPasswordHash(),
  });

  const createClient = makeCreateClient({ clients, duplicates: clients });
  const authorizedCreateClient = withAuthorization(createClient, { action: "client.create", resourceType: "client" }, { guard });
  const authorizedRegisterAtendimento = withAuthorization(makeRegisterAtendimento({ atendimentos }), { action: "atendimento.register", resourceType: "atendimento" }, { guard });
  const authorizedOpenCase = withAuthorization(makeOpenCase({ cases, atendimentos }), { action: "case.open", resourceType: "case" }, { guard });
  const authorizedConvert = withAuthorization(makeConvertAtendimentoToClient({ atendimentos, createClient }), { action: "client.create", resourceType: "client" }, { guard });

  // Operador de demonstração — SOMENTE backend memory, provisionado em memória (nunca via HTTP).
  if (seeds !== undefined && opts.demoOperator !== undefined) {
    const organizationId = uuidv7();
    const user = seeds.seedUser({ name: "Operador", email: opts.demoOperator.email.toLowerCase() });
    seeds.seedCredential({ subjectType: "user", subjectId: user.id, secretHash: await hasher.hash(opts.demoOperator.password), algorithm: hasher.algorithm });
    seeds.seedMembership({ organizationId, userId: user.id, role: "owner" });
    demo = { email: opts.demoOperator.email, organizationId };
  }

  const app = buildApp({
    logger: opts.logger,
    auth: {
      authenticator,
      authorizedCreateClient,
      secureCookie: opts.secureCookie,
      sessionTtlSeconds: opts.sessionTtlSeconds,
    },
    commercial: {
      authenticator,
      memberships: authStores.memberships as MembershipReader,
      authorizedRegisterAtendimento,
      authorizedOpenCase,
      authorizedConvert,
      serveUi: true,
    },
  });

  const close = async (): Promise<void> => {
    await app.close();
    if (pool) await pool.end();
  };

  return { app, close, demo };
}
