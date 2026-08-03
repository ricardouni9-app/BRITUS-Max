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
import { setSessionCookie } from "../auth/cookie.js";

// Rotas COMERCIAIS legítimas (produção): identidade/organização/permissões derivadas e
// validadas 100% no servidor a partir da sessão (cookie httpOnly) + CSRF (double-submit)
// nas mutações. NENHUMA dependência de /__dev, header de contexto arbitrário ou seed.
export interface CommercialRoutesDeps {
  readonly authenticator: Authenticator;
  readonly memberships: MembershipReader;
  readonly authorizedRegisterAtendimento: UseCase<AuthorizedInput, unknown>;
  readonly authorizedOpenCase: UseCase<AuthorizedInput, unknown>;
  readonly authorizedConvert: UseCase<AuthorizedInput, unknown>;
  readonly startEssentialTrial?: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<
    | { created: false }
    | {
        created: true;
        token: string;
        csrfToken: string;
        organizationId: string;
        trialStartsAt: Date;
        trialEndsAt: Date;
      }
  >;
  readonly secureCookie?: boolean;
  readonly sessionTtlSeconds?: number;
  readonly getAccessStatus?: (organizationId: string) => Promise<{
    status: "trialing" | "active" | "expired";
    trialEndsAt: Date | null;
    currentPeriodEndsAt: Date | null;
    allowed: boolean;
  }>;
  readonly completeOrganization?: (input: {
    organizationId: string;
    legalName: string;
    taxId: string;
    email: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    postalCode: string;
  }) => Promise<void>;
  readonly getPlatformContact?: () => Promise<{
    label: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    website: string | null;
  } | null>;
  readonly requestPasswordReset?: (email: string) => Promise<void>;
  readonly resetPassword?: (token: string, newPassword: string) => Promise<boolean>;
}

