import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { composeCommercialApp, type CommercialApp } from "./compose.js";

// Provas do MODO COMERCIAL (backend memory): rotas legítimas, autenticação/CSRF real,
// isolamento por contexto server-side e AUSÊNCIA de recursos de desenvolvimento.
describe("modo comercial (memory) — segurança e fluxo", () => {
  let c: CommercialApp;
  let cookie = "";
  let csrf = "";

  beforeAll(async () => {
    c = await composeCommercialApp({
      backend: "memory",
      secureCookie: false,
      sessionTtlSeconds: 3600,
      demoOperator: { email: "op@britus.test", password: "senha-forte-123" },
    });
  });
  afterAll(async () => {
    await c.close();
  });

  it("recursos de desenvolvimento estão AUSENTES (404)", async () => {
    expect((await c.app.inject({ method: "POST", url: "/__dev/seed-operator", payload: {} })).statusCode).toBe(404);
    expect((await c.app.inject({ method: "POST", url: "/__dev/authorized/cases", payload: {} })).statusCode).toBe(404);
  });

  it("rejeita não autenticado nas rotas comerciais (401)", async () => {
    expect((await c.app.inject({ method: "POST", url: "/clients", payload: { personType: "pf", displayName: "X" } })).statusCode).toBe(401);
    expect((await c.app.inject({ method: "POST", url: "/atendimentos", payload: {} })).statusCode).toBe(401);
    expect((await c.app.inject({ method: "POST", url: "/cases", payload: {} })).statusCode).toBe(401);
  });

  it("cadastra interesse em teste somente com consentimento explícito", async () => {
    const denied = await c.app.inject({ method: "POST", url: "/public/trial-interest", payload: { name: "Ana", email: "ana@example.com", website: "", consent: false } });
    expect(denied.statusCode).toBe(400);
    const accepted = await c.app.inject({ method: "POST", url: "/public/trial-interest", payload: { name: "Ana", email: "ana@example.com", segment: "Consultoria", website: "", consent: true } });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.json().id).toBeTypeOf("string");
  });

  it("login → sessão → org ativa → cria cliente/atendimento/caso via rotas reais", async () => {
    const login = await c.app.inject({ method: "POST", url: "/auth/login", payload: { email: "op@britus.test", password: "senha-forte-123" } });
    expect(login.statusCode).toBe(200);
    cookie = String(login.headers["set-cookie"]).split(";")[0];
    csrf = String(login.json().csrfToken);
    const headers = { cookie, "x-csrf-token": csrf };

    const session = await c.app.inject({ method: "GET", url: "/auth/session", headers: { cookie } });
    expect(session.json().authenticated).toBe(true);
    const org = session.json().memberships[0].organizationId as string;

    expect((await c.app.inject({ method: "POST", url: "/auth/active-organization", headers, payload: { organizationId: org } })).statusCode).toBe(200);

    const client = await c.app.inject({ method: "POST", url: "/clients", headers, payload: { personType: "pj", displayName: "Cliente Real Ltda" } });
    expect(client.statusCode).toBe(201);
    expect(client.json().organizationId).toBe(org); // tenant derivado do servidor

    const atd = await c.app.inject({ method: "POST", url: "/atendimentos", headers, payload: { summary: "Contato", channelOrigin: "site" } });
    expect(atd.statusCode).toBe(201);
    expect(atd.json().organizationId).toBe(org);

    const kase = await c.app.inject({ method: "POST", url: "/cases", headers, payload: { areaId: "01920000-0000-7000-8000-000000000001", workTypeId: "01920000-0000-7000-8000-000000000001", title: "Caso", financialClassification: "medio" } });
    expect(kase.statusCode).toBe(201);
    expect(kase.json().organizationId).toBe(org);
  });

  it("mutação sem CSRF é rejeitada (403)", async () => {
    const r = await c.app.inject({ method: "POST", url: "/clients", headers: { cookie }, payload: { personType: "pf", displayName: "Sem CSRF" } });
    expect(r.statusCode).toBe(403);
  });

  it("tenant não pode ser forjado pelo corpo (strict input → 400)", async () => {
    const r = await c.app.inject({ method: "POST", url: "/clients", headers: { cookie, "x-csrf-token": csrf }, payload: { personType: "pf", displayName: "Y", organizationId: "01920000-0000-7000-8000-0000000000ff" } });
    expect(r.statusCode).toBe(400);
  });

  it("selecionar organização sem vínculo é rejeitado (isolamento)", async () => {
    const r = await c.app.inject({ method: "POST", url: "/auth/active-organization", headers: { cookie, "x-csrf-token": csrf }, payload: { organizationId: "01920000-0000-7000-8000-0000000000aa" } });
    expect(r.statusCode).toBeGreaterThanOrEqual(400);
  });
});
