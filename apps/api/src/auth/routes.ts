import type { FastifyInstance, FastifyReply } from "fastify";
import {
  normalizeEmail,
  type Authenticator,
  type AuthorizedInput,
  type UseCase,
  type PasswordHasher,
  type Result,
  type ApplicationError,
} from "@britus/application";
import type { UserRole } from "@britus/contracts";
import { toHttpError } from "../http/error-map.js";
import { readSessionCookie, setSessionCookie, clearSessionCookie } from "./cookie.js";
import type { InMemoryAuthStores } from "./in-memory.js";

export interface AuthRoutesDeps {
  readonly authenticator: Authenticator;
  // Mesmo caso de uso autorizado usado pela rota __dev → prova de PARIDADE de decisão.
  readonly authorizedCreateClient: UseCase<AuthorizedInput, unknown>;
  readonly secureCookie: boolean;
  readonly sessionTtlSeconds: number;
  // Somente DEV/TESTE: quando presentes, expõem `/__dev/seed-operator` (composição em
  // memória). Na composição REAL (Drizzle) ficam ausentes — o provisionamento é via bootstrap.
  readonly seedStores?: InMemoryAuthStores;
  readonly hasher?: PasswordHasher;
}

async function fail(reply: FastifyReply, error: ApplicationError): Promise<void> {
  const httpError = toHttpError(error);
  await reply.status(httpError.statusCode).send(httpError.body);
}

async function sendResult<T>(reply: FastifyReply, result: Result<T, ApplicationError>, okStatus: number): Promise<void> {
  if (result.ok) {
    await reply.status(okStatus).send(result.value);
    return;
  }
  await fail(reply, result.error);
}

export function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps): void {
  // ⚠️ DEV/TESTE — provisiona um operador (usuário + credencial + membership) simulando o
  // bootstrap, para exercitar o fluxo autenticado sem banco. Só existe quando seedStores/hasher
  // são fornecidos (composição em memória sob enableTestRoutes).
  const seedStores = deps.seedStores;
  const hasher = deps.hasher;
  if (seedStores !== undefined && hasher !== undefined) {
    app.post("/__dev/seed-operator", async (request, reply) => {
      const body = request.body as { email?: string; password?: string; organizationId?: string; role?: UserRole };
      if (typeof body?.email !== "string" || typeof body?.password !== "string" || typeof body?.organizationId !== "string") {
        await reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "email, password e organizationId obrigatórios" } });
        return;
      }
      const user = seedStores.seedUser({ name: "Operador", email: normalizeEmail(body.email) });
      seedStores.seedCredential({
        subjectType: "user",
        subjectId: user.id,
        secretHash: await hasher.hash(body.password),
        algorithm: hasher.algorithm,
      });
      seedStores.seedMembership({ organizationId: body.organizationId, userId: user.id, role: body.role ?? "lawyer" });
      await reply.status(201).send({ userId: user.id });
    });
  }

  app.post("/auth/login", async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    if (typeof body?.email !== "string" || typeof body?.password !== "string") {
      await reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "credenciais ausentes" } });
      return;
    }
    const result = await deps.authenticator.login({ email: body.email, password: body.password });
    if (!result.ok) {
      await fail(reply, result.error); // UNAUTHENTICATED → 401, mensagem genérica
      return;
    }
    setSessionCookie(reply, result.value.token, deps.sessionTtlSeconds, deps.secureCookie);
    // CSRF (double-submit): devolvido ao cliente para ecoar no header `x-csrf-token` em
    // rotas mutáveis. Não é segredo de sessão; o cookie de sessão permanece httpOnly.
    await reply.status(200).send({ ok: true, csrfToken: result.value.session.csrfToken });
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = readSessionCookie(request);
    if (token !== null) await deps.authenticator.revoke(token);
    clearSessionCookie(reply, deps.secureCookie);
    await reply.status(204).send();
  });

  app.post("/auth/active-organization", async (request, reply) => {
    const token = readSessionCookie(request);
    if (token === null) {
      await reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } });
      return;
    }
    const body = request.body as { organizationId?: string };
    if (typeof body?.organizationId !== "string") {
      await reply.status(400).send({ error: { code: "VALIDATION_ERROR", message: "organizationId obrigatório" } });
      return;
    }
    await sendResult(reply, await deps.authenticator.selectActiveOrganization({ token, organizationId: body.organizationId }), 200);
  });

  // Rota de workflow AUTENTICADA (produção-like): contexto derivado 100% no servidor a
  // partir da sessão; org ativa da sessão (nunca do corpo). Mesmo caso de uso autorizado
  // da rota __dev → paridade de decisão + auditoria.
  app.post("/clients", async (request, reply) => {
    const token = readSessionCookie(request);
    if (token === null) {
      await reply.status(401).send({ error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } });
      return;
    }
    const csrfHeader = request.headers["x-csrf-token"];
    const context = await deps.authenticator.resolveOrganizationContext({
      token,
      csrfToken: typeof csrfHeader === "string" ? csrfHeader : "",
      action: "client.create",
      resourceType: "client",
    });
    if (!context.ok) {
      await fail(reply, context.error);
      return;
    }
    const result = await deps.authorizedCreateClient.execute({ context: context.value, input: request.body });
    if (result.ok) {
      await reply.status(201).send(result.value);
      return;
    }
    await fail(reply, result.error);
  });
}
