import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import {
  createDatabasePool,
  createDatabaseClient,
  createDrizzleAuthStores,
  createDrizzleClientStore,
  type DrizzleAuthStores,
} from "@britus/db";
import {
  makeAuthenticator,
  makeCreateClient,
  makeAuthorizationGuard,
  withAuthorization,
  createInMemoryAuditLog,
  type Authenticator,
  type AuditLog,
} from "@britus/application";
import { buildApp } from "../app.js";
import { createArgon2PasswordHasher, createSessionTokenFactory, createDummyPasswordHash } from "./crypto.js";
import { runBootstrap } from "./bootstrap.js";

const url = process.env.DATABASE_URL;
const shouldRun = typeof url === "string" && url.length > 0 && process.env.BRITUS_DB_TEST_DISPOSABLE === "1";
const suite = shouldRun ? describe : describe.skip;

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const MISSING = "01920000-0000-7000-8000-0000000000ff";

suite("MP-014 — integração PostgreSQL (auth persistente real)", () => {
  let pool: Pool;
  let db: ReturnType<typeof createDatabaseClient>;
  let stores: DrizzleAuthStores;
  let clientStore: ReturnType<typeof createDrizzleClientStore>;
  const hasher = createArgon2PasswordHasher();

  beforeAll(() => {
    pool = createDatabasePool({ connectionString: url });
    db = createDatabaseClient(pool);
    stores = createDrizzleAuthStores(db);
    clientStore = createDrizzleClientStore(db);
  });
  afterAll(async () => {
    await pool.end();
  });

  async function reset(): Promise<void> {
    await pool.query(
      "truncate table sessions, credentials, organization_memberships, platform_identities, users, cases, atendimentos, clients, organizations restart identity cascade",
    );
    await pool.query("insert into organizations (id,name,status) values ($1,'Org A','active'),($2,'Org B','active')", [ORG_A, ORG_B]);
  }
  const count = async (text: string, params: unknown[] = []): Promise<number> =>
    Number((await pool.query(text, params)).rows[0]?.n ?? -1);

  function compose(): { authenticator: Authenticator; audit: AuditLog; app: ReturnType<typeof buildApp> } {
    const audit = createInMemoryAuditLog();
    const guard = makeAuthorizationGuard({ audit });
    const authenticator = makeAuthenticator({
      identities: stores.identities,
      credentials: stores.credentials,
      memberships: stores.memberships,
      sessions: stores.sessions,
      audit,
      hasher,
      tokens: createSessionTokenFactory(),
      sessionTtlMs: 60 * 60 * 1000,
      dummyHash: createDummyPasswordHash(),
    });
    const authorizedCreateClient = withAuthorization(
      makeCreateClient({ clients: clientStore, duplicates: clientStore }),
      { action: "client.create", resourceType: "client" },
      { guard },
    );
    const app = buildApp({
      enableTestRoutes: true,
      auth: { authenticator, authorizedCreateClient, secureCookie: false, sessionTtlSeconds: 3600 },
    });
    return { authenticator, audit, app };
  }

  async function bootstrapOperator(email: string, password: string, role: "owner" | "lawyer" = "lawyer", withCreator = false) {
    return runBootstrap(
      { writers: stores.writers, credentials: stores.credentials, credentialWriter: stores.credentialWriter, hasher },
      {
        organizationId: ORG_A,
        operator: { name: "Ricardo", email, password, role },
        creator: withCreator ? { label: "Criador", password: "creator-secret-123" } : undefined,
      },
    );
  }

  function cookieOf(res: { headers: Record<string, unknown> }): string {
    const raw = res.headers["set-cookie"];
    const first = Array.isArray(raw) ? raw[0] : raw;
    return typeof first === "string" ? (first.split(";")[0] ?? "") : "";
  }

  it("estrutura materializada: 9 tabelas + uniques (sessão/credencial/criador/email/membership)", async () => {
    const tables = (
      await pool.query(
        "select tablename from pg_tables where schemaname='public' and tablename in ('organizations','clients','atendimentos','cases','users','organization_memberships','platform_identities','credentials','sessions')",
      )
    ).rows;
    expect(tables).toHaveLength(9);
    const uniques = (
      await pool.query(
        "select indexname from pg_indexes where schemaname='public' and indexname in ('sessions_token_hash_unique','credentials_subject_unique','platform_identities_kind_unique','users_email_unique','org_memberships_org_user_unique')",
      )
    ).rows;
    expect(uniques).toHaveLength(5);
  });

  it("bootstrap idempotente: reexecução não duplica usuário/membership/credencial; Criador separado sem membership", async () => {
    await reset();
    const first = await bootstrapOperator("ricardo@britus.test", "s3nha-forte-1", "owner", true);
    const second = await bootstrapOperator("Ricardo@Britus.test", "s3nha-forte-1", "owner", true);
    expect(second.userId).toBe(first.userId);
    expect(first.creatorId).not.toBeNull();
    expect(second.creatorId).toBe(first.creatorId);
    expect(await count("select count(*)::int n from users")).toBe(1);
    expect(await count("select count(*)::int n from organization_memberships")).toBe(1);
    expect(await count("select count(*)::int n from credentials")).toBe(2);
    expect(await count("select count(*)::int n from platform_identities")).toBe(1);
    expect(await count("select count(*)::int n from organization_memberships om join platform_identities pi on pi.id=om.user_id")).toBe(0);
  });

  it("bootstrap falha seguro em configuração parcial (senha curta) — nada é provisionado", async () => {
    await reset();
    await expect(
      runBootstrap(
        { writers: stores.writers, credentials: stores.credentials, credentialWriter: stores.credentialWriter, hasher },
        { organizationId: ORG_A, operator: { name: "R", email: "r@b.test", password: "curta", role: "lawyer" } },
      ),
    ).rejects.toThrow();
    expect(await count("select count(*)::int n from users")).toBe(0);
  });

  it("login real (Argon2id) cria sessão; credencial inválida → 401 sem enumeração; só hash persistido", async () => {
    await reset();
    await bootstrapOperator("ricardo@britus.test", "s3nha-forte-1");
    const { app } = compose();
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ricardo@britus.test", password: "s3nha-forte-1" } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ricardo@britus.test", password: "errada" } })).statusCode).toBe(401);
    expect((await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ninguem@britus.test", password: "x" } })).statusCode).toBe(401);
    const cred = (await pool.query("select secret_hash from credentials limit 1")).rows[0];
    expect(String(cred?.secret_hash).startsWith("$argon2id$")).toBe(true);
    expect(typeof (await pool.query("select token_hash from sessions limit 1")).rows[0]?.token_hash).toBe("string");
    await app.close();
  });

  it("workflow autenticado real persiste Cliente; CSRF exigido; org da sessão (nunca do corpo)", async () => {
    await reset();
    await bootstrapOperator("r@b.test", "s3nha-forte-1");
    const { app } = compose();
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "s3nha-forte-1" } });
    const cookie = cookieOf(login);
    const csrf = String(login.json().csrfToken);
    await app.inject({ method: "POST", url: "/auth/active-organization", headers: { cookie, "x-csrf-token": csrf }, payload: { organizationId: ORG_A } });
    expect((await app.inject({ method: "POST", url: "/clients", headers: { cookie }, payload: { personType: "pf", displayName: "X" } })).statusCode).toBe(403);
    const created = await app.inject({ method: "POST", url: "/clients", headers: { cookie, "x-csrf-token": csrf }, payload: { personType: "pf", displayName: "Cliente Real" } });
    expect(created.statusCode).toBe(201);
    expect(created.json().organizationId).toBe(ORG_A);
    expect((await pool.query("select organization_id from clients where display_name='Cliente Real'")).rows[0]?.organization_id).toBe(ORG_A);
    await app.close();
  });

  it("sessão: expiração e revogação rejeitadas no adapter", async () => {
    await reset();
    await bootstrapOperator("r@b.test", "s3nha-forte-1");
    const user = String((await pool.query("select id from users limit 1")).rows[0]?.id);
    const now = new Date();
    await stores.sessions.create({ tokenHash: "th-expired", subjectType: "user", subjectId: user, csrfToken: "c1", expiresAt: new Date(now.getTime() - 1000) });
    const live = await stores.sessions.create({ tokenHash: "th-live", subjectType: "user", subjectId: user, csrfToken: "c2", expiresAt: new Date(now.getTime() + 60000) });
    expect(await stores.sessions.findValidByTokenHash("th-expired", now)).toBeNull();
    expect(await stores.sessions.findValidByTokenHash("th-live", now)).not.toBeNull();
    await stores.sessions.revoke(live.id, now);
    expect(await stores.sessions.findValidByTokenHash("th-live", now)).toBeNull();
  });

  it("remoção de membership: acesso perdido imediatamente (sessão não preserva); tenant spoofing → 403", async () => {
    await reset();
    await bootstrapOperator("r@b.test", "s3nha-forte-1");
    const { app } = compose();
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "s3nha-forte-1" } });
    const headers = { cookie: cookieOf(login), "x-csrf-token": String(login.json().csrfToken) };
    expect((await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_B } })).statusCode).toBe(403);
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    expect((await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "A" } })).statusCode).toBe(201);
    await pool.query("delete from organization_memberships where organization_id=$1", [ORG_A]);
    expect((await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "B" } })).statusCode).toBe(403);
    await app.close();
  });

  it("logout revoga imediatamente e é idempotente", async () => {
    await reset();
    await bootstrapOperator("r@b.test", "s3nha-forte-1");
    const { app } = compose();
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "s3nha-forte-1" } });
    const headers = { cookie: cookieOf(login), "x-csrf-token": String(login.json().csrfToken) };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    expect((await app.inject({ method: "POST", url: "/auth/logout", headers })).statusCode).toBe(204);
    expect((await app.inject({ method: "POST", url: "/auth/logout", headers })).statusCode).toBe(204);
    expect((await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "X" } })).statusCode).toBe(401);
    await app.close();
  });

  it("integridade de subject: credencial/sessão de subject inexistente são recusadas (adapter direto)", async () => {
    await reset();
    await expect(stores.credentialWriter.create({ subjectType: "user", subjectId: MISSING, secretHash: "$argon2id$x", algorithm: "argon2id" })).rejects.toThrow();
    await expect(stores.sessions.create({ tokenHash: "t", subjectType: "user", subjectId: MISSING, csrfToken: "c", expiresAt: new Date(Date.now() + 1000) })).rejects.toThrow();
  });

  it("concorrência: credencial (subject único), membership (org+user único), sessões distintas", async () => {
    await reset();
    const { userId } = await bootstrapOperator("r@b.test", "s3nha-forte-1");
    await Promise.allSettled([
      stores.credentialWriter.create({ subjectType: "user", subjectId: userId, secretHash: "$argon2id$a", algorithm: "argon2id" }),
      stores.credentialWriter.create({ subjectType: "user", subjectId: userId, secretHash: "$argon2id$b", algorithm: "argon2id" }),
    ]);
    expect(await count("select count(*)::int n from credentials where subject_id=$1", [userId])).toBe(1);
    await Promise.allSettled([
      stores.writers.ensureMembership({ organizationId: ORG_A, userId, role: "lawyer" }),
      stores.writers.ensureMembership({ organizationId: ORG_A, userId, role: "lawyer" }),
    ]);
    expect(await count("select count(*)::int n from organization_memberships where user_id=$1 and organization_id=$2", [userId, ORG_A])).toBe(1);
    const now = new Date();
    await Promise.all([
      stores.sessions.create({ tokenHash: "s-a", subjectType: "user", subjectId: userId, csrfToken: "c", expiresAt: new Date(now.getTime() + 60000) }),
      stores.sessions.create({ tokenHash: "s-b", subjectType: "user", subjectId: userId, csrfToken: "c", expiresAt: new Date(now.getTime() + 60000) }),
    ]);
    expect(await count("select count(*)::int n from sessions where subject_id=$1", [userId])).toBe(2);
  });

  it("paridade: rota __dev e rota autenticada real → mesma decisão; auditoria sem segredos", async () => {
    await reset();
    await bootstrapOperator("r@b.test", "s3nha-forte-1");
    const { app, audit } = compose();
    const dev = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      headers: { "x-dev-authz-context": JSON.stringify({ identityType: "organization_user", userId: MISSING, memberships: [{ organizationId: ORG_A, role: "lawyer" }], organizationId: ORG_A }) },
      payload: { personType: "pf", displayName: "Dev" },
    });
    expect(dev.statusCode).toBe(201);
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "s3nha-forte-1" } });
    const headers = { cookie: cookieOf(login), "x-csrf-token": String(login.json().csrfToken) };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    expect((await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "Auth" } })).statusCode).toBe(201);

    const events = await audit.list();
    expect(events.some((e) => e.action === "auth.login" && e.decision === "allow")).toBe(true);
    expect(events.some((e) => e.action === "session.select_organization")).toBe(true);
    expect(JSON.stringify(events)).not.toContain("s3nha-forte-1");
    await app.close();
  });
});
