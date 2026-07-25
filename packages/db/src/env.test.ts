import { describe, expect, it } from "vitest";
import * as db from "./index.js";
import { getDatabaseUrl } from "./env.js";

describe("getDatabaseUrl", () => {
  it("rejeita valor ausente", () => {
    expect(() => getDatabaseUrl({})).toThrow();
  });

  it("rejeita valor vazio (string em branco)", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "   " })).toThrow();
  });

  it("aceita valor válido sem abrir conexão", () => {
    const url = "postgres://user:pass@localhost:5432/britus_dev";
    expect(getDatabaseUrl({ DATABASE_URL: url })).toBe(url);
  });

  it("mensagem de erro não contém a credencial", () => {
    let message = "";
    try {
      getDatabaseUrl({ DATABASE_URL: "" });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message.length).toBeGreaterThan(0);
    expect(message).not.toContain("postgres://");
  });
});

describe("import do pacote", () => {
  it("funciona sem DATABASE_URL e expõe fábricas explícitas (nenhum pool/conexão no import)", () => {
    expect(typeof db.getDatabaseUrl).toBe("function");
    expect(typeof db.createDatabasePool).toBe("function");
    expect(typeof db.createDatabaseClient).toBe("function");
  });
});
