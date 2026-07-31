import { describe, expect, it } from "vitest";
import type { Credential, PlatformIdentity, Session, User } from "@britus/contracts";
import {
  makeAuthenticator,
  createInMemoryAuditLog,
  type IdentityReader,
  type MembershipReader,
  type CredentialStore,
  type PasswordHasher,
  type SessionTokenFactory,
  type SessionStore,
} from "../index.js";

const USER_ID = "01920000-0000-7000-8000-000000000001";
const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const ORG_C = "01920000-0000-7000-8000-00000000000c";

// Hasher de teste (determinístico, sem crypto): `H:<senha>`.
const hasher: PasswordHasher = {
  algorithm: "test",
  async hash(s) {
    return `H:${s}`;
  },
  async verify(s, h) {
    return h === `H:${s}`;
  },
};

function tokenFactory(): SessionTokenFactory {
  let n = 0;
  return {
    generate() {
      const token = `tok-${++n}`;
      return { token, tokenHash: `hash-of-${token}`, csrfToken: `csrf-${n}` };
    },
    hash(t) {
      return `hash-of-${t}`;
    },
  };
}

function identityReader(user: User | null): IdentityReader {
  return {
    async findUserByEmail(normalized) {
      return user !== null && user.email === normalized ? { id: user.id } : null;
    },
    async findUserById(id) {
      return user !== null && user.id === id ? user : null;
    },
    async findCreatorById(): Promise<PlatformIdentity | null> {
      return null;
    },
  };
}

function credentialStore(cred: Credential | null): CredentialStore {
  return {
    async findBySubject(subject) {
      return cred !== null && cred.subjectType === subject.type && cred.subjectId === subject.id
        ? cred
        : null;
    },
  };
}

function membershipReader(orgIds: readonly string[]): MembershipReader {
  return {
    async listByUser() {
      return orgIds.map((organizationId) => ({ organizationId, role: "lawyer" as const }));
    },
  };
}

function sessionStore(clock: () => Date): SessionStore {
  const byId = new Map<string, Session>();
  const tokenToId = new Map<string, string>();
  let n = 0;
  return {
    async create({ tokenHash, subjectType, subjectId, csrfToken, expiresAt }) {
      const id = `sess-${++n}`;
      const s: Session = {
        id,
        subjectType,
        subjectId,
        csrfToken,
        activeOrganizationId: null,
        createdAt: clock(),
        expiresAt,
        lastSeenAt: null,
        revokedAt: null,
      };
      byId.set(id, s);
      tokenToId.set(tokenHash, id);
      return s;
    },
    async findValidByTokenHash(tokenHash, at) {
      const id = tokenToId.get(tokenHash);
      if (id === undefined) return null;
      const s = byId.get(id);
      if (s === undefined || s.revokedAt != null || at.getTime() >= s.expiresAt.getTime()) return null;
      return s;
    },
    async revoke(id, at) {
      const s = byId.get(id);
      if (s !== undefined) byId.set(id, { ...s, revokedAt: at });
    },
    async setActiveOrganization(id, organizationId) {
      const s = byId.get(id);
      if (s === undefined) throw new Error("sessão inexistente");
      const updated = { ...s, activeOrganizationId: organizationId };
      byId.set(id, updated);
      return updated;
    },
  };
}