export function registerCommercialRoutes(app: FastifyInstance, deps: CommercialRoutesDeps): void {
  const attempts = new Map<string, { count: number; resetAt: number }>();

  app.get("/public/platform-contact", async (_request, reply) => {
    const contact = await deps.getPlatformContact?.();
    return reply
      .status(200)
      .send(
        contact ?? { label: "BRITUS", email: null, phone: null, whatsapp: null, website: null },
      );
  });

  app.post("/public/password-recovery", async (request, reply) => {
    const now = Date.now();
    const key = `recovery:${request.ip}`;
    const previous = attempts.get(key);
    const bucket =
      !previous || previous.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : previous;
    bucket.count += 1;
    attempts.set(key, bucket);
    if (bucket.count > 3)
      return reply.status(429).send({
        error: { code: "RATE_LIMITED", message: "Aguarde um minuto e tente novamente." },
      });
    const body = request.body as { email?: unknown } | null;
    if (!body || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email))
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Informe um e-mail válido." },
      });
    await deps.requestPasswordReset?.(body.email.slice(0, 320));
    return reply.status(200).send({
      message: "Se o e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
  });

  app.post("/public/password-reset", async (request, reply) => {
    const body = request.body as { token?: unknown; password?: unknown } | null;
    if (
      !body ||
      typeof body.token !== "string" ||
      body.token.length < 32 ||
      typeof body.password !== "string" ||
      body.password.length < 10
    )
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Link inválido ou senha com menos de 10 caracteres.",
        },
      });
    const changed = await deps.resetPassword?.(body.token, body.password);
    if (!changed)
      return reply.status(400).send({
        error: { code: "INVALID_TOKEN", message: "Link inválido, expirado ou já utilizado." },
      });
    return reply.status(200).send({ message: "Senha redefinida com segurança." });
  });

  app.post("/public/trial", async (request, reply) => {
    if (!deps.startEssentialTrial)
      return reply
        .status(503)
        .send({ error: { code: "UNAVAILABLE", message: "Teste temporariamente indisponível." } });
    const now = Date.now();
    const previous = attempts.get(request.ip);
    const bucket =
      !previous || previous.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : previous;
    bucket.count += 1;
    attempts.set(request.ip, bucket);
    if (bucket.count > 5)
      return reply
        .status(429)
        .send({ error: { code: "RATE_LIMITED", message: "Aguarde um minuto e tente novamente." } });
    const b = request.body as Record<string, unknown> | null;
    if (
      !b ||
      b.website !== "" ||
      typeof b.name !== "string" ||
      b.name.trim().length < 2 ||
      typeof b.email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email) ||
      typeof b.password !== "string" ||
      b.password.length < 10
    ) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Informe nome, e-mail válido e senha com pelo menos 10 caracteres.",
        },
      });
    }
    const trial = await deps.startEssentialTrial({
      name: b.name.trim().slice(0, 160),
      email: b.email.trim().toLowerCase().slice(0, 320),
      password: b.password,
    });
    if (!trial.created) {
      return reply.status(409).send({
        error: {
          code: "CONFLICT",
          message: "Este e-mail já possui cadastro. Entre com sua senha.",
        },
      });
    }
    setSessionCookie(
      reply,
      trial.token,
      deps.sessionTtlSeconds ?? 172_800,
      deps.secureCookie ?? true,
    );
    return reply.status(201).send({
      csrfToken: trial.csrfToken,
      organizationId: trial.organizationId,
      trialStartsAt: trial.trialStartsAt,
      trialEndsAt: trial.trialEndsAt,
      message: "Teste integral liberado automaticamente por 48 horas.",
    });
  });
  async function send<T>(
    reply: FastifyReply,
    r: Result<T, ApplicationError>,
    ok: number,
  ): Promise<void> {
    if (r.ok) {
      await reply.status(ok).send(r.value);
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  }

  // Contexto de autorização derivado da sessão (+ CSRF). Reutiliza o mesmo boundary de /clients.
  async function ctx(
    request: FastifyRequest,
    action: AuthorizationAction,
    resourceType: ResourceType,
  ) {
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
    const memberships =
      s.subjectType === "user" ? await deps.memberships.listByUser(s.subjectId) : [];
    await reply.status(200).send({
      authenticated: true,
      subjectType: s.subjectType,
      activeOrganizationId: s.activeOrganizationId ?? null,
      csrfToken: s.csrfToken,
      memberships,
    });
  });

  app.get("/commercial/access", async (request, reply) => {
    const token = readSessionCookie(request);
    if (!token)
      return reply
        .status(401)
        .send({ error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } });
    const authed = await deps.authenticator.authenticate(token);
    if (!authed.ok || !authed.value.activeOrganizationId) {
      return reply
        .status(401)
        .send({ error: { code: "UNAUTHENTICATED", message: "Organização ativa ausente" } });
    }
    const status = await deps.getAccessStatus?.(authed.value.activeOrganizationId);
    return reply
      .status(200)
      .send(
        status ?? { status: "active", trialEndsAt: null, currentPeriodEndsAt: null, allowed: true },
      );
  });

  app.post("/commercial/organization-profile", async (request, reply) => {
    const token = readSessionCookie(request);
    if (!token)
      return reply
        .status(401)
        .send({ error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } });
    const authed = await deps.authenticator.authenticate(token);
    const csrf = request.headers["x-csrf-token"];
    if (!authed.ok || !authed.value.activeOrganizationId || csrf !== authed.value.csrfToken) {
      return reply
        .status(403)
        .send({ error: { code: "FORBIDDEN", message: "Sessão ou CSRF inválido" } });
    }
    const access = await deps.getAccessStatus?.(authed.value.activeOrganizationId);
    if (!access || access.status !== "active") {
      return reply.status(402).send({
        error: {
          code: "PAYMENT_REQUIRED",
          message: "Cadastro completo liberado após o pagamento aprovado.",
        },
      });
    }
    const body = request.body as Record<string, unknown> | null;
    const required = [
      "legalName",
      "taxId",
      "email",
      "phone",
      "addressLine",
      "city",
      "state",
      "postalCode",
    ] as const;
    if (
      !body ||
      required.some(
        (field) => typeof body[field] !== "string" || String(body[field]).trim().length < 2,
      )
    ) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Preencha o cadastro completo da organização.",
        },
      });
    }
    await deps.completeOrganization?.({
      organizationId: authed.value.activeOrganizationId,
      legalName: String(body.legalName).trim(),
      taxId: String(body.taxId).trim(),
      email: String(body.email).trim().toLowerCase(),
      phone: String(body.phone).trim(),
      addressLine: String(body.addressLine).trim(),
      city: String(body.city).trim(),
      state: String(body.state).trim().toUpperCase(),
      postalCode: String(body.postalCode).trim(),
    });
    return reply.status(200).send({ completed: true });
  });

  async function accessAllowed(organizationId: string): Promise<boolean> {
    return (await deps.getAccessStatus?.(organizationId))?.allowed ?? true;
  }

  app.post("/atendimentos", async (request, reply) => {
    const c = await ctx(request, "atendimento.register", "atendimento");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    if (!c.value.organizationId || !(await accessAllowed(c.value.organizationId))) {
      await reply.status(402).send({
        error: {
          code: "TRIAL_ENDED",
          message: "O teste de 48 horas terminou. Escolha o plano e os módulos para continuar.",
        },
      });
      return;
    }
    await send(
      reply,
      await deps.authorizedRegisterAtendimento.execute({ context: c.value, input: request.body }),
      201,
    );
  });

  app.post("/cases", async (request, reply) => {
    const c = await ctx(request, "case.open", "case");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    if (!c.value.organizationId || !(await accessAllowed(c.value.organizationId))) {
      await reply.status(402).send({
        error: {
          code: "TRIAL_ENDED",
          message: "O teste de 48 horas terminou. Escolha o plano e os módulos para continuar.",
        },
      });
      return;
    }
    await send(
      reply,
      await deps.authorizedOpenCase.execute({ context: c.value, input: request.body }),
      201,
    );
  });

  app.post("/atendimentos/:atendimentoId/conversion", async (request, reply) => {
    const c = await ctx(request, "client.create", "client");
    if (!c.ok) {
      const e = toHttpError(c.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    if (!c.value.organizationId || !(await accessAllowed(c.value.organizationId))) {
      await reply.status(402).send({
        error: {
          code: "TRIAL_ENDED",
          message: "O teste de 48 horas terminou. Escolha o plano e os módulos para continuar.",
        },
      });
      return;
    }
    const { atendimentoId } = request.params as { atendimentoId: string };
    await send(
      reply,
      await deps.authorizedConvert.execute({
        context: c.value,
        input: { atendimentoId, client: request.body },
      }),
      201,
    );
  });
}
