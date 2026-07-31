import type { ErrorCode } from "@britus/contracts";

// Erro da camada de aplicação. Reutiliza os códigos de @britus/contracts (fonte única);
// não define um segundo conjunto de códigos.
export interface ApplicationError {
  readonly code: ErrorCode;
  readonly message: string;
}

export function validationError(message: string): ApplicationError {
  return { code: "VALIDATION_ERROR", message };
}

export function conflictError(message: string): ApplicationError {
  return { code: "CONFLICT", message };
}

export function notFoundError(message: string): ApplicationError {
  return { code: "NOT_FOUND", message };
}

export function forbiddenError(message: string): ApplicationError {
  return { code: "FORBIDDEN", message };
}

export function unauthenticatedError(message: string): ApplicationError {
  return { code: "UNAUTHENTICATED", message };
}
