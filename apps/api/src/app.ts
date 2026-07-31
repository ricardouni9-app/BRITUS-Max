import Fastify, { type FastifyInstance } from "fastify";
import { paginationParamsSchema } from "@britus/contracts";
import {
  makeCreateClient,
  makeRegisterAtendimento,
  makeConvertAtendimentoToClient,
  makeOpenCase,
  withAuthorization,
  makeAuthorizationGuard,
  createInMemoryAuditLog,
  makeAuthenticator,
} from "@britus/application";
import { registerErrorHandling } from "./http/error-handler.js";
import { registerHealthRoutes } from "./routes/health.js";
import { parseInput } from "./http/validation.js";
import { createInMemoryClientStore } from "./modules/client/in-memory-store.js";
import { createInMemoryAtendimentoStore } from "./modules/atendimento/in-memory-store.js";
import { createInMemoryCaseStore } from "./modules/case/in-memory-store.js";
import { registerAuthzDevRoutes } from "./modules/authz/dev-routes.js";
import { createInMemoryAuthStores } from "./auth/in-memory.js";
import {
  createArgon2PasswordHasher,
  createSessionTokenFactory,
  createDummyPasswordHash,
} from "./auth/crypto.js";
import { registerAuthRoutes, type AuthRoutesDeps } from "./auth/routes.js";
import { registerBillingRoutes, type BillingRoutesDeps } from "./billing/routes.js";
import { registerWorkflowRoutes, type WorkflowRoutesDeps } from "./case-task/routes.js";
import { registerPilotUi } from "./pilot-ui.js";
import { registerCommercialRoutes, type CommercialRoutesDeps } from "./commercial/routes.js";
import { registerCommercialUi } from "./commercial/ui.js";

export interface BuildAppOptions {
  logger?: boolean | { level: string };
  // Somente para testes: habilita rotas técnicas que NÃO existem em produção.
  enableTestRoutes?: boolean;
  // Composição REAL de autenticação (adapters Drizzle). Quando presente, registra
  // `/auth/*` + `/clients` autenticados de forma independente do mecanismo __dev.
  auth?: AuthRoutesDeps;
  // Composição REAL de billing/SaaS (adapters Drizzle + gateways). Registra `/billing/*`.
  billing?: BillingRoutesDeps;
  // Workflow operacional do Caso (tarefas/prazos + dashboard). Registra `/cases/:id/tasks` etc.
  workflow?: WorkflowRoutesDeps;
  // Rotas COMERCIAIS legítimas (atendimento/caso/conversão + /auth/session) e, opcionalmente,
  // a UI comercial em `/`. Backend real via adapters (memory|postgres) — nunca __dev.
  commercial?: CommercialRoutesDeps & { serveUi?: boolean };
}

// Constrói a aplicação Fastify SEM iniciar o listener e SEM acessar banco.
// Pode ser instanciada em testes (via inject) sem abrir porta de rede.
export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: options.logger ?? false });

  registerErrorHandling(app);
  registerHealthRoutes(app);

  if (options.enableTestRoutes) {
    // UI de PILOTO same-origin (fluxo login→cliente→atendimento→caso). Só em modo demo.
    registerPilotUi(app);
    // Erro inesperado → valida o 500 sem vazar detalhes internos.
    app.get("/__test/boom", async () => {
      throw new Error("intentional test error — should not leak");
    });
    // Validação de query com schema compartilhado (@britus/contracts).
    app.get("/__test/paginate", async (request) => {
      const q = parseInput(paginationParamsSchema, request.query);
      return { page: q.page, pageSize: q.pageSize };
    });
    // Serialização de Date → ISO-8601 na fronteira HTTP/JSON.
    app.get("/__test/now", async () => ({ at: new Date("2026-07-25T12:00:00.000Z") }));

    // Isolamento organizacional (MP-012), exposto APENAS pelo mecanismo de teste/dev.
    // Stores em memória isolados por organização; casos de uso tenant-aware; a org vem
    // SEMPRE do contexto server-side (nunca do corpo); a autorização e a auditoria
    // vivem na Application (boundary); as rotas apenas transportam.
    const clientStore = createInMemoryClientStore();
    const atendimentoStore = createInMemoryAtendimentoStore();
    const caseStore = createInMemoryCaseStore();
    const createClient = makeCreateClient({ clients: clientStore, duplicates: clientStore });
    const auditLog = createInMemoryAuditLog();
    const guard = makeAuthorizationGuard({ audit: auditLog });

    // Mesmo caso de uso autorizado, compartilhado pela rota __dev (contexto por header) e
    // pela rota AUTENTICADA (contexto derivado da sessão) → prova de paridade de decisão.
    const authorizedCreateClient = withAuthorization(
      createClient,
      { action: "client.create", resourceType: "client" },
      { guard },
    );

    registerAuthzDevRoutes(app, {
      authorizedCreateClient,
      authorizedRegisterAtendimento: withAuthorization(
        makeRegisterAtendimento({ atendimentos: atendimentoStore }),
        { action: "atendimento.register", resourceType: "atendimento" },
        { guard },
      ),
      authorizedOpenCase: withAuthorization(
        makeOpenCase({ cases: caseStore, atendimentos: atendimentoStore }),
        { action: "case.open", resourceType: "case" },
        { guard },
      ),
      authorizedConvert: withAuthorization(
        makeConvertAtendimentoToClient({ atendimentos: atendimentoStore, createClient }),
        { action: "client.create", resourceType: "client" },
        { guard },
      ),
    });

    // Fundação de autenticação (MP-014) EM MEMÓRIA sob enableTestRoutes — só quando NÃO há
    // composição real (evita registrar `/auth` duas vezes). Em produção/integração os mesmos
    // ports são satisfeitos pelos adapters Drizzle; o `Authenticator` é idêntico.
    if (options.auth === undefined) {
      const authStores = createInMemoryAuthStores();
      const hasher = createArgon2PasswordHasher();
      const authenticator = makeAuthenticator({
        identities: authStores.identities,
        credentials: authStores.credentials,
        memberships: authStores.memberships,
        sessions: authStores.sessions,
        audit: auditLog,
        hasher,
        tokens: createSessionTokenFactory(),
        sessionTtlMs: 60 * 60 * 1000,
        dummyHash: createDummyPasswordHash(),
      });
      registerAuthRoutes(app, {
        authenticator,
        authorizedCreateClient,
        seedStores: authStores,
        hasher,
        secureCookie: false, // inject/http em teste; em produção deriva de HTTPS (config)
        sessionTtlSeconds: 60 * 60,
      });
    }
  }

  // Composição REAL (Drizzle): registra /auth + /clients autenticados, independente de __dev.
  if (options.auth !== undefined) {
    registerAuthRoutes(app, options.auth);
  }

  // Composição REAL de billing/SaaS.
  if (options.billing !== undefined) {
    registerBillingRoutes(app, options.billing);
  }

  // Workflow operacional do Caso (tarefas/prazos + dashboard), entitlement-gated.
  if (options.workflow !== undefined) {
    registerWorkflowRoutes(app, options.workflow);
  }

  // Rotas + UI COMERCIAIS (produção). Só quando composição real é fornecida.
  if (options.commercial !== undefined) {
    registerCommercialRoutes(app, options.commercial);
    if (options.commercial.serveUi) registerCommercialUi(app);
  }

  return app;
}
