import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";

export const documentConfidentialitySchema = z.enum([
  "normal",
  "restrito",
  "confidencial",
]);
export type DocumentConfidentiality = z.infer<typeof documentConfidentialitySchema>;

// Metadados do documento. O binário vive no ambiente do cliente (ADR-0021) —
// não faz parte do contrato público.
export const documentSchema = z.object({
  id: uuidSchema,
  clientId: uuidSchema.nullable().optional(),
  caseId: uuidSchema.nullable().optional(),
  atendimentoId: uuidSchema.nullable().optional(),
  category: z.string().trim().min(1).max(60),
  originalName: z.string().trim().min(1).max(260),
  contentHash: z.string().trim().min(1),
  size: z.number().int().min(0),
  mime: z.string().trim().min(1).max(160),
  version: z.number().int().min(1).default(1),
  confidentiality: documentConfidentialitySchema.default("normal"),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Document = z.infer<typeof documentSchema>;

export const registerDocumentInputSchema = z.strictObject({
  clientId: uuidSchema.optional(),
  caseId: uuidSchema.optional(),
  atendimentoId: uuidSchema.optional(),
  category: z.string().trim().min(1).max(60),
  originalName: z.string().trim().min(1).max(260),
  contentHash: z.string().trim().min(1),
  size: z.number().int().min(0),
  mime: z.string().trim().min(1).max(160),
  confidentiality: documentConfidentialitySchema.optional(),
});
export type RegisterDocumentInput = z.infer<typeof registerDocumentInputSchema>;
