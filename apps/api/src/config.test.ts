import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  it("aceita config válida com defaults de desenvolvimento", () => {
    const c = loadConfig({});
    expect(c).toMatchObject({ NODE_ENV: "development", HOST: "127.0.0.1", PORT: 3000, LOG_LEVEL: "info", BRITUS_MODE: "api" });
  });

  it("aceita valores explícitos válidos (PORT coagido a número)", () => {
    const c = loadConfig({ NODE_ENV: "production", HOST: "0.0.0.0", PORT: "8080", LOG_LEVEL: "warn" });
    expect(c).toMatchObject({ NODE_ENV: "production", HOST: "0.0.0.0", PORT: 8080, LOG_LEVEL: "warn" });
  });

  it("rejeita PORT não numérico", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow();
  });

  it("rejeita PORT fora do intervalo (0 e 70000)", () => {
    expect(() => loadConfig({ PORT: "0" })).toThrow();
    expect(() => loadConfig({ PORT: "70000" })).toThrow();
  });

  it("rejeita NODE_ENV inválido", () => {
    expect(() => loadConfig({ NODE_ENV: "staging" })).toThrow();
  });

  it("rejeita LOG_LEVEL inválido", () => {
    expect(() => loadConfig({ LOG_LEVEL: "verbose" })).toThrow();
  });

  // Modo comercial — validação de configuração essencial.
  it("comercial + postgres SEM DATABASE_URL → erro claro citando DATABASE_URL", () => {
    expect(() => loadConfig({ BRITUS_MODE: "commercial", BRITUS_DB: "postgres" })).toThrow(/DATABASE_URL/);
  });

  it("comercial + memory NÃO exige DATABASE_URL", () => {
    expect(loadConfig({ BRITUS_MODE: "commercial", BRITUS_DB: "memory" }).BRITUS_DB).toBe("memory");
  });

  it("comercial + postgres COM DATABASE_URL → ok", () => {
    expect(loadConfig({ BRITUS_MODE: "commercial", BRITUS_DB: "postgres", DATABASE_URL: "postgres://u:p@h:5432/d" }).DATABASE_URL).toContain("postgres://");
  });

  it("COOKIE_SECURE coage '1'/'true' para boolean", () => {
    expect(loadConfig({ COOKIE_SECURE: "1" }).COOKIE_SECURE).toBe(true);
    expect(loadConfig({ COOKIE_SECURE: "false" }).COOKIE_SECURE).toBe(false);
  });
});
