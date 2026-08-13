import type { FastifyInstance } from "fastify";
import { uuidv7 } from "uuidv7";
import { createHash, randomBytes } from "node:crypto";
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
  readonly passwordRecoveryEmail?: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
    publicBaseUrl: string;
  };
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
  const memoryPasswordResets = new Map<
    string,
    { subjectType: "user" | "creator"; subjectId: string; expiresAt: Date; usedAt: Date | null }
  >();

  if (opts.backend === "postgres") {
    if (!opts.databaseUrl) throw new Error("databaseUrl obrigatório no backend postgres");
    pool = createDatabasePool({ connectionString: opts.databaseUrl });
    await pool.query(`CREATE TABLE IF NOT EXISTS platform_operations_settings (
      id text PRIMARY KEY DEFAULT 'primary', maintenance_mode boolean NOT NULL DEFAULT false,
      maintenance_message text NOT NULL DEFAULT 'Sistema em manutenção segura. Retornaremos em breve.',
      temporary_notice text, notice_expires_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
      INSERT INTO platform_operations_settings(id) VALUES('primary') ON CONFLICT(id) DO NOTHING;
      CREATE TABLE IF NOT EXISTS platform_operations_audit (
      id uuid PRIMARY KEY, creator_id uuid NOT NULL, action text NOT NULL, target_organization_id uuid,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
      CREATE INDEX IF NOT EXISTS platform_operations_audit_created_idx ON platform_operations_audit(created_at DESC);`);
    await pool.query(`CREATE TABLE IF NOT EXISTS case_financial_accounts (organization_id uuid NOT NULL REFERENCES organizations(id), case_id uuid PRIMARY KEY REFERENCES cases(id), quoted_cents integer NOT NULL DEFAULT 0, contracted_cents integer NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '', expected_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS case_financial_accounts_org_idx ON case_financial_accounts(organization_id);
    CREATE TABLE IF NOT EXISTS case_payments (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), case_id uuid NOT NULL REFERENCES cases(id), amount_cents integer NOT NULL CHECK(amount_cents>0), paid_at timestamptz NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS case_payments_org_case_idx ON case_payments(organization_id,case_id);
    CREATE TABLE IF NOT EXISTS case_notes (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), case_id uuid NOT NULL REFERENCES cases(id), narrative text NOT NULL, source text NOT NULL CHECK(source IN ('typed','voice')), created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS case_notes_org_case_idx ON case_notes(organization_id,case_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS team_packages (organization_id uuid PRIMARY KEY REFERENCES organizations(id), seats integer NOT NULL DEFAULT 1 CHECK(seats>=1), additional_seat_cents integer NOT NULL DEFAULT 0 CHECK(additional_seat_cents>=0), updated_at timestamptz NOT NULL DEFAULT now());`);
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

  const hashResetToken = (token: string): string =>
    createHash("sha256").update(token).digest("base64url");
  const requestPasswordReset = async (emailInput: string): Promise<void> => {
    const email = normalizeEmail(emailInput);
    const creator = await authStores.identities.findCreatorByEmail(email);
    const user = creator === null ? await authStores.identities.findUserByEmail(email) : null;
    const subject =
      user !== null
        ? { type: "user" as const, id: user.id }
        : creator !== null
          ? { type: "creator" as const, id: creator.id }
          : null;
    if (subject === null || !opts.passwordRecoveryEmail) return;
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (pool) {
      await pool.query(
        "insert into password_reset_tokens (id,subject_type,subject_id,token_hash,expires_at) values ($1,$2,$3,$4,$5)",
        [uuidv7(), subject.type, subject.id, tokenHash, expiresAt],
      );
    } else {
      memoryPasswordResets.set(tokenHash, {
        subjectType: subject.type,
        subjectId: subject.id,
        expiresAt,
        usedAt: null,
      });
    }
    const resetUrl = `${opts.passwordRecoveryEmail.publicBaseUrl.replace(/\/$/, "")}/?reset=${encodeURIComponent(token)}`;
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": opts.passwordRecoveryEmail.apiKey },
      body: JSON.stringify({
        sender: {
          email: opts.passwordRecoveryEmail.fromEmail,
          name: opts.passwordRecoveryEmail.fromName,
        },
        to: [{ email }],
        subject: "Recuperação de senha — BRITUS",
        htmlContent: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1c2733"><div style="background:#123f7b;color:#fff;padding:20px;border-radius:10px 10px 0 0"><h2 style="margin:0">Recuperação de senha — BRITUS</h2></div><div style="background:#f3e6d7;padding:24px;border-radius:0 0 10px 10px"><p>Recebemos uma solicitação para redefinir sua senha.</p><p><a href="${resetUrl}" style="display:inline-block;background:#1e5fbf;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Redefinir senha</a></p><p style="font-size:12px;color:#5a6b7b">Este link é válido por 24 horas e pode ser usado uma única vez. Se você não solicitou, ignore esta mensagem.</p></div></div>`,
      }),
    });
    if (!response.ok) {
      await audit.record({
        actorId: subject.id,
        identityType: subject.type === "creator" ? "platform_creator" : "organization_user",
        action: "auth.password_reset.request",
        decision: "deny",
      });
      return;
    }
    await audit.record({
      actorId: subject.id,
      identityType: subject.type === "creator" ? "platform_creator" : "organization_user",
      action: "auth.password_reset.request",
      decision: "allow",
    });
  };
  const resetPassword = async (token: string, newPassword: string): Promise<boolean> => {
    const tokenHash = hashResetToken(token);
    const now = new Date();
    let subject: { type: "user" | "creator"; id: string } | null = null;
    if (pool) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const found = await client.query<{ subject_type: "user" | "creator"; subject_id: string }>(
          "select subject_type,subject_id from password_reset_tokens where token_hash=$1 and used_at is null and expires_at>$2 for update",
          [tokenHash, now],
        );
        const row = found.rows[0];
        if (!row) {
          await client.query("rollback");
          return false;
        }
        const secretHash = await hasher.hash(newPassword);
        const updatedCredential = await client.query(
          "update credentials set secret_hash=$1,algorithm=$2,updated_at=$3 where subject_type=$4 and subject_id=$5",
          [secretHash, hasher.algorithm, now, row.subject_type, row.subject_id],
        );
        if (updatedCredential.rowCount !== 1) {
          await client.query("rollback");
          return false;
        }
        await client.query("update password_reset_tokens set used_at=$2 where token_hash=$1", [
          tokenHash,
          now,
        ]);
        await client.query(
          "update sessions set revoked_at=$3 where subject_type=$1 and subject_id=$2 and revoked_at is null",
          [row.subject_type, row.subject_id, now],
        );
        await client.query("commit");
        subject = { type: row.subject_type, id: row.subject_id };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    } else {
      const record = memoryPasswordResets.get(tokenHash);
      if (!record || record.usedAt || record.expiresAt <= now || !seeds) return false;
      seeds.replaceCredential({
        subjectType: record.subjectType,
        subjectId: record.subjectId,
        secretHash: await hasher.hash(newPassword),
        algorithm: hasher.algorithm,
      });
      record.usedAt = now;
      subject = { type: record.subjectType, id: record.subjectId };
    }
    await audit.record({
      actorId: subject.id,
      identityType: subject.type === "creator" ? "platform_creator" : "organization_user",
      action: "auth.password_reset.complete",
      decision: "allow",
    });
    return true;
  };

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
      requestPasswordReset,
      resetPassword,
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
      getWorkspace: async (organizationId) => {
        if (!pool) return { clients: [], atendimentos: [], cases: [], payments: [], notes: [], teamPackage: { seats: 1, additionalSeatCents: 0 } };
        const [clientsResult, atendimentosResult, casesResult, paymentsResult, notesResult, teamResult] = await Promise.all([
          pool.query("select id, person_type as \"personType\", display_name as \"displayName\", created_at as \"createdAt\" from clients where organization_id=$1 order by created_at desc limit 200", [organizationId]),
          pool.query("select id, channel_origin as \"channelOrigin\", summary, status, created_at as \"createdAt\" from atendimentos where organization_id=$1 order by created_at desc limit 200", [organizationId]),
          pool.query(`select c.id,c.title,c.status,c.financial_classification as "financialClassification",c.process_number as "processNumber",c.created_at as "createdAt",
            coalesce(f.quoted_cents,0) as "quotedCents",coalesce(f.contracted_cents,0) as "contractedCents",f.expected_at as "expectedAt",
            coalesce((select sum(p.amount_cents) from case_payments p where p.organization_id=c.organization_id and p.case_id=c.id),0) as "paidCents"
            from cases c left join case_financial_accounts f on f.case_id=c.id and f.organization_id=c.organization_id
            where c.organization_id=$1 order by c.created_at desc limit 300`, [organizationId]),
          pool.query("select p.id,p.case_id as \"caseId\",p.amount_cents as \"amountCents\",p.paid_at as \"paidAt\",p.note,c.title as \"caseTitle\" from case_payments p join cases c on c.id=p.case_id and c.organization_id=p.organization_id where p.organization_id=$1 order by p.paid_at desc limit 500", [organizationId]),
          pool.query("select n.id,n.case_id as \"caseId\",n.narrative,n.source,n.created_at as \"createdAt\",c.title as \"caseTitle\" from case_notes n join cases c on c.id=n.case_id and c.organization_id=n.organization_id where n.organization_id=$1 order by n.created_at desc limit 300", [organizationId]),
          pool.query("select seats,additional_seat_cents as \"additionalSeatCents\" from team_packages where organization_id=$1", [organizationId]),
        ]);
        return { clients: clientsResult.rows, atendimentos: atendimentosResult.rows, cases: casesResult.rows, payments: paymentsResult.rows, notes: notesResult.rows, teamPackage: teamResult.rows[0] ?? { seats: 1, additionalSeatCents: 0 } };
      },
      saveCaseFinance: async (input) => {
        if (!pool) return;
        await pool.query(`insert into case_financial_accounts(organization_id,case_id,quoted_cents,contracted_cents,description,expected_at)
          select $1,$2,$3,$4,$5,$6 from cases where id=$2 and organization_id=$1
          on conflict(case_id) do update set quoted_cents=$3,contracted_cents=$4,description=$5,expected_at=$6,updated_at=now()
          where case_financial_accounts.organization_id=$1`, [input.organizationId,input.caseId,input.quotedCents,input.contractedCents,input.description,input.expectedAt]);
      },
      registerCasePayment: async (input) => {
        if (!pool) return;
        await pool.query(`insert into case_payments(id,organization_id,case_id,amount_cents,paid_at,note)
          select $1,$2,$3,$4,$5,$6 from cases where id=$3 and organization_id=$2`, [uuidv7(),input.organizationId,input.caseId,input.amountCents,input.paidAt,input.note]);
      },
      registerCaseNote: async (input) => {
        if (!pool) return;
        await pool.query(`insert into case_notes(id,organization_id,case_id,narrative,source)
          select $1,$2,$3,$4,$5 from cases where id=$3 and organization_id=$2`, [uuidv7(),input.organizationId,input.caseId,input.narrative,input.source]);
      },
      saveTeamPackage: async (input) => {
        if (!pool) return;
        await pool.query(`insert into team_packages(organization_id,seats,additional_seat_cents) values($1,$2,$3)
          on conflict(organization_id) do update set seats=$2,additional_seat_cents=$3,updated_at=now()`, [input.organizationId,input.seats,input.additionalSeatCents]);
      },      getCreatorOperations: async () => {
        if (!pool) return { settings: {}, organizations: [], totals: {}, audit: [] };
        const [settings, organizations, totals, auditRows] = await Promise.all([
          pool.query("select maintenance_mode as \"maintenanceMode\",maintenance_message as \"maintenanceMessage\",temporary_notice as \"temporaryNotice\",notice_expires_at as \"noticeExpiresAt\" from platform_operations_settings where id='primary'"),
          pool.query(`select o.id,o.name,o.status as "organizationStatus",s.status as "subscriptionStatus",s.trial_ends_at as "trialEndsAt",s.current_period_ends_at as "currentPeriodEndsAt",
            coalesce(tp.seats,1) as seats,(select count(*) from organization_memberships om where om.organization_id=o.id) as "usersCount"
            from organizations o left join subscriptions s on s.organization_id=o.id left join team_packages tp on tp.organization_id=o.id
            order by o.created_at desc limit 500`),
          pool.query(`select count(*)::int as organizations,
            count(*) filter(where s.status='trialing')::int as trials,
            count(*) filter(where s.status='active')::int as active,
            count(*) filter(where s.status='expired')::int as expired
            from organizations o left join subscriptions s on s.organization_id=o.id`),
          pool.query("select action,target_organization_id as \"targetOrganizationId\",metadata,created_at as \"createdAt\" from platform_operations_audit order by created_at desc limit 100"),
        ]);
        return { settings: settings.rows[0] ?? {}, organizations: organizations.rows, totals: totals.rows[0] ?? {}, audit: auditRows.rows,
          privacyBoundary: "O Criador administra apenas metadados operacionais do SaaS. Conteúdo de clientes, casos, relatos, documentos e financeiro interno não é consultado." };
      },
      updateCreatorOperations: async (input) => {
        if (!pool) return;
        await pool.query(`insert into platform_operations_settings(id,maintenance_mode,maintenance_message,temporary_notice,notice_expires_at)
          values('primary',$1,$2,$3,$4) on conflict(id) do update set maintenance_mode=$1,maintenance_message=$2,temporary_notice=$3,notice_expires_at=$4,updated_at=now()`,
          [input.maintenanceMode,input.maintenanceMessage,input.temporaryNotice,input.noticeExpiresAt]);
        await pool.query("insert into platform_operations_audit(id,creator_id,action,metadata) values($1,$2,'platform.settings.update',$3::jsonb)",
          [uuidv7(),input.creatorId,JSON.stringify({ maintenanceMode: input.maintenanceMode, noticeExpiresAt: input.noticeExpiresAt })]);
      },
      updateOrganizationSaas: async (input) => {
        if (!pool) return;
        await pool.query("update subscriptions set status=$3,current_period_ends_at=$4,updated_at=now() where organization_id=$1 and exists(select 1 from organizations where id=$1)",
          [input.organizationId,input.creatorId,input.status,input.currentPeriodEndsAt]);
        await pool.query("insert into platform_operations_audit(id,creator_id,action,target_organization_id,metadata) values($1,$2,'saas.organization.status',$3,$4::jsonb)",
          [uuidv7(),input.creatorId,input.organizationId,JSON.stringify({ status: input.status, currentPeriodEndsAt: input.currentPeriodEndsAt })]);
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



