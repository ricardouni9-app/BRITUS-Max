import { describe, expect, it } from "vitest";
import { createArgon2PasswordHasher, createSessionTokenFactory } from "./crypto.js";

describe("Argon2id PasswordHasher", () => {
  it("gera hash PHC (não contém a senha); verify aceita a correta e recusa a errada", async () => {
    const hasher = createArgon2PasswordHasher();
    const encoded = await hasher.hash("correct-horse-battery");
    expect(encoded.startsWith("$argon2id$")).toBe(true);
    expect(encoded).not.toContain("correct-horse-battery");
    expect(await hasher.verify("correct-horse-battery", encoded)).toBe(true);
    expect(await hasher.verify("senha-errada", encoded)).toBe(false);
  });

  it("detecta formato inválido sem lançar (verify → false)", async () => {
    const hasher = createArgon2PasswordHasher();
    expect(await hasher.verify("x", "não-é-um-hash-argon2")).toBe(false);
    expect(await hasher.verify("x", "")).toBe(false);
  });
});

describe("SessionTokenFactory", () => {
  it("token opaco único; hash determinístico ≠ token; CSRF distinto", () => {
    const factory = createSessionTokenFactory();
    const a = factory.generate();
    const b = factory.generate();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(a.token);
    expect(factory.hash(a.token)).toBe(a.tokenHash);
    expect(a.csrfToken).not.toBe(a.token);
    expect(a.csrfToken.length).toBeGreaterThanOrEqual(20);
  });
});
