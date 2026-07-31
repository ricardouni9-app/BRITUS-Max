import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authorizationContextSchema, type AuthorizationContext } from "@britus/contracts";
import type { AuthorizedInput, UseCase, Result, ApplicationError } from "@britus/application";
import { toHttpError } from "../../http/error-map.js";

// Header EXCLUSIVO de teste/desenvolvimento para injetar o contexto de identidade.
// ATENÇÃO: NÃO é autenticação de produção. Estas rotas só são registradas sob
// `enableTestRoutes` e jamais devem ser confundidas com um mecanismo autenticado real.
// O tenant vem SEMPRE do contexto (server-side) — nunca do corpo.
const DEV_CONTEXT_HEADER = "x-dev-authz-context";

export interface AuthzDevRoutesDeps {
  readonly authorizedCreateClient: UseCase<AuthorizedInput, unknown>;
  readonly authorizedRegisterAtendimento: UseCase<AuthorizedInput, unknown>;
  readonly authorizedOpenCase: UseCase<AuthorizedInput, unknown>;
  readonly authorizedConvert: UseCase<AuthorizedInput, unknown>;
}

function badRequest(message: string) {
  return { error: { code: "VALIDATION_ERROR" as const, message } };
}

// Extrai o contexto de autorização do header de teste. A ação/recurso reais são
// definidos pelo boundary na Application; aqui usamos placeholders válidos apenas para
// satisfazer o schema (serão sobrescritos).
function readContext(request: FastifyRequest): AuthorizationContext | null {
  const raw = request.headers[DEV_CONTEXT_HEADER];
  if (typeof raw !== "string") return null;
  let injected: unknown;
  try {
    injected = JSON.parse(raw);
  } catch {
    return null;
  }
  const base = injected !== null && typeof injected === "object" ? (injected as Record<string, unknown>) : {};
  const parsed = authorizationContextSchema.safeParse({
    ...base,
    action: "organization.view",
    resourceType: "organization",
  });
  return parsed.success ? parsed.data : null;
}

async function respond(reply: FastifyReply, result: Result<unknown, ApplicationError>): Promise<void> {
  if (result.ok) {
    await reply.status(201).send(result.value);
    return;
  }
  const httpError = toHttpError(result.error);
  await reply.status(httpError.statusCode).send(httpError.body);
}

// Demonstra a integração controlada: a rota apenas transporta identidade injetada + corpo;
// a decisão de autorização, a auditoria e a derivação do tenant vivem na Application.
export function registerAuthzDevRoutes(app: FastifyInstance, deps: AuthzDevRoutesDeps): void {
  app.post("/__dev/authorized/clients", async (request, reply) => {
    const context = readContext(request);
    if (context === null) {
      await reply.status(400).send(badRequest("contexto de identidade de teste ausente ou inválido"));
      return;
    }
    await respond(reply, await deps.authorizedCreateClient.execute({ context, input: request.body }));
  });

  app.post("/__dev/authorized/atendimentos", async (request, reply) => {
    const context = readContext(request);
    if (context === null) {
      await reply.status(400).send(badRequest("contexto de identidade de teste ausente ou inválido"));
      return;
    }
    await respond(reply, await deps.authorizedRegisterAtendimento.execute({ context, input: request.body }));
  });

  app.post("/__dev/authorized/cases", async (request, reply) => {
    const context = readContext(request);
    if (context === null) {
      await reply.status(400).send(badRequest("contexto de identidade de teste ausente ou inválido"));
      return;
    }
    await respond(reply, await deps.authorizedOpenCase.execute({ context, input: request.body }));
  });

  app.post("/__dev/authorized/atendimentos/:atendimentoId/conversion", async (request, reply) => {
    const context = readContext(request);
    if (context === null) {
      await reply.status(400).send(badRequest("contexto de identidade de teste ausente ou inválido"));
      return;
    }
    const { atendimentoId } = request.params as { atendimentoId: string };
    await respond(
      reply,
      await deps.authorizedConvert.execute({ context, input: { atendimentoId, client: request.body } }),
    );
  });
}
