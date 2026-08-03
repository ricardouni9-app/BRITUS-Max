import { z } from "zod";

// Configuração de ambiente — validada uma única vez, com defaults seguros para
// desenvolvimento. NÃO lê `process.env` de forma dispersa e não contém segredos.
const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  // Modo de execução da aplicação:
  //  - "pilot"      : composição em memória + UI de piloto (demo local, sem banco).
  //  - "commercial" : produto real (rotas legítimas + UI comercial). Backend via BRITUS_DB.
  //  - "api"        : apenas health/rotas registradas por composição externa.
  BRITUS_MODE: z.enum(["api", "pilot", "commercial"]).default("api"),
  // Backend de persistência do modo comercial.
  BRITUS_DB: z.enum(["memory", "postgres"]).default("postgres"),
  DATABASE_URL: z.string().min(1).optional(),
  // Cookie seguro (Secure) — habilitar quando servido sob HTTPS (produção/atrás de proxy TLS).
  COOKIE_SECURE: z
    .enum(["0", "1", "true", "false"])
    .default("false")
    .transform((v) => v === "1" || v === "true"),
  SESSION_TTL_SECONDS: z.coerce
    .number()
    .int()
    .min(60)
    .default(60 * 60 * 8),
  // Operador de DEMONSTRAÇÃO (apenas modo comercial + backend memory). Provisionado no boot,
  // NUNCA via rota HTTP. Ausente => sem operador (login falhará até bootstrap).
  DEMO_OPERATOR_EMAIL: z.string().email().optional(),
  DEMO_OPERATOR_PASSWORD: z.string().min(8).optional(),
  MP_ACCESS_TOKEN: z.string().min(1).optional(),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().min(1).optional(),
  PUBLIC_BASE_URL: z.string().url().optional(),
  BREVO_API_KEY: z.string().min(1).optional(),
  BREVO_FROM_EMAIL: z.string().email().optional(),
  BREVO_FROM_NAME: z.string().min(1).default("BRITUS"),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const cfg = configSchema.parse({
    NODE_ENV: env.NODE_ENV,
    HOST: env.HOST,
    PORT: env.PORT,
    LOG_LEVEL: env.LOG_LEVEL,
    BRITUS_MODE: env.BRITUS_MODE,
    BRITUS_DB: env.BRITUS_DB,
    DATABASE_URL: env.DATABASE_URL,
    COOKIE_SECURE: env.COOKIE_SECURE,
    SESSION_TTL_SECONDS: env.SESSION_TTL_SECONDS,
    DEMO_OPERATOR_EMAIL: env.DEMO_OPERATOR_EMAIL,
    DEMO_OPERATOR_PASSWORD: env.DEMO_OPERATOR_PASSWORD,
    MP_ACCESS_TOKEN: env.MP_ACCESS_TOKEN,
    MERCADOPAGO_WEBHOOK_SECRET: env.MERCADOPAGO_WEBHOOK_SECRET,
    PUBLIC_BASE_URL: env.PUBLIC_BASE_URL,
    BREVO_API_KEY: env.BREVO_API_KEY,
    BREVO_FROM_EMAIL: env.BREVO_FROM_EMAIL,
    BREVO_FROM_NAME: env.BREVO_FROM_NAME,
  });

  // Falha CLARA quando falta configuração essencial ao modo comercial com Postgres.
  if (cfg.BRITUS_MODE === "commercial" && cfg.BRITUS_DB === "postgres" && !cfg.DATABASE_URL) {
    throw new Error(
      "Configuração inválida: BRITUS_MODE=commercial com BRITUS_DB=postgres exige DATABASE_URL. " +
        "Defina DATABASE_URL (ex.: postgres://user:pass@host:5432/db) ou use BRITUS_DB=memory para demo local.",
    );
  }
  return cfg;
}
