import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";
import {
  makeCreateClient,
  makeRegisterAtendimento,
  makeOpenCase,
  makeConvertAtendimentoToClient,
  withAuthorization,
  makeAuthorizationGuard,
  createInMemoryAuditLog,
  makeAuthenticator,
  normalizeEmail,
  createInMemoryCatalog,
  createInMemorySubscriptionStore,
  makeStartTrial,
  makeContractModules,
  makeResolveEntitlements,
  makeProcessWebhook,
  createInMemoryPaymentStore,
  createInMemoryWebhookEventStore,
  type CatalogReader,
  type PaymentStore,
  type SubscriptionStore,
  type WebhookEventStore,
  type Authenticator,
  type MembershipReader,
} from "@britus/application";
import {
  createDatabasePool,
  createDatabaseClient,
  createDrizzleAuthStores,
  createDrizzleClientStore,
  createDrizzleAtendimentoStore,
  createDrizzleCaseStore,
  createDrizzleBillingStores,
} from "@britus/db";
import { buildApp } from "../app.js";
import { createInMemoryClientStore } from "../modules/client/in-memory-store.js";
import { createInMemoryAtendimentoStore } from "../modules/atendimento/in-memory-store.js";
import { createInMemoryCaseStore } from "../modules/case/in-memory-store.js";
import { createInMemoryAuthStores } from "../auth/in-memory.js";
import {
  createArgon2PasswordHasher,
  createSessionTokenFactory,
  createDummyPasswordHash,
} from "../auth/crypto.js";
import { createMercadoPagoGateway } from "../billing/providers.js";

export interface CommercialOptions {
  readonly backend: "memory" | "postgres";
  readonly databaseUrl?: string;
  readonly secureCookie: boolean;
  readonly sessionTtlSeconds: number;
  readonly logger?: boolean | { level: string };
  readonly mercadoPago?: { accessToken: string; webhookSecret: string; publicBaseUrl: string };
  // Operador de demonstração (apenas backend memory) — provisionado em memória no boot.
  readonly demoOperator?: { email: string; password: string };
}

export interface CommercialApp {
  readonly app: FastifyInstance;
  readonly close: () => Promise<void>;
  // Presente apenas no backend memory quando um operador demo foi provisionado.
  readonly demo?: { email: string; organizationId: string };
}

const COMMERCIAL_MODULES = [
  {
    code: "core",
    name: "Operação essencial",
    priceCents: 4900,
    currency: "BRL" as const,
    active: true,
  },
  {
    code: "relationships",
    name: "Clientes e atendimentos",
    priceCents: 3000,
    currency: "BRL" as const,
    active: true,
  },
  {
    code: "workflows",
    name: "Casos, projetos e tarefas",
    priceCents: 3000,
    currency: "BRL" as const,
    active: true,
  },
];

