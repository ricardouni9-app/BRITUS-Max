import type { FastifyInstance } from "fastify";

// Healthcheck técnico: comprova apenas que o processo HTTP responde.
// Sem consulta ao banco, sem dados internos, versão, hostname ou ambiente.
export function registerHealthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({ status: "ok" }));
}
