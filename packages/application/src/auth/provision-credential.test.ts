import { describe, expect, it } from "vitest";
import type { Credential } from "@britus/contracts";
import {
  makeProvisionCredential,
  type CredentialStore,
  type CredentialWriter,
  type PasswordHasher,
} from "../index.js";

// Digest fake NÃO reversível e que NÃO contém o texto em claro (prova hash-only realista).
function digest(s: string): string {
  let h = 2166136261 >>> 0;
  for (const c of s) {
    h = (h ^ c.charCodeAt(0)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `fake$${h.toString(16)}`;
}

const hasher: PasswordHasher = {
  algorithm: "fake",
  async hash(s) {
    return digest(s);
  },
  async verify(s, h) {
    return digest(s) === h;
  },
};

function store() {
  const map = new Map<string, Credential>();
  let n = 0;
  const reader: CredentialStore = {
    async findBySubject(s) {
      return map.get(`${s.type}:${s.id}`) ?? null;
    },
  };
  const writer: CredentialWriter = {
    async create({ subjectType, subjectId, secretHash, algorithm }) {
      const now = new Date();
      const c: Credential = { id: `c-${++n}`, subjectType, subjectId, secretHash, algorithm, createdAt: now, updatedAt: now };
      map.set(`${subjectType}:${subjectId}`, c);
      return c;
    },
  };
  return { reader, writer, map };
}

const SUBJECT = "01920000-0000-7000-8000-000000000001";
const PASSWORD = "s3nha-secreta-do-deploy";

describe("makeProvisionCredential (bootstrap)", () => {
  it("cria credencial só com hash (nunca a senha) e é idempotente", async () => {
    const s = store();
    const uc = makeProvisionCredential({ reader: s.reader, writer: s.writer, hasher });

    const first = await uc.execute({ subjectType: "user", subjectId: SUBJECT, password: PASSWORD });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.alreadyProvisioned).toBe(false);
      expect(first.value.credential.secretHash).toBe(digest(PASSWORD));
    }
    // Nenhum campo persistido contém a senha em claro.
    expect(JSON.stringify(s.map.get(`user:${SUBJECT}`))).not.toContain(PASSWORD);

    const second = await uc.execute({ subjectType: "user", subjectId: SUBJECT, password: "qualquer-outra" });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.alreadyProvisioned).toBe(true);
    expect(s.map.size).toBe(1);
  });
});
