import type { FastifyInstance, FastifyReply } from "fastify";
import type { ErrorCode } from "@britus/contracts";
import { AppError } from "./errors.js";

// Único ponto que constrói o envelope de erro — no formato de `apiErrorSchema`
// (@britus/contracts): { error: { code, message } }. Nunca expõe stack/SQL/caminhos.
function sendError(
  reply: FastifyReply,
  statusCode: number,
  code: ErrorCode,
  message: string,
): void {
  void reply.status(statusCode).send({ error: { code, message } });
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setNotFoundHandler((_request, reply) => {
    sendError(reply, 404, "NOT_FOUND", "Route not found");
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      sendError(reply, error.statusCode, error.code, error.message);
      return;
    }
    // Erros de validação do Fastify (schema/parse) → 400 estável.
    if ((error as { validation?: unknown }).validation) {
      sendError(reply, 400, "VALIDATION_ERROR", "Validation error");
      return;
    }
    // Detalhes técnicos apenas no log; resposta genérica e segura.
    request.log.error({ err: error }, "unhandled error");
    sendError(reply, 500, "INTERNAL_SERVER_ERROR", "Internal server error");
  });
}
