import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type {
  Authenticator,
  AuthorizedInput,
  UseCase,
  Result,
  ApplicationError,
  MembershipReader,
} from "@britus/application";
import type { AuthorizationAction, ResourceType } from "@britus/contracts";
import { toHttpError } from "../http/error-map.js";
import { readSessionCookie } from "../auth/cookie.js";

// Rotas COMERCIAIS legítimas (produção): identidade/organização/permissões derivadas e
// validadas 100% no servidor a partir da sessão (cookie httpOnly) + CSRF (double-submit)
// nas mutações. NENHUMA dependência de /__dev, header de contexto arbitrário ou seed.
export interface CommercialRoutesDeps {
  readonly authenticator: Authenticator;
  readonly memberships: MembershipReader;
  readonly authorizedRegisterAtendimento: UseCase<AuthorizedInput, unknown>;
  readonly authorizedOpenCase: UseCase<AuthorizedInput, unknown>;
  readonly authorizedConvert: UseCase<AuthorizedInput, unknown>;
}

export function registerCommercialRoutes(app: FastifyInstance, deps: CommercialRoutesDeps): void {
  async function send<T>(reply: FastifyReply, r: Result<T, ApplicationError>, ok: number): Promise<void> {
    if (r.ok) {
      await reply.status(ok).send(r.value);
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  }

  // Contexto de autorização derivado da sessão (+ CSRF). Reutiliza o mesmo boundary de /clients.
  async function ctx(request: FastifyRequest, action: AuthorizationAction, resourceType: ResourceType) {
    const token = readSessionCookie(request) ?? "";
    const csrf = request.headers["x-csrf-token"];
    return deps.authenticator.resolveOrganizationContext({
      token,
      csrfToken: typeof csrf === "string" ? csrf : "",
      action,
      resourceType,
    });
  }

  // Estado da sessão para a UI (sem segredos de sessão): tipo, org ativa, CSRF e vínculos
  // para seleção de organização. Cookie de sessão permanece httpOnly.
  app.get("/auth/session", async (request, reply) => {
    const token = readSessionCookie(request);
    if (token === null) {
      await reply.status(200).send({ authenticated: false });
      return;
    }
    const authed = await deps.authenticator.authenticate(token);
    if (!authed.ok) {
      await reply.status(200).send({ authenticated: false });
      return;
    }
    const s = authed.value;
    const memberships = s.subjectType === "user" ? await deps.memberships.listByUser(s.subjectId) : [];
    await reply.status(200).send({
      authenticated: true,
      subjectType: s.subjectType,
      activeOrganizationId: s.activeOrganizationId ?? null,
      csrfToken: s.csrfToken,
      memberships,
    });
  });

  app.post("/atendimentos", async (request, reply) => {
    const c = await ctx(request, "atendimento.register", "atendimento");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    await send(reply, await deps.authorizedRegisterAtendimento.execute({ context: c.value, input: request.body }), 201);
  });

  app.post("/cases", async (request, reply) => {
    const c = await ctx(request, "case.open", "case");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    await send(reply, await deps.authorizedOpenCase.execute({ context: c.value, input: request.body }), 201);
  });

  app.post("/atendimentos/:atendimentoId/conversion", async (request, reply) => {
    const c = await ctx(request, "client.create", "client");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    const { atendimentoId } = request.params as { atendimentoId: string };
    await send(reply, await deps.authorizedConvert.execute({ context: c.value, input: { atendimentoId, client: request.body } }), 201);
  });
}
