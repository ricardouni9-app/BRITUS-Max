import type {
  AuthorizationContext,
  AuthorizationAction,
  ResourceType,
  Session,
} from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import {
  unauthenticatedError,
  forbiddenError,
  validationError,
  type ApplicationError,
} from "../errors.js";
import type { AuditLog } from "../audit/ports.js";
import {
  normalizeEmail,
  type IdentityReader,
  type MembershipReader,
  type CredentialStore,
  type PasswordHasher,
  type SessionTokenFactory,
  type SessionStore,
} from "./ports.js";

export interface AuthenticatorDeps {
  readonly identities: IdentityReader;
  readonly credentials: CredentialStore;
  readonly hasher: PasswordHasher;
  readonly tokens: SessionTokenFactory;
  readonly sessions: SessionStore;
  readonly memberships: MembershipReader;
  readonly audit: AuditLog;
  readonly sessionTtlMs: number;
  // Hash "dummy" (mesmo custo) para verificação em tempo ~constante quando o usuário não
  // existe → sem enumeração/timing.
  readonly dummyHash: string;
  readonly now?: () => Date;
}

export interface LoginResult {
  readonly token: string;
  readonly session: Session;
}

export interface Authenticator {
  login(input: { email: string; password: string }): Promise<Result<LoginResult, ApplicationError>>;
  authenticate(token: string): Promise<Result<Session, ApplicationError>>;
  revoke(token: string): Promise<Result<void, ApplicationError>>;
  selectActiveOrganization(input: {
    token: string;
    organizationId: string;
  }): Promise<Result<Session, ApplicationError>>;
  resolveOrganizationContext(input: {
    token: string;
    csrfToken: string;
    action: AuthorizationAction;
    resourceType: ResourceType;
  }): Promise<Result<AuthorizationContext, ApplicationError>>;
}

// Serviço de aplicação de autenticação. PURO: não conhece HTTP, cookie, JWT, Fastify,
// Drizzle nem biblioteca de hashing (tudo via ports). Deriva o AuthorizationContext
// EXCLUSIVAMENTE no servidor; a organização ativa vem da sessão, validada ⊆ memberships.
// Audita eventos relevantes (login/logout/seleção de organização) SEM dados sensíveis.
export function makeAuthenticator(deps: AuthenticatorDeps): Authenticator {
  const clock = deps.now ?? ((): Date => new Date());

  async function authenticate(token: string): Promise<Result<Session, ApplicationError>> {
    const session = await deps.sessions.findValidByTokenHash(deps.tokens.hash(token), clock());
    if (session === null) {
      return err(unauthenticatedError("Sessão inválida, expirada ou revogada"));
    }
    return ok(session);
  }

  return {
    authenticate,

    async login({ email, password }) {
      const user = await deps.identities.findUserByEmail(normalizeEmail(email));
      const creator =
        user === null ? await deps.identities.findCreatorByEmail(normalizeEmail(email)) : null;
      const subject =
        user !== null
          ? { type: "user" as const, id: user.id }
          : creator !== null
            ? { type: "creator" as const, id: creator.id }
            : null;
      const credential = subject !== null ? await deps.credentials.findBySubject(subject) : null;
      const valid = await deps.hasher.verify(password, credential?.secretHash ?? deps.dummyHash);
      if (subject === null || credential === null || !valid) {
        await deps.audit.record({
          actorId: null,
          identityType: "organization_user",
          action: "auth.login",
          decision: "deny",
        });
        return err(unauthenticatedError("Credenciais inválidas"));
      }
      const now = clock();
      const generated = deps.tokens.generate();
      const session = await deps.sessions.create({
        tokenHash: generated.tokenHash,
        subjectType: subject.type,
        subjectId: subject.id,
        csrfToken: generated.csrfToken,
        expiresAt: new Date(now.getTime() + deps.sessionTtlMs),
      });
      await deps.audit.record({
        actorId: subject.id,
        identityType: subject.type === "creator" ? "platform_creator" : "organization_user",
        action: "auth.login",
        decision: "allow",
      });
      return ok({ token: generated.token, session });
    },

    async revoke(token) {
      const authed = await authenticate(token);
      if (!authed.ok) {
        return err(authed.error);
      }
      await deps.sessions.revoke(authed.value.id, clock());
      await deps.audit.record({
        actorId: authed.value.subjectId,
        identityType:
          authed.value.subjectType === "user" ? "organization_user" : "platform_creator",
        action: "auth.logout",
        decision: "allow",
      });
      return ok(undefined);
    },

    async selectActiveOrganization({ token, organizationId }) {
      const authed = await authenticate(token);
      if (!authed.ok) {
        return err(authed.error);
      }
      const session = authed.value;
      if (session.subjectType !== "user") {
        return err(forbiddenError("Somente usuário organizacional seleciona organização ativa"));
      }
      const memberships = await deps.memberships.listByUser(session.subjectId);
      if (!memberships.some((m) => m.organizationId === organizationId)) {
        await deps.audit.record({
          actorId: session.subjectId,
          identityType: "organization_user",
          action: "session.select_organization",
          organizationId,
          decision: "deny",
        });
        return err(forbiddenError("Organização não pertence ao usuário"));
      }
      const updated = await deps.sessions.setActiveOrganization(session.id, organizationId);
      await deps.audit.record({
        actorId: session.subjectId,
        identityType: "organization_user",
        action: "session.select_organization",
        organizationId,
        decision: "allow",
      });
      return ok(updated);
    },

    async resolveOrganizationContext({ token, csrfToken, action, resourceType }) {
      const authed = await authenticate(token);
      if (!authed.ok) {
        return err(authed.error);
      }
      const session = authed.value;
      if (session.subjectType !== "user") {
        return err(forbiddenError("Contexto organizacional requer usuário"));
      }
      // CSRF double-submit validado SERVER-SIDE contra a sessão (não confia em estado do cliente).
      if (session.csrfToken !== csrfToken) {
        return err(forbiddenError("Falha de verificação CSRF"));
      }
      const organizationId = session.activeOrganizationId ?? null;
      if (organizationId === null) {
        return err(validationError("Nenhuma organização ativa selecionada"));
      }
      const memberships = await deps.memberships.listByUser(session.subjectId);
      if (!memberships.some((m) => m.organizationId === organizationId)) {
        return err(forbiddenError("Organização ativa não pertence ao usuário"));
      }
      const context: AuthorizationContext = {
        identityType: "organization_user",
        userId: session.subjectId,
        memberships: [...memberships],
        emergencyScopes: [],
        action,
        resourceType,
        organizationId,
      };
      return ok(context);
    },
  };
}
