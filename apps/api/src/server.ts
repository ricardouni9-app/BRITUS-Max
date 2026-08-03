import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { composeCommercialApp, type CommercialApp } from "./commercial/compose.js";

// Inicialização do processo: carrega config validada, constrói a app conforme o MODO,
// inicia o listener e registra encerramento controlado. `process.exit` vive apenas aqui.
export async function start(): Promise<void> {
  const config = loadConfig();
  // Compatibilidade: BRITUS_PILOT=1 equivale a BRITUS_MODE=pilot.
  const mode = process.env.BRITUS_PILOT === "1" ? "pilot" : config.BRITUS_MODE;

  let app: FastifyInstance;
  let commercial: CommercialApp | undefined;

  if (mode === "commercial") {
    commercial = await composeCommercialApp({
      backend: config.BRITUS_DB,
      databaseUrl: config.DATABASE_URL,
      secureCookie: config.COOKIE_SECURE,
      sessionTtlSeconds: config.SESSION_TTL_SECONDS,
      logger: { level: config.LOG_LEVEL },
      mercadoPago:
        config.MP_ACCESS_TOKEN && config.MERCADOPAGO_WEBHOOK_SECRET && config.PUBLIC_BASE_URL
          ? {
              accessToken: config.MP_ACCESS_TOKEN,
              webhookSecret: config.MERCADOPAGO_WEBHOOK_SECRET,
              publicBaseUrl: config.PUBLIC_BASE_URL,
            }
          : undefined,
      passwordRecoveryEmail:
        config.BREVO_API_KEY && config.BREVO_FROM_EMAIL && config.PUBLIC_BASE_URL
          ? {
              apiKey: config.BREVO_API_KEY,
              fromEmail: config.BREVO_FROM_EMAIL,
              fromName: config.BREVO_FROM_NAME,
              publicBaseUrl: config.PUBLIC_BASE_URL,
            }
          : undefined,
      demoOperator:
        config.BRITUS_DB === "memory" && config.DEMO_OPERATOR_EMAIL && config.DEMO_OPERATOR_PASSWORD
          ? { email: config.DEMO_OPERATOR_EMAIL, password: config.DEMO_OPERATOR_PASSWORD }
          : undefined,
    });
    app = commercial.app;
    app.log.info({ backend: config.BRITUS_DB }, "MODO COMERCIAL — UI em / (rotas legítimas)");
    if (commercial.demo)
      app.log.info(
        { email: commercial.demo.email, organizationId: commercial.demo.organizationId },
        "operador de demonstração (memory) provisionado",
      );
  } else if (mode === "pilot") {
    app = buildApp({ logger: { level: config.LOG_LEVEL }, enableTestRoutes: true });
    app.log.info("MODO PILOTO — UI em / (memória, sem banco, inclui __dev)");
  } else {
    app = buildApp({ logger: { level: config.LOG_LEVEL } });
  }

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "shutting down");
    try {
      if (commercial) await commercial.close();
      else await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await app.listen({ host: config.HOST, port: config.PORT });
  } catch (err) {
    app.log.error({ err }, "failed to start");
    process.exit(1);
  }
}
