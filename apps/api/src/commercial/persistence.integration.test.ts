import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabasePool, createDatabaseClient, createDrizzleAuthStores } from "@britus/db";
import { uuidv7 } from "uuidv7";
import { composeCommercialApp } from "./compose.js";
import { createArgon2PasswordHasher } from "../auth/crypto.js";
import { runBootstrap } from "../auth/bootstrap.js";

// PROVA DE PERSISTÊNCIA (Postgres) — reproduzível: cria dado via rota comercial real,
// "reinicia" (fecha e recompõe a app com novo pool) e confirma o dado no banco + login.
// Gated: exige DATABASE_URL + BRITUS_DB_TEST_DISPOSABLE=1 (banco descartável).
const url = process.env.DATABASE_URL;
const shouldRun = typeof url === "string" && url.length > 0 && process.env.BRITUS_DB_TEST_DISPOSABLE === "1";
const suite = shouldRun ? describe : describe.skip;

suite("persistência comercial após reinício (Postgres)", () => {
  const pool = createDatabasePool({ connectionString: url });
  const hasher = createArgon2PasswordHasher();
  const EMAIL = "op-persist@britus.test";
  const PASS = "senha-forte-persist-1";
  let organizationId = "";

  beforeAll(async () => {
    await pool.query(
      "truncate table case_tasks, webhook_events, payment_transactions, subscription_items, subscriptions, payment_customer_references, product_modules, sessions, credentials, organization_memberships, platform_identities, users, cases, atendimentos, clients, organizations restart identity cascade",
    );
    organizationId = uuidv7();
    await pool.query("insert into organizations (id,name,status) values ($1,'Persist','active')", [organizationId]);
    const stores = createDrizzleAuthStores(createDatabaseClient(pool));
    await runBootstrap(
      { writers: stores.writers, credentials: stores.credentials, credentialWriter: stores.credentialWriter, hasher },
      { organizationId, operator: { name: "Op", email: EMAIL, password: PASS, role: "owner" } },
    );
  });
  afterAll(async () => {
    await pool.end();
  });

  async function loginAndCreateClient(): Promise<string> {
    const c = await composeCommercialApp({ backend: "postgres", databaseUrl: url, secureCookie: false, sessionTtlSeconds: 3600 });
    try {
      const login = await c.app.inject({ method: "POST", url: "/auth/login", payload: { email: EMAIL, password: PASS } });
      const cookie = String(login.headers["set-cookie"]).split(";")[0];
      const headers = { cookie, "x-csrf-token": String(login.json().csrfToken) };
      await c.app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId } });
      const created = await c.app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pj", displayName: "Cliente Persistente" } });
      expect(created.statusCode).toBe(201);
      return created.json().id as string;
    } finally {
      await c.close();
    }
  }

  it("dado criado via rota real sobrevive ao reinício e o login continua válido", async () => {
    const clientId = await loginAndCreateClient(); // 1ª instância → cria e fecha (reinício)
    const { rows } = await pool.query("select organization_id from clients where id=$1", [clientId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].organization_id).toBe(organizationId);

    // 2ª instância (novo pool): autentica novamente e cria outro registro → persistência + auth ok.
    const secondId = await loginAndCreateClient();
    expect(secondId).not.toBe(clientId);
    const count = await pool.query("select count(*)::int as n from clients where organization_id=$1", [organizationId]);
    expect(count.rows[0].n).toBe(2);
  });
});