// Constrói a aplicação COMERCIAL completa (auth real + rotas legítimas + UI) sobre o backend
// escolhido. Mesmos ports/casos de uso; troca-se apenas o adapter (hexagonal).
export async function composeCommercialApp(opts: CommercialOptions): Promise<CommercialApp> {
  const hasher = createArgon2PasswordHasher();
  const audit = createInMemoryAuditLog();
  const guard = makeAuthorizationGuard({ audit });

  let pool: ReturnType<typeof createDatabasePool> | undefined;
  let authStores:
    ReturnType<typeof createInMemoryAuthStores> | ReturnType<typeof createDrizzleAuthStores>;
  let clients:
    ReturnType<typeof createInMemoryClientStore> | ReturnType<typeof createDrizzleClientStore>;
  let atendimentos:
    | ReturnType<typeof createInMemoryAtendimentoStore>
    | ReturnType<typeof createDrizzleAtendimentoStore>;
  let cases: ReturnType<typeof createInMemoryCaseStore> | ReturnType<typeof createDrizzleCaseStore>;
  let catalog: CatalogReader;
  let subscriptions: SubscriptionStore;
  let payments: PaymentStore;
  let webhookEvents: WebhookEventStore;
  let seeds: ReturnType<typeof createInMemoryAuthStores> | undefined;
  let demo: { email: string; organizationId: string } | undefined;
  const memoryTrialEnds = new Map<string, Date>();

  if (opts.backend === "postgres") {
    if (!opts.databaseUrl) throw new Error("databaseUrl obrigatório no backend postgres");
    pool = createDatabasePool({ connectionString: opts.databaseUrl });
    const db = createDatabaseClient(pool);
    authStores = createDrizzleAuthStores(db);
    clients = createDrizzleClientStore(db);
    atendimentos = createDrizzleAtendimentoStore(db);
    cases = createDrizzleCaseStore(db);
    const billing = createDrizzleBillingStores(db);
    catalog = billing.catalog;
    subscriptions = billing.subscriptions;
    payments = billing.payments;
    webhookEvents = billing.webhookEvents;
    for (const module of COMMERCIAL_MODULES) await billing.catalog.ensureModule(module);
  } else {
    const mem = createInMemoryAuthStores();
    seeds = mem;
    authStores = mem;
    clients = createInMemoryClientStore();
    atendimentos = createInMemoryAtendimentoStore();
    cases = createInMemoryCaseStore();
    catalog = createInMemoryCatalog(COMMERCIAL_MODULES);
    subscriptions = createInMemorySubscriptionStore();
    payments = createInMemoryPaymentStore();
    webhookEvents = createInMemoryWebhookEventStore();
  }

  const authenticator: Authenticator = makeAuthenticator({
    identities: authStores.identities,
    credentials: authStores.credentials,
    memberships: authStores.memberships,
    sessions: authStores.sessions,
    audit,
    hasher,
    tokens: createSessionTokenFactory(),
    sessionTtlMs: opts.sessionTtlSeconds * 1000,
    dummyHash: createDummyPasswordHash(),
  });

  const createClient = makeCreateClient({ clients, duplicates: clients });
  const authorizedCreateClient = withAuthorization(
    createClient,
    { action: "client.create", resourceType: "client" },
    { guard },
  );
  const authorizedRegisterAtendimento = withAuthorization(
    makeRegisterAtendimento({ atendimentos }),
    { action: "atendimento.register", resourceType: "atendimento" },
    { guard },
  );
  const authorizedOpenCase = withAuthorization(
    makeOpenCase({ cases, atendimentos }),
    { action: "case.open", resourceType: "case" },
    { guard },
  );
  const authorizedConvert = withAuthorization(
    makeConvertAtendimentoToClient({ atendimentos, createClient }),
    { action: "client.create", resourceType: "client" },
    { guard },
  );

  const startEssentialTrial = async (input: { name: string; email: string; password: string }) => {
    const email = normalizeEmail(input.email);
    const trialStartsAt = new Date();
    const trialEndsAt = new Date(trialStartsAt.getTime() + 48 * 60 * 60 * 1000);
    const organizationId = uuidv7();

    if (seeds) {
      if (await seeds.identities.findUserByEmail(email)) return { created: false as const };
      const user = seeds.seedUser({ name: input.name, email });
      seeds.seedCredential({
        subjectType: "user",
        subjectId: user.id,
        secretHash: await hasher.hash(input.password),
        algorithm: hasher.algorithm,
      });
      seeds.seedMembership({ organizationId, userId: user.id, role: "owner" });
      memoryTrialEnds.set(organizationId, trialEndsAt);
      const subscription = await subscriptions.create({
        organizationId,
        status: "trialing",
        currency: "BRL",
        trialEndsAt,
        currentPeriodEndsAt: null,
      });
      await subscriptions.replaceItems(
        subscription.id,
        COMMERCIAL_MODULES.map((module) => ({
          moduleCode: module.code,
          priceCents: module.priceCents,
          currency: module.currency,
        })),
      );
    } else if (pool) {
      if ((await pool.query("select 1 from users where email=$1 limit 1", [email])).rowCount) {
        return { created: false as const };
      }
      const userId = uuidv7();
      const credentialId = uuidv7();
      const membershipId = uuidv7();
      const subscriptionId = uuidv7();
      const secretHash = await hasher.hash(input.password);
      const client = await pool.connect();
      try {
        await client.query("begin");
        await client.query("insert into organizations (id,name,status) values ($1,$2,'active')", [
          organizationId,
          `Teste — ${input.name}`,
        ]);
        await client.query("insert into users (id,name,email,status) values ($1,$2,$3,'active')", [
          userId,
          input.name,
          email,
        ]);
        await client.query(
          "insert into credentials (id,subject_type,subject_id,secret_hash,algorithm) values ($1,'user',$2,$3,$4)",
          [credentialId, userId, secretHash, hasher.algorithm],
        );
        await client.query(
          "insert into organization_memberships (id,organization_id,user_id,role) values ($1,$2,$3,'owner')",
          [membershipId, organizationId, userId],
        );
        await client.query(
          "insert into subscriptions (id,organization_id,status,currency,trial_ends_at,current_period_ends_at) values ($1,$2,'trialing','BRL',$3,null)",
          [subscriptionId, organizationId, trialEndsAt],
        );
        await client.query("commit");
        await subscriptions.replaceItems(
          subscriptionId,
          COMMERCIAL_MODULES.map((module) => ({
            moduleCode: module.code,
            priceCents: module.priceCents,
            currency: module.currency,
          })),
        );
      } catch (error) {
        await client.query("rollback");
        if ((error as { code?: string }).code === "23505") return { created: false as const };
        throw error;
      } finally {
        client.release();
      }
    } else {
      return { created: false as const };
    }

    const login = await authenticator.login({ email, password: input.password });
    if (!login.ok) throw new Error("Falha ao criar sessão automática do teste");
    const selected = await authenticator.selectActiveOrganization({
      token: login.value.token,
      organizationId,
    });
    if (!selected.ok) throw new Error("Falha ao selecionar organização do teste");
    return {
      created: true as const,
      token: login.value.token,
      csrfToken: selected.value.csrfToken,
      organizationId,
      trialStartsAt,
      trialEndsAt,
    };
  };

  const getAccessStatus = async (organizationId: string) => {
    if (!pool) {
      const trialEndsAt = memoryTrialEnds.get(organizationId) ?? null;
      const allowed = trialEndsAt === null || trialEndsAt.getTime() > Date.now();
      return {
        status: allowed ? ("trialing" as const) : ("expired" as const),
        trialEndsAt,
        currentPeriodEndsAt: null,
        allowed,
      };
    }
    const result = await pool.query<{
      status: string;
      trial_ends_at: Date | null;
      current_period_ends_at: Date | null;
    }>(
      "select status, trial_ends_at, current_period_ends_at from subscriptions where organization_id=$1 limit 1",
      [organizationId],
    );
    const row = result.rows[0];
    if (!row)
      return {
        status: "expired" as const,
        trialEndsAt: null,
        currentPeriodEndsAt: null,
        allowed: false,
      };
    const trialEndsAt = row.trial_ends_at ? new Date(row.trial_ends_at) : null;
    const currentPeriodEndsAt = row.current_period_ends_at
      ? new Date(row.current_period_ends_at)
      : null;
    const now = Date.now();
    const trialAllowed =
      row.status === "trialing" && trialEndsAt !== null && trialEndsAt.getTime() > now;
    const paidAllowed =
      row.status === "active" &&
      currentPeriodEndsAt !== null &&
      currentPeriodEndsAt.getTime() > now;
    return {
      status: paidAllowed
        ? ("active" as const)
        : trialAllowed
          ? ("trialing" as const)
          : ("expired" as const),
      trialEndsAt,
      currentPeriodEndsAt,
      allowed: trialAllowed || paidAllowed,
    };
  };

  // Operador de demonstração — SOMENTE backend memory, provisionado em memória (nunca via HTTP).
  if (seeds !== undefined && opts.demoOperator !== undefined) {
    const organizationId = uuidv7();
    const user = seeds.seedUser({ name: "Operador", email: opts.demoOperator.email.toLowerCase() });
    seeds.seedCredential({
      subjectType: "user",
      subjectId: user.id,
      secretHash: await hasher.hash(opts.demoOperator.password),
      algorithm: hasher.algorithm,
    });
    seeds.seedMembership({ organizationId, userId: user.id, role: "owner" });
    demo = { email: opts.demoOperator.email, organizationId };
  }

  const app = buildApp({
    logger: opts.logger,
    auth: {
      authenticator,
      authorizedCreateClient,
      secureCookie: opts.secureCookie,
      sessionTtlSeconds: opts.sessionTtlSeconds,
      canUseOrganization: async (organizationId) => (await getAccessStatus(organizationId)).allowed,
    },
    billing: {
      catalog,
      subscriptions,
      startTrial: makeStartTrial({ subscriptions }),
      contractModules: makeContractModules({ subscriptions, catalog }),
      resolveEntitlements: makeResolveEntitlements({ subscriptions }),
      webhookProcessors: opts.mercadoPago
        ? {
            mercadopago: makeProcessWebhook({
              gateway: createMercadoPagoGateway(
                opts.mercadoPago.webhookSecret,
                opts.mercadoPago.accessToken,
              ),
              webhookEvents,
              payments,
              subscriptions,
            }),
          }
        : {},
      authenticator,
      createCheckout: opts.mercadoPago
        ? async ({ organizationId, plan, moduleCodes }) => {
            let monthlyCents = 0;
            const names: string[] = [];
            for (const code of moduleCodes) {
              const module = await catalog.findModule(code);
              if (!module || !module.active) throw new Error(`Módulo indisponível: ${code}`);
              monthlyCents += module.priceCents;
              names.push(module.name);
            }
            const amountCents = plan === "annual" ? monthlyCents * 10 : monthlyCents;
            const baseUrl = opts.mercadoPago!.publicBaseUrl.replace(/\/$/, "");
            const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                authorization: `Bearer ${opts.mercadoPago!.accessToken}`,
              },
              body: JSON.stringify({
                items: [
                  {
                    id: `britus-${plan}`,
                    title: `BRITUS — ${names.join(", ")}`,
                    quantity: 1,
                    unit_price: amountCents / 100,
                    currency_id: "BRL",
                  },
                ],
                back_urls: {
                  success: `${baseUrl}/?payment=success`,
                  failure: `${baseUrl}/?payment=failure`,
                  pending: `${baseUrl}/?payment=pending`,
                },
                auto_return: "approved",
                notification_url: `${baseUrl}/billing/webhook/mercadopago`,
                external_reference: organizationId,
                metadata: { plan, moduleCodes },
              }),
            });
            const data = (await response.json()) as { init_point?: unknown };
            if (!response.ok || typeof data.init_point !== "string") {
              throw new Error("Falha ao criar checkout Mercado Pago");
            }
            return { checkoutUrl: data.init_point };
          }
        : undefined,
    },
    commercial: {
      authenticator,
      memberships: authStores.memberships as MembershipReader,
      authorizedRegisterAtendimento,
      authorizedOpenCase,
      authorizedConvert,
      startEssentialTrial,
      secureCookie: opts.secureCookie,
      sessionTtlSeconds: opts.sessionTtlSeconds,
      getAccessStatus,
      completeOrganization: async (input) => {
        if (!pool) return;
        await pool.query(
          `update organizations set name=$2, legal_name=$2, tax_id=$3, email=$4, phone=$5,
             address_line=$6, city=$7, state=$8, postal_code=$9, profile_completed_at=now(), updated_at=now()
           where id=$1`,
          [
            input.organizationId,
            input.legalName,
            input.taxId,
            input.email,
            input.phone,
            input.addressLine,
            input.city,
            input.state,
            input.postalCode,
          ],
        );
      },
      getPlatformContact: async () => {
        if (!pool)
          return { label: "BRITUS", email: null, phone: null, whatsapp: null, website: null };
        const result = await pool.query<{
          label: string;
          email: string | null;
          phone: string | null;
          whatsapp: string | null;
          website: string | null;
        }>(
          "select label, email, phone, whatsapp, website from platform_identities where kind='creator' limit 1",
        );
        return (
          result.rows[0] ?? {
            label: "BRITUS",
            email: null,
            phone: null,
            whatsapp: null,
            website: null,
          }
        );
      },
      serveUi: true,
    },
  });

  const close = async (): Promise<void> => {
    await app.close();
    if (pool) await pool.end();
  };

  return { app, close, demo };
}
