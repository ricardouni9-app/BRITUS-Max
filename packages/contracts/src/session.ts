import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import { subjectTypeSchema } from "./subject.js";

// Sessão STATEFUL, revogável e expirável. O token BRUTO nunca é representado aqui nem
// persistido — apenas seu hash é guardado na infraestrutura. `activeOrganizationId` é a
// organização ativa, sempre validada ⊆ memberships do usuário no servidor.
export const sessionSchema = z.object({
  id: uuidSchema,
  subjectType: subjectTypeSchema,
  subjectId: uuidSchema,
  // Token CSRF (double-submit) ligado à sessão, validado no servidor. Não é segredo de
  // sessão (o cliente precisa ecoá-lo); nunca aparece em logs/auditoria.
  csrfToken: z.string().min(1),
  activeOrganizationId: uuidSchema.nullable().optional(),
  createdAt: timestampSchema,
  expiresAt: timestampSchema,
  lastSeenAt: timestampSchema.nullable().optional(),
  revokedAt: timestampSchema.nullable().optional(),
});
export type Session = z.infer<typeof sessionSchema>;
