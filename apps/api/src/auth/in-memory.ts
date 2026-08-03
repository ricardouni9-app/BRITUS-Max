import { uuidv7 } from "uuidv7";
import type {
  User,
  PlatformIdentity,
  Credential,
  Session,
  SubjectType,
  UserRole,
} from "@britus/contracts";
import type {
  IdentityReader,
  MembershipReader,
  CredentialStore,
  SessionStore,
} from "@britus/application";

// Stores de autenticação EM MEMÓRIA — isolados, exclusivos de teste/dev (substituíveis
// pelos adapters Drizzle). Nunca guardam o token bruto (apenas o hash como chave).
export interface InMemoryAuthStores {
  readonly identities: IdentityReader;
  readonly memberships: MembershipReader;
  readonly credentials: CredentialStore;
  readonly sessions: SessionStore;
  seedUser(input: { name: string; email: string }): User;
  seedCredential(input: {
    subjectType: SubjectType;
    subjectId: string;
    secretHash: string;
    algorithm: string;
  }): void;
  replaceCredential(input: {
    subjectType: SubjectType;
    subjectId: string;
    secretHash: string;
    algorithm: string;
  }): void;
  seedMembership(input: { organizationId: string; userId: string; role: UserRole }): void;
  seedCreator(input: { label: string }): PlatformIdentity;
}

export function createInMemoryAuthStores(): InMemoryAuthStores {
  const usersByEmail = new Map<string, User>();
  const usersById = new Map<string, User>();
  const creatorsById = new Map<string, PlatformIdentity>();
  const credsBySubject = new Map<string, Credential>();
  const membershipsByUser = new Map<string, { organizationId: string; role: UserRole }[]>();
  const sessionsById = new Map<string, Session>();
  const sessionIdByTokenHash = new Map<string, string>();
  const now = (): Date => new Date();

  return {
    identities: {
      async findUserByEmail(email) {
        const u = usersByEmail.get(email);
        return u !== undefined ? { id: u.id } : null;
      },
      async findCreatorByEmail() {
        return null;
      },
      async findUserById(id) {
        return usersById.get(id) ?? null;
      },
      async findCreatorById(id) {
        return creatorsById.get(id) ?? null;
      },
    },
    memberships: {
      async listByUser(userId) {
        return membershipsByUser.get(userId) ?? [];
      },
    },
    credentials: {
      async findBySubject(subject) {
        return credsBySubject.get(`${subject.type}:${subject.id}`) ?? null;
      },
    },
    sessions: {
      async create({ tokenHash, subjectType, subjectId, csrfToken, expiresAt }) {
        const created = now();
        const session: Session = {
          id: uuidv7(),
          subjectType,
          subjectId,
          csrfToken,
          activeOrganizationId: null,
          createdAt: created,
          expiresAt,
          lastSeenAt: null,
          revokedAt: null,
        };
        sessionsById.set(session.id, session);
        sessionIdByTokenHash.set(tokenHash, session.id);
        return session;
      },
      async findValidByTokenHash(tokenHash, at) {
        const id = sessionIdByTokenHash.get(tokenHash);
        if (id === undefined) return null;
        const s = sessionsById.get(id);
        if (s === undefined || s.revokedAt != null || at.getTime() >= s.expiresAt.getTime())
          return null;
        return s;
      },
      async revoke(id, at) {
        const s = sessionsById.get(id);
        if (s !== undefined) sessionsById.set(id, { ...s, revokedAt: at });
      },
      async setActiveOrganization(id, organizationId) {
        const s = sessionsById.get(id);
        if (s === undefined) throw new Error("sessão inexistente");
        const updated = { ...s, activeOrganizationId: organizationId };
        sessionsById.set(id, updated);
        return updated;
      },
    },
    seedUser({ name, email }) {
      const created = now();
      const user: User = {
        id: uuidv7(),
        name,
        email,
        status: "active",
        createdAt: created,
        updatedAt: created,
      };
      usersByEmail.set(email, user);
      usersById.set(user.id, user);
      return user;
    },
    seedCredential({ subjectType, subjectId, secretHash, algorithm }) {
      const created = now();
      credsBySubject.set(`${subjectType}:${subjectId}`, {
        id: uuidv7(),
        subjectType,
        subjectId,
        secretHash,
        algorithm,
        createdAt: created,
        updatedAt: created,
      });
    },
    replaceCredential({ subjectType, subjectId, secretHash, algorithm }) {
      const key = `${subjectType}:${subjectId}`;
      const current = credsBySubject.get(key);
      if (!current) throw new Error("credencial inexistente");
      credsBySubject.set(key, { ...current, secretHash, algorithm, updatedAt: now() });
    },
    seedMembership({ organizationId, userId, role }) {
      const list = membershipsByUser.get(userId) ?? [];
      list.push({ organizationId, role });
      membershipsByUser.set(userId, list);
    },
    seedCreator({ label }) {
      const created = now();
      const creator: PlatformIdentity = {
        id: uuidv7(),
        kind: "creator",
        label,
        createdAt: created,
        updatedAt: created,
      };
      creatorsById.set(creator.id, creator);
      return creator;
    },
  };
}
