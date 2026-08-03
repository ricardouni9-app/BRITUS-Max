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
    expect(
      (await c.app.inject({ method: "POST", url: "/__dev/seed-operator", payload: {} })).statusCode,
    ).toBe(404);
    expect(
      (await c.app.inject({ method: "POST", url: "/__dev/authorized/cases", payload: {} }))
        .statusCode,
    ).toBe(404);
  });

  it("oferece assistir ou pular e não mantém o antigo pedido de contato", async () => {
    const page = await c.app.inject({ method: "GET", url: "/" });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain(">Assistir<");
    expect(page.body).toContain(">Pular<");
    expect(page.body).toContain("teste integral de 48 horas");
    expect(page.body).toContain("/assets/narration/britus-intro-");
    expect(page.body).toContain("narration.addEventListener('ended'");
    expect(page.body).toContain("advanceScene()");
    expect(page.body).not.toContain("speechSynthesis");
    expect(page.body).not.toContain("Telefone (opcional)");
    expect(
      (await c.app.inject({ method: "POST", url: "/public/trial-interest", payload: {} }))
        .statusCode,
    ).toBe(404);
  });

  it("serve as sete narrações institucionais sem expor caminho local", async () => {
    for (let index = 1; index <= 7; index += 1) {
      const audio = await c.app.inject({
        method: "GET",
        url: `/assets/narration/britus-intro-${String(index).padStart(2, "0")}.mp3`,
      });
      expect(audio.statusCode).toBe(200);
      expect(audio.headers["content-type"]).toContain("audio/mpeg");
      expect(audio.rawPayload.byteLength).toBeGreaterThan(100_000);
    }
  });

  it("rejeita não autenticado nas rotas comerciais (401)", async () => {
    expect(
      (
        await c.app.inject({
          method: "POST",
          url: "/clients",
          payload: { personType: "pf", displayName: "X" },
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (await c.app.inject({ method: "POST", url: "/atendimentos", payload: {} })).statusCode,
    ).toBe(401);
    expect((await c.app.inject({ method: "POST", url: "/cases", payload: {} })).statusCode).toBe(
      401,
    );
  });

  it("faz cadastro essencial e libera automaticamente o teste por 48 horas", async () => {
    const denied = await c.app.inject({
      method: "POST",
      url: "/public/trial",
      payload: { name: "Ana", email: "ana@example.com", password: "curta", website: "" },
    });
    expect(denied.statusCode).toBe(400);
    const accepted = await c.app.inject({
      method: "POST",
      url: "/public/trial",
      payload: { name: "Ana", email: "ana@example.com", password: "senha-forte-123", website: "" },
    });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.headers["set-cookie"]).toContain("britus_session=");
    const body = accepted.json();
    expect(new Date(body.trialEndsAt).getTime() - new Date(body.trialStartsAt).getTime()).toBe(
      48 * 60 * 60 * 1000,
    );
    expect(body.csrfToken).toBeTypeOf("string");
    const trialCookie = String(accepted.headers["set-cookie"]).split(";")[0];
    const access = await c.app.inject({
      method: "GET",
      url: "/commercial/access",
      headers: { cookie: trialCookie },
    });
    expect(access.json()).toMatchObject({ status: "trialing", allowed: true });
    const catalog = await c.app.inject({ method: "GET", url: "/billing/catalog" });
    expect(catalog.json().modules).toHaveLength(3);
    const checkout = await c.app.inject({
      method: "POST",
      url: "/billing/checkout",
      headers: { cookie: trialCookie, "x-csrf-token": body.csrfToken },
      payload: { plan: "monthly", moduleCodes: ["core"] },
    });
    expect(checkout.statusCode).toBe(503);

    const duplicate = await c.app.inject({
      method: "POST",
      url: "/public/trial",
      payload: { name: "Ana", email: "ana@example.com", password: "senha-forte-123", website: "" },
    });
    expect(duplicate.statusCode).toBe(409);
  });

  it("expõe contato institucional sem telefone fixado no frontend", async () => {
    const response = await c.app.inject({ method: "GET", url: "/public/platform-contact" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      label: "BRITUS",
      email: null,
      phone: null,
      whatsapp: null,
      website: null,
    });
  });

  it("login → sessão → org ativa → cria cliente/atendimento/caso via rotas reais", async () => {
    const login = await c.app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "op@britus.test", password: "senha-forte-123" },
    });
    expect(login.statusCode).toBe(200);
    cookie = String(login.headers["set-cookie"]).split(";")[0];
    csrf = String(login.json().csrfToken);
    const headers = { cookie, "x-csrf-token": csrf };

    const session = await c.app.inject({
      method: "GET",
      url: "/auth/session",
      headers: { cookie },
    });
    expect(session.json().authenticated).toBe(true);
    const org = session.json().memberships[0].organizationId as string;

    expect(
      (
        await c.app.inject({
          method: "POST",
          url: "/auth/active-organization",
          headers,
          payload: { organizationId: org },
        })
      ).statusCode,
    ).toBe(200);

    const client = await c.app.inject({
      method: "POST",
      url: "/clients",
      headers,
      payload: { personType: "pj", displayName: "Cliente Real Ltda" },
    });
    expect(client.statusCode).toBe(201);
    expect(client.json().organizationId).toBe(org); // tenant derivado do servidor

    const atd = await c.app.inject({
      method: "POST",
      url: "/atendimentos",
      headers,
      payload: { summary: "Contato", channelOrigin: "site" },
    });
    expect(atd.statusCode).toBe(201);
    expect(atd.json().organizationId).toBe(org);

    const kase = await c.app.inject({
      method: "POST",
      url: "/cases",
      headers,
      payload: {
        areaId: "01920000-0000-7000-8000-000000000001",
        workTypeId: "01920000-0000-7000-8000-000000000001",
        title: "Caso",
        financialClassification: "medio",
      },
    });
    expect(kase.statusCode).toBe(201);
    expect(kase.json().organizationId).toBe(org);
  });

  it("mutação sem CSRF é rejeitada (403)", async () => {
    const r = await c.app.inject({
      method: "POST",
      url: "/clients",
      headers: { cookie },
      payload: { personType: "pf", displayName: "Sem CSRF" },
    });
    expect(r.statusCode).toBe(403);
  });

  it("tenant não pode ser forjado pelo corpo (strict input → 400)", async () => {
    const r = await c.app.inject({
      method: "POST",
      url: "/clients",
      headers: { cookie, "x-csrf-token": csrf },
      payload: {
        personType: "pf",
        displayName: "Y",
        organizationId: "01920000-0000-7000-8000-0000000000ff",
      },
    });
    expect(r.statusCode).toBe(400);
  });

  it("selecionar organização sem vínculo é rejeitado (isolamento)", async () => {
    const r = await c.app.inject({
      method: "POST",
      url: "/auth/active-organization",
      headers: { cookie, "x-csrf-token": csrf },
      payload: { organizationId: "01920000-0000-7000-8000-0000000000aa" },
    });
    expect(r.statusCode).toBeGreaterThanOrEqual(400);
  });
});
