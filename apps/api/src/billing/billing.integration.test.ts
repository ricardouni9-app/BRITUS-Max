import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { createHmac } from "node:crypto";
import {
  createDatabasePool,
  createDatabaseClient,
  createDrizzleAuthStores,
  createDrizzleClientStore,
  createDrizzleBillingStores,
  type DrizzleBillingStores,
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
  type NormalizedBillingEvent,
} from "@britus/application";
import { buildApp } from "../app.js";
import { createArgon2PasswordHasher, createSessionTokenFactory, createDummyPasswordHash } from "../auth/crypto.js";
import { runBootstrap } from "../auth/bootstrap.js";
import { createFakeGateway } from "./providers.js";

const url = process.env.DATABASE_URL;
const shouldRun = typeof url === "string" && url.length > 0 && process.env.BRITUS_DB_TEST_DISPOSABLE === "1";
const suite = shouldRun ? describe : describe.skip;

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const FAKE_SECRET = "fake-webhook-secret";

const MODULES = [
  { code: "clients", name: "Clientes", priceCents: 5000, currency: "BRL" as const, active: true },
  { code: "cases", name: "Casos", priceCents: 3000, currency: "BRL" as const, active: true },
];

suite("MP-015 — integração PostgreSQL (billing SaaS)", () => {
  let pool: Pool;
  let db: ReturnType<typeof createDatabaseClient>;
  let billing: DrizzleBillingStores;
  const hasher = createArgon2PasswordHasher();

  beforeAll(() => {
    pool = createDatabasePool({ connectionString: url });
    db = createDatabaseClient(pool);
    billing = createDrizzleBillingStores(db);
  });
  afterAll(async () => {
    await pool.end();
  });

  async function reset(): Promise<void> {
    await pool.query(
      "truncate table webhook_events, payment_transactions, subscription_items, subscriptions, payment_customer_references, product_modules, sessions, credentials, organization_memberships, platform_identities, users, cases, atendimentos, clients, organizations restart identity cascade",
    );
    await pool.query("insert into organizations (id,name,status) values ($1,'Org A','active'),($2,'Org B','active')", [ORG_A, ORG_B]);
    for (const m of MODULES) await billing.catalog.ensureModule(m);
  }

  function compose() {
    const authStores = createDrizzleAuthStores(db);
    const clientStore = createDrizzleClientStore(db);
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
    const gateway = createFakeGateway(FAKE_SECRET);
    const app = buildApp({
      auth: {
        authenticator,
        authorizedCreateClient: withAuthorization(
          makeCreateClient({ clients: clientStore, duplicates: clientStore }),
          { action: "client.create", resourceType: "client" },
          { guard },
        ),
        secureCookie: false,
        sessionTtlSeconds: 3600,
      },
      billing: {
        catalog: billing.catalog,
        subscriptions: billing.subscriptions,
        startTrial: makeStartTrial({ subscriptions: billing.subscriptions }),
        contractModules: makeContractModules({ subscriptions: billing.subscriptions, catalog: billing.catalog }),
        resolveEntitlements: makeResolveEntitlements({ subscriptions: billing.subscriptions }),
        webhookProcessors: {
          fake: makeProcessWebhook({ gateway, webhookEvents: billing.webhookEvents, payments: billing.payments, subscriptions: billing.subscriptions }),
        },
        authenticator,
      },
    });
    return app;
  }

  async function loginHeaders(app: ReturnType<typeof buildApp>) {
    await runBootstrap(
      { writers: createDrizzleAuthStores(db).writers, credentials: createDrizzleAuthStores(db).credentials, credentialWriter: createDrizzleAuthStores(db).credentialWriter, hasher },
      { organizationId: ORG_A, operator: { name: "Ricardo", email: "r@b.test", password: "s3nha-forte-1", role: "owner" } },
    );
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "s3nha-forte-1" } });
    const raw = login.headers["set-cookie"];
    const cookie = String(Array.isArray(raw) ? raw[0] : raw).split(";")[0];
    const headers = { cookie, "x-csrf-token": String(login.json().csrfToken) };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    return headers;
  }

  function webhook(eventId: string, status: "approved" | "pending", organizationId = ORG_A) {
    const evt: NormalizedBillingEvent = {
      externalEventId: eventId,
      type: "payment.updated",
      payment: { externalPaymentId: `pay-${eventId}`, amountCents: 8000, currency: "BRL", status, organizationId },
    };
    const raw = JSON.stringify(evt);
    return { payload: evt, sig: createHmac("sha256", FAKE_SECRET).update(raw).digest("hex") };
  }

  it("estrutura: 6 tabelas de billing materializadas", async () => {
    const t = (await pool.query("select tablename from pg_tables where schemaname='public' and tablename in ('product_modules','subscriptions','subscription_items','payment_transactions','webhook_events','payment_customer_references')")).rows;
    expect(t).toHaveLength(6);
  });

  it("catálogo → trial(2d) → contratação(snapshot) → entitlements(trial); mudança de catálogo não altera histórico", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    expect((await app.inject({ method: "GET", url: "/billing/catalog" })).json().modules).toHaveLength(2);
    const trial = await app.inject({ method: "POST", url: "/billing/trial", headers });
    expect(trial.statusCode).toBe(201);
    expect(trial.json().status).toBe("trialing");
    const contract = await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["clients", "cases"] } });
    expect(contract.statusCode).toBe(200);
    expect(contract.json().totalCents).toBe(8000);
    // Snapshot histórico: sobe o preço do catálogo; item contratado permanece.
    await billing.catalog.ensureModule({ ...MODULES[0]!, priceCents: 9999 });
    const sub = await app.inject({ method: "GET", url: "/billing/subscription", headers });
    const clientsItem = sub.json().items.find((i: { moduleCode: string }) => i.moduleCode === "clients");
    expect(clientsItem.priceCents).toBe(5000);
    const ents = await app.inject({ method: "GET", url: "/billing/entitlements", headers });
    const e = ents.json().entitlements.find((x: { moduleCode: string }) => x.moduleCode === "clients");
    expect(e.active).toBe(true);
    expect(e.source).toBe("trial");
    await app.close();
  });

  it("webhook assinado aprovado ativa entitlements (source paid); assinatura inválida recusa", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    await app.inject({ method: "POST", url: "/billing/trial", headers });
    await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["clients"] } });
    const w = webhook("e1", "approved");
    const bad = await app.inject({ method: "POST", url: "/billing/webhook/fake", headers: { "x-fake-signature": "errada" }, payload: w.payload });
    expect(bad.statusCode).toBe(403);
    expect((await pool.query("select count(*)::int n from payment_transactions")).rows[0]?.n).toBe(0);
    const okw = await app.inject({ method: "POST", url: "/billing/webhook/fake", headers: { "x-fake-signature": w.sig }, payload: w.payload });
    expect(okw.statusCode).toBe(200);
    expect((await billing.subscriptions.findByOrganization(ORG_A))?.status).toBe("active");
    const ents = await app.inject({ method: "GET", url: "/billing/entitlements", headers });
    expect(ents.json().entitlements.find((x: { moduleCode: string }) => x.moduleCode === "clients").source).toBe("paid");
    await app.close();
  });

  it("webhook duplicado e CONCORRENTE: efeito no máximo uma vez (unique provider+eventId)", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    await app.inject({ method: "POST", url: "/billing/trial", headers });
    await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["clients"] } });
    const w = webhook("dup", "approved");
    const post = () => app.inject({ method: "POST", url: "/billing/webhook/fake", headers: { "x-fake-signature": w.sig }, payload: w.payload });
    const [a, b] = await Promise.all([post(), post()]);
    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    const dupCount = [a, b].filter((r) => r.json().duplicate === true).length;
    expect(dupCount).toBe(1);
    expect((await pool.query("select count(*)::int n from payment_transactions where external_payment_id='pay-dup'")).rows[0]?.n).toBe(1);
    expect((await pool.query("select count(*)::int n from webhook_events where external_event_id='dup'")).rows[0]?.n).toBe(1);
    await app.close();
  });

  it("tenancy direto no adapter: organização sem assinatura não enxerga a de outra; módulo não contratado bloqueado", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    await app.inject({ method: "POST", url: "/billing/trial", headers });
    await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["clients"] } });
    expect(await billing.subscriptions.findByOrganization(ORG_B)).toBeNull();
    const ents = makeResolveEntitlements({ subscriptions: billing.subscriptions });
    expect(await ents.has(ORG_A, "cases")).toBe(false);
    expect(await ents.has(ORG_A, "clients")).toBe(true);
    await app.close();
  });

  it("trial não reinicia após ativação (CONFLICT)", async () => {
    await reset();
    const app = compose();
    const headers = await loginHeaders(app);
    await app.inject({ method: "POST", url: "/billing/trial", headers });
    await app.inject({ method: "POST", url: "/billing/subscription", headers, payload: { moduleCodes: ["clients"] } });
    const w = webhook("act", "approved");
    await app.inject({ method: "POST", url: "/billing/webhook/fake", headers: { "x-fake-signature": w.sig }, payload: w.payload });
    const again = await app.inject({ method: "POST", url: "/billing/trial", headers });
    expect(again.statusCode).toBe(409);
    await app.close();
  });
});
