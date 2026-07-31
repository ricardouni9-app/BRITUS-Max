import { and, eq, gt, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
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
  CredentialWriter,
  SessionStore,
} from "@britus/application";
import { users, type UserRow } from "../schema/users.js";
import { organizationMemberships } from "../schema/organization-memberships.js";
import { platformIdentities, type PlatformIdentityRow } from "../schema/platform-identities.js";
import { credentials, type CredentialRow } from "../schema/credentials.js";
import { sessions, type SessionRow } from "../schema/sessions.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

function toUser(r: UserRow): User {
  return { id: r.id, name: r.name, email: r.email, status: r.status, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
function toCreator(r: PlatformIdentityRow): PlatformIdentity {
  return { id: r.id, kind: r.kind, label: r.label, createdAt: r.createdAt, updatedAt: r.updatedAt };
}
function toCredential(r: CredentialRow): Credential {
  return {
    id: r.id,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    secretHash: r.secretHash,
    algorithm: r.algorithm,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
// NUNCA expõe `token_hash` (o token bruto jamais é persistido nem retornado).
function toSession(r: SessionRow): Session {
  return {
    id: r.id,
    subjectType: r.subjectType,
    subjectId: r.subjectId,
    csrfToken: r.csrfToken,
    activeOrganizationId: r.activeOrganizationId,
    createdAt: r.createdAt,
    expiresAt: r.expiresAt,
    lastSeenAt: r.lastSeenAt,
    revokedAt: r.revokedAt,
  };
}

export function createDrizzleIdentityReader(db: NodePgDatabase): IdentityReader {
  return {
    async findUserByEmail(normalizedEmail) {
      try {
        const [row] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
        return row ?? null;
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async findUserById(id) {
      try {
        const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return row === undefined ? null : toUser(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async findCreatorById(id) {
      try {
        const [row] = await db.select().from(platformIdentities).where(eq(platformIdentities.id, id)).limit(1);
        return row === undefined ? null : toCreator(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
  };
}

export function createDrizzleMembershipReader(db: NodePgDatabase): MembershipReader {
  return {
    async listByUser(userId) {
      try {
        const rows = await db
          .select({ organizationId: organizationMemberships.organizationId, role: organizationMemberships.role })
          .from(organizationMemberships)
          .where(eq(organizationMemberships.userId, userId));
        return rows;
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
  };
}

export function createDrizzleCredentialStore(db: NodePgDatabase): CredentialStore {
  return {
    async findBySubject(subject) {
      try {
        const [row] = await db
          .select()
          .from(credentials)
          .where(and(eq(credentials.subjectType, subject.type), eq(credentials.subjectId, subject.id)))
          .limit(1);
        return row === undefined ? null : toCredential(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
  };
}

export function createDrizzleSessionStore(db: NodePgDatabase): SessionStore {
  return {
    async create({ tokenHash, subjectType, subjectId, csrfToken, expiresAt }) {
      try {
        // Integridade de subject polimórfico: sessão só para subject existente (o identity
        // não é excluído no produto, então a checagem prévia é confiável).
        if (!(await subjectExists(db, subjectType, subjectId))) {
          throw new PersistenceError("INTERNAL_SERVER_ERROR", "Subject inexistente para a sessão");
        }
        const [row] = await db.insert(sessions).values({ tokenHash, subjectType, subjectId, csrfToken, expiresAt }).returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar sessão");
        return toSession(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
    async findValidByTokenHash(tokenHash, now) {
      try {
        const [row] = await db
          .select()
          .from(sessions)
          .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt), gt(sessions.expiresAt, now)))
          .limit(1);
        return row === undefined ? null : toSession(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async revoke(sessionId, now) {
      try {
        await db.update(sessions).set({ revokedAt: now }).where(eq(sessions.id, sessionId));
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async setActiveOrganization(sessionId, organizationId) {
      try {
        const [row] = await db
          .update(sessions)
          .set({ activeOrganizationId: organizationId })
          .where(eq(sessions.id, sessionId))
          .returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Sessão não encontrada");
        return toSession(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
  };
}

// Verifica a existência do subject polimórfico (user|creator) na tabela correta.
async function subjectExists(db: NodePgDatabase, subjectType: SubjectType, subjectId: string): Promise<boolean> {
  if (subjectType === "user") {
    const [r] = await db.select({ id: users.id }).from(users).where(eq(users.id, subjectId)).limit(1);
    return r !== undefined;
  }
  const [r] = await db.select({ id: platformIdentities.id }).from(platformIdentities).where(eq(platformIdentities.id, subjectId)).limit(1);
  return r !== undefined;
}

// Escrita de credencial — impede credencial de subject inexistente (integridade polimórfica).
// A unicidade (subject_type, subject_id) do schema impede duplicidade concorrente.
export function createDrizzleCredentialWriter(db: NodePgDatabase): CredentialWriter {
  return {
    async create({ subjectType, subjectId, secretHash, algorithm }) {
      try {
        if (!(await subjectExists(db, subjectType, subjectId))) {
          throw new PersistenceError("INTERNAL_SERVER_ERROR", "Subject inexistente para a credencial");
        }
        const [row] = await db.insert(credentials).values({ subjectType, subjectId, secretHash, algorithm }).returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar credencial");
        return toCredential(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
  };
}

// Writers usados pelo bootstrap (criação idempotente coordenada no serviço de bootstrap).
export interface DrizzleAuthWriters {
  ensureUser(input: { name: string; email: string }): Promise<User>;
  ensureMembership(input: { organizationId: string; userId: string; role: UserRole }): Promise<void>;
  ensureCreator(input: { label: string }): Promise<PlatformIdentity>;
  findAnyCreator(): Promise<PlatformIdentity | null>;
}

export function createDrizzleAuthWriters(db: NodePgDatabase): DrizzleAuthWriters {
  return {
    // Idempotente por e-mail (único). Devolve o existente ou cria.
    async ensureUser({ name, email }) {
      try {
        const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existing !== undefined) return toUser(existing);
        const [row] = await db.insert(users).values({ name, email }).returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar usuário");
        return toUser(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
    // Idempotente por (organization_id, user_id) — `onConflictDoNothing` cobre concorrência.
    async ensureMembership({ organizationId, userId, role }) {
      try {
        await db.insert(organizationMemberships).values({ organizationId, userId, role }).onConflictDoNothing();
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    // Idempotente + concorrência-safe: `kind` é único → no máximo um Criador. Insere
    // (onConflictDoNothing) e devolve o Criador existente.
    async ensureCreator({ label }) {
      try {
        await db.insert(platformIdentities).values({ label }).onConflictDoNothing();
        const [row] = await db.select().from(platformIdentities).where(eq(platformIdentities.kind, "creator")).limit(1);
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao provisionar Criador");
        return toCreator(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
    async findAnyCreator() {
      try {
        const [row] = await db.select().from(platformIdentities).where(eq(platformIdentities.kind, "creator")).limit(1);
        return row === undefined ? null : toCreator(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
  };
}

export interface DrizzleAuthStores {
  readonly identities: IdentityReader;
  readonly memberships: MembershipReader;
  readonly credentials: CredentialStore;
  readonly credentialWriter: CredentialWriter;
  readonly sessions: SessionStore;
  readonly writers: DrizzleAuthWriters;
}

export function createDrizzleAuthStores(db: NodePgDatabase): DrizzleAuthStores {
  return {
    identities: createDrizzleIdentityReader(db),
    memberships: createDrizzleMembershipReader(db),
    credentials: createDrizzleCredentialStore(db),
    credentialWriter: createDrizzleCredentialWriter(db),
    sessions: createDrizzleSessionStore(db),
    writers: createDrizzleAuthWriters(db),
  };
}
