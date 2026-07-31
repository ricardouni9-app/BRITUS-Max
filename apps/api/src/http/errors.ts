import type { ErrorCode } from "@britus/contracts";

// Erros de aplicação. Os **códigos** vêm de @britus/contracts (fonte única);
// a API não define um segundo conjunto de códigos.
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation error") {
    super("VALIDATION_ERROR", message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super("CONFLICT", message, 409);
  }
}