const user: User = {
  id: USER_ID,
  name: "Ricardo",
  email: "ricardo@britus.test",
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};
const credential: Credential = {
  id: "01920000-0000-7000-8000-0000000000cc",
  subjectType: "user",
  subjectId: USER_ID,
  secretHash: "H:correct-horse",
  algorithm: "test",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function build(opts: { orgIds?: readonly string[]; now?: () => Date } = {}) {
  const clock = opts.now ?? ((): Date => new Date());
  return makeAuthenticator({
    identities: identityReader(user),
    credentials: credentialStore(credential),
    hasher,
    tokens: tokenFactory(),
    sessions: sessionStore(clock),
    memberships: membershipReader(opts.orgIds ?? [ORG_A, ORG_B]),
    audit: createInMemoryAuditLog(),
    sessionTtlMs: 60 * 60 * 1000,
    dummyHash: "H:__nonexistent__",
    now: clock,
  });
}

describe("makeAuthenticator", () => {
  it("credencial válida cria sessão; sessão válida resolve a identidade", async () => {
    const auth = build();
    const login = await auth.login({ email: "Ricardo@Britus.test", password: "correct-horse" });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    const resolved = await auth.authenticate(login.value.token);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) expect(resolved.value.subjectId).toBe(USER_ID);
  });

  it("credencial inválida NÃO revela se a identidade existe (erro genérico UNAUTHENTICATED)", async () => {
    const auth = build();
    const wrongPassword = await auth.login({ email: "ricardo@britus.test", password: "errada" });
    const noSuchUser = await auth.login({ email: "ninguem@britus.test", password: "qualquer" });
    expect(wrongPassword.ok).toBe(false);
    expect(noSuchUser.ok).toBe(false);
    if (!wrongPassword.ok) expect(wrongPassword.error.code).toBe("UNAUTHENTICATED");
    if (!noSuchUser.ok) expect(noSuchUser.error.code).toBe("UNAUTHENTICATED");
  });

  it("sessão expirada é rejeitada", async () => {
    let current = new Date("2026-01-01T00:00:00Z");
    const auth = build({ now: () => current });
    const login = await auth.login({ email: "ricardo@britus.test", password: "correct-horse" });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    current = new Date("2026-01-01T02:00:00Z"); // além do TTL de 1h
    const res = await auth.authenticate(login.value.token);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
  });

  it("sessão revogada é rejeitada imediatamente", async () => {
    const auth = build();
    const login = await auth.login({ email: "ricardo@britus.test", password: "correct-horse" });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect((await auth.revoke(login.value.token)).ok).toBe(true);
    const res = await auth.authenticate(login.value.token);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("UNAUTHENTICATED");
  });

  it("organização ativa precisa pertencer ao usuário; multi-org alterna só entre válidos", async () => {
    const auth = build({ orgIds: [ORG_A, ORG_B] });
    const login = await auth.login({ email: "ricardo@britus.test", password: "correct-horse" });
    if (!login.ok) return;
    const token = login.value.token;
    expect((await auth.selectActiveOrganization({ token, organizationId: ORG_A })).ok).toBe(true);
    expect((await auth.selectActiveOrganization({ token, organizationId: ORG_B })).ok).toBe(true);
    const forged = await auth.selectActiveOrganization({ token, organizationId: ORG_C });
    expect(forged.ok).toBe(false);
    if (!forged.ok) expect(forged.error.code).toBe("FORBIDDEN");
  });

  it("deriva AuthorizationContext server-side com a org ativa da sessão (não do cliente)", async () => {
    const auth = build({ orgIds: [ORG_A, ORG_B] });
    const login = await auth.login({ email: "ricardo@britus.test", password: "correct-horse" });
    if (!login.ok) return;
    const token = login.value.token;
    const csrfToken = login.value.session.csrfToken;

    // Sem org ativa selecionada → VALIDATION_ERROR (não assume tenant).
    const noOrg = await auth.resolveOrganizationContext({ token, csrfToken, action: "client.create", resourceType: "client" });
    expect(noOrg.ok).toBe(false);
    if (!noOrg.ok) expect(noOrg.error.code).toBe("VALIDATION_ERROR");

    // CSRF inválido → FORBIDDEN.
    await auth.selectActiveOrganization({ token, organizationId: ORG_A });
    const badCsrf = await auth.resolveOrganizationContext({ token, csrfToken: "errado", action: "client.create", resourceType: "client" });
    expect(badCsrf.ok).toBe(false);
    if (!badCsrf.ok) expect(badCsrf.error.code).toBe("FORBIDDEN");

    const ctx = await auth.resolveOrganizationContext({ token, csrfToken, action: "client.create", resourceType: "client" });
    expect(ctx.ok).toBe(true);
    if (ctx.ok) {
      expect(ctx.value.identityType).toBe("organization_user");
      expect(ctx.value.userId).toBe(USER_ID);
      expect(ctx.value.organizationId).toBe(ORG_A);
      expect(ctx.value.memberships.map((m) => m.organizationId)).toContain(ORG_A);
    }
  });
});
