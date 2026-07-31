import { describe, expect, it } from "vitest";
import { uuidSchema } from "@britus/contracts";
import { buildApp } from "../app.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const DEV_USER = "01920000-0000-7000-8000-000000000001";

type App = ReturnType<typeof buildApp>;

function cookieOf(res: { headers: Record<string, unknown> }): string {
  const setCookie = res.headers["set-cookie"];
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  return typeof raw === "string" ? (raw.split(";")[0] ?? "") : "";
}

async function seedAndLogin(
  app: App,
  opts: { email: string; password: string; organizationId: string },
): Promise<{ loginStatus: number; cookie: string; csrf: string }> {
  await app.inject({ method: "POST", url: "/__dev/seed-operator", payload: { ...opts, role: "lawyer" } });
  const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: opts.email, password: opts.password } });
  return { loginStatus: login.statusCode, cookie: cookieOf(login), csrf: String(login.json()?.csrfToken ?? "") };
}

const devHeader = (memberships: Array<{ organizationId: string; role: string }>) => ({
  "x-dev-authz-context": JSON.stringify({ identityType: "organization_user", userId: DEV_USER, memberships, organizationId: ORG_A }),
});

describe("Autenticação de borda (MP-014, Argon2id + CSRF)", () => {
  it("login → cookie httpOnly + csrf; workflow autenticado exige org ativa e deriva o tenant da sessão", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const { loginStatus, cookie, csrf } = await seedAndLogin(app, { email: "ricardo@britus.test", password: "s3nha-forte", organizationId: ORG_A });
    expect(loginStatus).toBe(200);
    expect(csrf.length).toBeGreaterThan(0);

    const headers = { cookie, "x-csrf-token": csrf };
    // Sem org ativa (mas com csrf válido) → não assume tenant (400).
    const noOrg = await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "X" } });
    expect(noOrg.statusCode).toBe(400);

    const sel = await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    expect(sel.statusCode).toBe(200);

    const created = await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "Cliente" } });
    expect(created.statusCode).toBe(201);
    expect(created.json().organizationId).toBe(ORG_A);
    expect(uuidSchema.safeParse(created.json().id).success).toBe(true);
    await app.close();
  });

  it("cookie de sessão é httpOnly + SameSite", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const { cookie } = await seedAndLogin(app, { email: "r@b.test", password: "certa", organizationId: ORG_A });
    expect(cookie).toContain("britus_session");
    // set-cookie completo carrega os atributos
    await app.inject({ method: "POST", url: "/__dev/seed-operator", payload: { email: "r2@b.test", password: "certa", organizationId: ORG_A, role: "lawyer" } });
    const login = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r2@b.test", password: "certa" } });
    const setCookie = String(login.headers["set-cookie"]);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    await app.close();
  });

  it("credencial inválida → 401 genérico (não revela existência)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    await app.inject({ method: "POST", url: "/__dev/seed-operator", payload: { email: "r@b.test", password: "certa", organizationId: ORG_A, role: "lawyer" } });
    const wrong = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "r@b.test", password: "errada" } });
    const missing = await app.inject({ method: "POST", url: "/auth/login", payload: { email: "ninguem@b.test", password: "x" } });
    expect(wrong.statusCode).toBe(401);
    expect(missing.statusCode).toBe(401);
    await app.close();
  });

  it("CSRF: sem header ou com valor inválido → 403; com válido → 201", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const { cookie, csrf } = await seedAndLogin(app, { email: "r@b.test", password: "certa", organizationId: ORG_A });
    await app.inject({ method: "POST", url: "/auth/active-organization", headers: { cookie, "x-csrf-token": csrf }, payload: { organizationId: ORG_A } });

    const noCsrf = await app.inject({ method: "POST", url: "/clients", headers: { cookie }, payload: { personType: "pf", displayName: "X" } });
    expect(noCsrf.statusCode).toBe(403);
    const badCsrf = await app.inject({ method: "POST", url: "/clients", headers: { cookie, "x-csrf-token": "invalido" }, payload: { personType: "pf", displayName: "X" } });
    expect(badCsrf.statusCode).toBe(403);
    const okCsrf = await app.inject({ method: "POST", url: "/clients", headers: { cookie, "x-csrf-token": csrf }, payload: { personType: "pf", displayName: "OK" } });
    expect(okCsrf.statusCode).toBe(201);
    await app.close();
  });

  it("tenant spoofing: selecionar organização sem membership → 403", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const { cookie, csrf } = await seedAndLogin(app, { email: "r@b.test", password: "certa", organizationId: ORG_A });
    const forged = await app.inject({ method: "POST", url: "/auth/active-organization", headers: { cookie, "x-csrf-token": csrf }, payload: { organizationId: ORG_B } });
    expect(forged.statusCode).toBe(403);
    await app.close();
  });

  it("sessão revogada (logout) é rejeitada imediatamente", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const { cookie, csrf } = await seedAndLogin(app, { email: "r@b.test", password: "certa", organizationId: ORG_A });
    const headers = { cookie, "x-csrf-token": csrf };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    await app.inject({ method: "POST", url: "/auth/logout", headers });
    const after = await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "X" } });
    expect(after.statusCode).toBe(401);
    await app.close();
  });

  it("PARIDADE: rota autenticada e __dev produzem a mesma decisão (permite com membership; nega sem)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const dev = await app.inject({ method: "POST", url: "/__dev/authorized/clients", headers: devHeader([{ organizationId: ORG_A, role: "lawyer" }]), payload: { personType: "pf", displayName: "Dev" } });
    expect(dev.statusCode).toBe(201);

    const { cookie, csrf } = await seedAndLogin(app, { email: "r@b.test", password: "certa", organizationId: ORG_A });
    const headers = { cookie, "x-csrf-token": csrf };
    await app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: ORG_A } });
    const authenticated = await app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pf", displayName: "Auth" } });
    expect(authenticated.statusCode).toBe(201);

    const devDeny = await app.inject({ method: "POST", url: "/__dev/authorized/clients", headers: devHeader([]), payload: { personType: "pf", displayName: "Dev" } });
    expect(devDeny.statusCode).toBe(403);
    await app.close();
  });
});
