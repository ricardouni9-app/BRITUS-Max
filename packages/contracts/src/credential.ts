import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import { subjectTypeSchema } from "./subject.js";

// Credencial SEPARADA da identidade (1:1 por subject). Contém apenas o HASH e metadados
// técnicos do algoritmo — NUNCA senha em claro, nem segredo reutilizável.
export const credentialSchema = z.object({
  id: uuidSchema,
  subjectType: subjectTypeSchema,
  subjectId: uuidSchema,
  secretHash: z.string().min(1),
  algorithm: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Credential = z.infer<typeof credentialSchema>;
