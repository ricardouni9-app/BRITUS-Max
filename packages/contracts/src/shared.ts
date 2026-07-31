import { z } from "zod";

// Contratos compartilhados (base para todo o domínio). Independentes de persistência.

// Identificador UUID.
export const uuidSchema = z.uuid();
export type Uuid = z.infer<typeof uuidSchema>;

// Timestamp de domínio (representação Date; a serialização ISO é do transporte).
export const timestampSchema = z.date();

// Timestamp na fronteira HTTP/JSON: string ISO-8601 (formato estável e documentado).
// Domínio usa Date (`timestampSchema`); o transporte serializa/valida como ISO.
export const isoDateTimeSchema = z.iso.datetime();
export type IsoDateTime = z.infer<typeof isoDateTimeSchema>;

// Paginação — parâmetros de entrada e metadados de saída.
export const paginationParamsSchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

// Envelope de erro público padronizado (SSoT do formato usado pela API).
export const errorCodeSchema = z.enum([
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "INTERNAL_SERVER_ERROR",
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
