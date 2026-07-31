import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  createDatabasePool,
  createDatabaseClient,
  createDrizzleAuthStores,
  createDrizzleClientStore,
  createDrizzleBillingStores,
  createDrizzleCaseStore,
  createDrizzleCaseReader,
  createDrizzleCaseTaskStore,
  createDrizzleDashboardReader,
} from "@britus/db";
import {
  makeAuthenticator,
  makeCreateClient,
  makeAuthorizationGuard,
  withAuthorization,
  createInMemoryAuditLog,
  makeStartTrial,
  makeContractModules,
  makeResolveEntitlements,
  makeProcessWebhook,
  makeCreateCaseTask,
  makeListCaseTasks,
  makeCompleteCaseTask,
  makeCaseDashboard,
} from "@britus/application";
import { buildApp } from "../app.js";
import { createArgon2PasswordHasher, createSessionTokenFactory, createDummyPasswordHash } from "../auth/crypto.js";
import { runBootstrap } from "../auth/bootstrap.js";
import { createFakeGateway } from "../billing/providers.js";

const url = process.env.DATABASE_URL;
const shouldRun = typeof url === "string" && url.length > 0 && process.env.BRITUS_DB_TEST_DISPOSABLE === "1";
const suite = shouldRun ? describe : describe.skip;

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const AREA = "01920000-0000-7000-8000-000000000000";
const FAKE_SECRET = "fake-webhook-secret";

