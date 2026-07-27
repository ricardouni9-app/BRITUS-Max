import { z } from "zod";

// Contratos Zod de Organization (SSoT front↔back). NÃO importa o schema Drizzle.
//
// Decisão de ID (Etapa 3): o identificador é gerado na **camada de persistência**
// (packages/db, app-side via uuidv7) — por isso o input de criação NÃO aceita `id`
// nem timestamps.

export const organizationStatusSchema = z.enum(["active", "inactive"]);
export type OrganizationStatus = z.infer<typeof organizationStatusSchema>;

export const organizationIdSchema = z.uuid();
export type OrganizationId = z.infer<typeof organizationIdSchema>;

const organizationNameSchema = z.string().trim().min(1).max(200);

export const organizationSchema = z.object({
  id: organizationIdSchema,
  name: organizationNameSchema,
  status: organizationStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Organization = z.infer<typeof organizationSchema>;

export const createOrganizationInputSchema = z.strictObject({
  name: organizationNameSchema,
  status: organizationStatusSchema.optional(),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
