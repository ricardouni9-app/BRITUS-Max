import { describe, expect, it } from "vitest";
import { buildApp } from "./app.js";

describe("app (fundação da API)", () => {
  it("é criada e pode ser fechada, sem abrir porta de rede", async () => {
    const app = buildApp();
    await app.ready();
    await app.close();
    expect(true).toBe(true);
  });

  it("GET /health → 200, JSON, { status: 'ok' }", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.json()).toEqual({ status: "ok" });
    await app.close();
  });

  it("rota inexistente → 404 no formato de erro (NOT_FOUND)", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/nao-existe" });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "NOT_FOUND", message: "Route not found" } });
    await app.close();
  });

  it("erro inesperado → 500 INTERNAL_SERVER_ERROR, sem stack/mensagem interna", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({ method: "GET", url: "/__test/boom" });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body).toEqual({
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" },
    });
    expect(JSON.stringify(body)).not.toContain("intentional test error");
    await app.close();
  });

  it("a rota de teste NÃO existe sem o flag (produção)", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/__test/boom" });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
