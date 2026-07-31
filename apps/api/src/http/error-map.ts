import type { ApplicationError } from "@britus/application";
import type { ErrorCode } from "@britus/contracts";

// Mapeia ApplicationError → resposta HTTP, usando o **envelope compartilhado**
// (@britus/contracts). Não cria um segundo contrato de erro.
const statusByCode: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

export interface HttpError {
  readonly statusCode: number;
  readonly body: { readonly error: { readonly code: ErrorCode; readonly message: string } };
}

export function toHttpError(error: ApplicationError): HttpError {
  return {
    statusCode: statusByCode[error.code],
    body: { error: { code: error.code, message: error.message } },
  };
}
