import { describe, expect, it } from "vitest";
import { apiErrorSchema } from "@britus/contracts";
import { buildApp } from "./app.js";

describe("integração API × @britus/contracts", () => {
  it("respostas de erro conformam ao apiErrorSchema (fonte única)", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "GET", url: "/rota-inexistente" });
    expect(res.statusCode).toBe(404);
    const body = apiErrorSchema.parse(res.json());
    expect(body.error.code).toBe("NOT_FOUND");
    await app.close();
  });

  it("valida query com schema compartilhado (paginação) — válido", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({ method: "GET", url: "/__test/paginate?page=2&pageSize=5" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ page: 2, pageSize: 5 });
    await app.close();
  });

  it("query inválida → 400 VALIDATION_ERROR conforme contrato", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({ method: "GET", url: "/__test/paginate?page=abc" });
    expect(res.statusCode).toBe(400);
    const body = apiErrorSchema.parse(res.json());
    expect(body.error.code).toBe("VALIDATION_ERROR");
    await app.close();
  });

  it("Date atravessa o HTTP como string ISO-8601", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({ method: "GET", url: "/__test/now" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ at: "2026-07-25T12:00:00.000Z" });
    await app.close();
  });
});