suite("MISSÃO FINAL — integração PostgreSQL (workflow jurídico + SaaS)", () => {
  let pool: Pool;
  let db: ReturnType<typeof createDatabaseClient>;
  const hasher = createArgon2PasswordHasher();

  beforeAll(() => {
    pool = createDatabasePool({ connectionString: url });
    db = createDatabaseClient(pool);
  });
  afterAll(async () => {
    await pool.end();
  });

  async function reset(): Promise<void> {
    await pool.query(
      "truncate table case_tasks, webhook_events, payment_transactions, subscription_items, subscriptions, payment_customer_references, product_modules, sessions, credentials, organization_memberships, platform_identities, users, cases, atendimentos, clients, organizations restart identity cascade",
    );
    await pool.query("insert into organizations (id,name,status) values ($1,'A','active'),($2,'B','active')", [ORG_A, ORG_B]);
    const billing = createDrizzleBillingStores(db);
    await billing.catalog.ensureModule({ code: "cases", name: "Casos", priceCents: 3000, currency: "BRL", active: true });
  }

  function compose() {
    const authStores = createDrizzleAuthStores(db);
    const billing = createDrizzleBillingStores(db);
    const audit = createInMemoryAuditLog();
    const guard = makeAuthorizationGuard({ audit });
    const authenticator = makeAuthenticator({
      identities: authStores.identities,
      credentials: authStores.credentials,
      memberships: authStores.memberships,
      sessions: authStores.sessions,
      audit,
      hasher,
      tokens: createSessionTokenFactory(),
      sessionTtlMs: 3600_000,
      dummyHash: createDummyPasswordHash(),
    });
    const entitlements = makeResolveEntitlements({ subscriptions: billing.subscriptions });
    const app = buildApp({
      auth: {
        authenticator,
        authorizedCreateClient: withAuthorization(makeCreateClient({ clients: createDrizzleClientStore(db), duplicates: createDrizzleClientStore(db) }), { action: "client.create", resourceType: "client" }, { guard }),
        secureCookie: false,
        sessionTtlSeconds: 3600,
      },
      billing: {
        catalog: billing.catalog,
        subscriptions: billing.subscriptions,
        startTrial: makeStartTrial({ subscriptions: billing.subscriptions }),
        contractModules: makeContractModules({ subscriptions: billing.subscriptions, catalog: billing.catalog }),
        resolveEntitlements: entitlements,
        webhookProcessors: { fake: makeProcessWebhook({ gateway: createFakeGateway(FAKE_SECRET), webhookEvents: billing.webhookEvents, payments: billing.payments, subscriptions: billing.subscriptions }) },
        authenticator,
      },
      workflow: {
        authenticator,
        createCaseTask: makeCreateCaseTask({ tasks: createDrizzleCaseTaskStore(db), cases: createDrizzleCaseReader(db), entitlements }),
        listCaseTasks: makeListCaseTasks({ tasks: createDrizzleCaseTaskStore(db), cases: createDrizzleCaseReader(db) }),
        completeCaseTask: makeCompleteCaseTask({ tasks: createDrizzleCaseTaskStore(db) }),
        dashboard: makeCaseDashboard({ dashboard: createDrizzleDashboardReader(db) }),
      },
    });
    return app;
  }

  async function loginHeaders(app: ReturnType<typeof buildApp>, organizationId = ORG_A) {
    await runBootstrap(
      { writers: createDrizzleAuthStores(db).writers, credentials: createDrizzleAuthStores(db).credentials, credentialWriter: createDrizzleAuthStores(db).credentialWriter, hasher },
      { organizationId, operator: { name: "Ricardo", email: `op-${organizationId}@b.test`, password: "s3nha-forte-1", role: "owner" } },
    );
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: `op-${organizationId}@b.test`, password: "s3nha-forte-1" } });
    const raw = login.headers["set-cookie"];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(";")[0];
    const headers = { cookie, "x-csrf-token": String(login.json().csrfToken) };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId } });
    return headers;
  }

  async function seedCase(organizationId = ORG_A): Promise<string> {
    const c = await createDrizzleCaseStore(db).create(organizationId, { areaId: AREA, workTypeId: AREA, title: "Ação", financialClassification: "medio" });
    return c.id;
  }

  it("fluxo completo: trial → contrata 'cases' → cria prazo → conclui → dashboard; entitlement e tenancy aplicados", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    await app.inject({ method: "POST", url: "/billing/trial", headers });
    const caseId = await seedCase();

    // Sem contratar o módulo → 403 (entitlement gate).
    const blocked = await app.inject({ method: "POST", url: `/cases/${caseId}/tasks`, headers, payload: { kind: "task", title: "X" } });
    expect(blocked.statusCode).toBe(403);

    // Contrata 'cases' → entitlement ativo (trial).
    await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["cases"] } });
    const created = await app.inject({ method: "POST", url: `/cases/${caseId}/tasks`, headers, payload: { kind: "deadline", title: "Contestação", dueAt: "2020-01-01T00:00:00.000Z" } });
    expect(created.statusCode).toBe(201);
    expect(created.json().organizationId).toBe(ORG_A);
    const taskId = created.json().id;

    const listed = await app.inject({ method: "GET", url: `/cases/${caseId}/tasks`, headers });
    expect(listed.json().tasks).toHaveLength(1);

    // Dashboard: 1 caso aberto, 1 tarefa aberta, 1 prazo vencido.
    const dash = await app.inject({ method: "GET", url: "/dashboard", headers });
    expect(dash.json()).toMatchObject({ openCases: 1, openTasks: 1, overdueDeadlines: 1 });

    // Concluir → done; reconcluir → 409.
    expect((await app.inject({ method: "POST", url: `/tasks/${taskId}/complete`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: `/tasks/${taskId}/complete`, headers })).statusCode).toBe(409);
    await app.close();
  });

  it("tenancy: caso de outra organização → NOT_FOUND (não vaza existência); tarefa isolada por org", async () => {
    await reset();
    const app = compose();
    const headersA = await loginHeaders(app, ORG_A);
    await app.inject({ method: "POST", url: "/billing/trial", headers: headersA });
    await app.inject({ method: "POST", url: "/billing/subscription", headers: headersA, payload: { moduleCodes: ["cases"] } });
    const caseB = await seedCase(ORG_B); // caso pertence à org B
    const cross = await app.inject({ method: "POST", url: `/cases/${caseB}/tasks`, headers: headersA, payload: { kind: "task", title: "X" } });
    expect(cross.statusCode).toBe(404);
    await app.close();
  });
});
