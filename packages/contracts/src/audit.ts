import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import {
  identityTypeSchema,
  authorizationActionSchema,
  authorizationDecisionSchema,
  resourceTypeSchema,
} from "./authorization.js";

// Evento de auditoria APPEND-ONLY. Registra decisões críticas (inclusive negativas).
// Metadados são um mapa string→string SEGURO — NUNCA senha, token, segredo ou
// conteúdo jurídico sensível.
export const auditEventSchema = z.object({
  id: uuidSchema,
  actorId: uuidSchema.nullable().optional(), // userId ou platformIdentityId
  identityType: identityTypeSchema,
  action: authorizationActionSchema,
  organizationId: uuidSchema.nullable().optional(),
  resourceType: resourceTypeSchema.nullable().optional(),
  resourceId: uuidSchema.nullable().optional(),
  decision: authorizationDecisionSchema,
  justification: z.string().trim().max(1000).nullable().optional(),
  emergencyGrantId: uuidSchema.nullable().optional(),
  occurredAt: timestampSchema,
  metadata: z.record(z.string(), z.string()).optional(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;
