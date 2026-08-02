import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  Authenticator,
  CatalogReader,
  SubscriptionStore,
  Result,
  ApplicationError,
} from "@britus/application";
import type { Subscription, Entitlement, BillingProvider } from "@britus/contracts";
import { readSessionCookie } from "../auth/cookie.js";
import { toHttpError } from "../http/error-map.js";

type Executable<I, O> = { execute(input: I): Promise<Result<O, ApplicationError>> };

export interface BillingRoutesDeps {
  readonly catalog: CatalogReader;
  readonly subscriptions: SubscriptionStore;
  readonly startTrial: Executable<{ organizationId: string }, Subscription>;
  readonly contractModules: Executable<
    { organizationId: string; moduleCodes: readonly string[] },
    { subscription: Subscription; totalCents: number }
  >;
  readonly resolveEntitlements: {
    execute(organizationId: string): Promise<readonly Entitlement[]>;
  };
  readonly webhookProcessors: Readonly<
    Record<
      string,
      Executable<
        { raw: string; headers: Record<string, string | undefined> },
        { processed: boolean; duplicate: boolean }
      >
    >
  >;
  readonly authenticator: Authenticator;
  readonly createCheckout?: (input: {
    organizationId: string;
    plan: "monthly" | "annual";
    moduleCodes: readonly string[];
  }) => Promise<{ checkoutUrl: string }>;
}

type OrgResolution =
  { ok: true; organizationId: string } | { ok: false; status: number; body: unknown };

async function resolveActiveOrg(
  auth: Authenticator,
  request: FastifyRequest,
  mutation: boolean,
): Promise<OrgResolution> {
  const token = readSessionCookie(request);
  if (token === null)
    return {
      ok: false,
      status: 401,
      body: { error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } },
    };
  const authed = await auth.authenticate(token);
  if (!authed.ok) return { ok: false, status: 401, body: toHttpError(authed.error).body };
  const session = authed.value;
  if (session.subjectType !== "user")
    return {
      ok: false,
      status: 403,
      body: { error: { code: "FORBIDDEN", message: "Contexto organizacional requerido" } },
    };
  if (mutation) {
    const csrf = request.headers["x-csrf-token"];
    if (session.csrfToken !== (typeof csrf === "string" ? csrf : "")) {
      return {
        ok: false,
        status: 403,
        body: { error: { code: "FORBIDDEN", message: "Falha de verificação CSRF" } },
      };
    }
  }
  const organizationId = session.activeOrganizationId ?? null;
  if (organizationId === null)
    return {
      ok: false,
      status: 400,
      body: { error: { code: "VALIDATION_ERROR", message: "Selecione a organização ativa" } },
    };
  return { ok: true, organizationId };
}

export function registerBillingRoutes(app: FastifyInstance, deps: BillingRoutesDeps): void {
  // Catálogo global (não org-scoped; sem dados sensíveis).
  app.get("/billing/catalog", async (_request, reply) => {
    await reply.status(200).send({ modules: await deps.catalog.listActiveModules() });
  });

  app.post("/billing/trial", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, true);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const r = await deps.startTrial.execute({ organizationId: org.organizationId });
    if (r.ok) {
      await reply.status(201).send(r.value);
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  });

  app.post("/billing/subscription", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, true);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const body = request.body as { moduleCodes?: unknown };
    const codes = Array.isArray(body?.moduleCodes)
      ? body.moduleCodes.filter((c): c is string => typeof c === "string")
      : [];
    const r = await deps.contractModules.execute({
      organizationId: org.organizationId,
      moduleCodes: codes,
    });
    if (r.ok) {
      await reply.status(200).send(r.value);
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  });

  app.get("/billing/subscription", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, false);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const sub = await deps.subscriptions.findByOrganization(org.organizationId);
    const items = sub === null ? [] : await deps.subscriptions.listItems(sub.id);
    await reply.status(200).send({ subscription: sub, items });
  });

  app.get("/billing/entitlements", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, false);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    await reply
      .status(200)
      .send({ entitlements: await deps.resolveEntitlements.execute(org.organizationId) });
  });

  // Fronteira única para o checkout. O adapter de pagamento reaproveitável do SIR será
  // conectado aqui; a UI nunca recebe token do provedor nem depende de operação manual.
  app.post("/billing/checkout", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, true);
    if (!org.ok) return reply.status(org.status).send(org.body);
    if (!deps.createCheckout) {
      return reply.status(503).send({
        error: {
          code: "PAYMENT_UNAVAILABLE",
          message: "Pagamento automático ainda não configurado.",
        },
      });
    }
    const body = request.body as { plan?: unknown; moduleCodes?: unknown };
    const plan = body?.plan === "annual" ? "annual" : body?.plan === "monthly" ? "monthly" : null;
    const moduleCodes = Array.isArray(body?.moduleCodes)
      ? body.moduleCodes.filter((code): code is string => typeof code === "string")
      : [];
    if (!plan || moduleCodes.length === 0) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "Escolha o plano e ao menos um módulo." },
      });
    }
    const checkout = await deps.createCheckout({
      organizationId: org.organizationId,
      plan,
      moduleCodes,
    });
    return reply.status(201).send(checkout);
  });

  // Webhook do provedor — NÃO autenticado (assinatura verificada no gateway). Responde rápido;
  // nunca confia em query string; falha fechada em assinatura inválida.
  app.post("/billing/webhook/:provider", async (request, reply) => {
    const provider = (request.params as { provider: BillingProvider }).provider;
    const processor = deps.webhookProcessors[provider];
    if (processor === undefined) {
      await reply
        .status(404)
        .send({ error: { code: "NOT_FOUND", message: "Provedor desconhecido" } });
      return;
    }
    const raw = JSON.stringify(request.body ?? {});
    const headers = request.headers as Record<string, string | undefined>;
    const r = await processor.execute({ raw, headers });
    if (!r.ok) {
      const e = toHttpError(r.error);
      await reply.status(e.statusCode).send(e.body);
      return;
    }
    await reply.status(200).send({ received: true, duplicate: r.value.duplicate });
  });
}
