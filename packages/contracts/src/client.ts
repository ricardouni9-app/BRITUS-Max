import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import {
  personTypeSchema,
  cpfSchema,
  cnpjSchema,
  contactSchema,
  addressSchema,
} from "./value-objects.js";

const displayNameSchema = z.string().trim().min(1).max(200);

export const clientSchema = z.object({
  id: uuidSchema,
  // Isolamento organizacional (tenant). Sempre derivado do contexto server-side —
  // NUNCA aceito no input de criação.
  organizationId: uuidSchema,
  personType: personTypeSchema,
  displayName: displayNameSchema,
  cpf: cpfSchema.optional(),
  cnpj: cnpjSchema.optional(),
  contacts: z.array(contactSchema).default([]),
  addresses: z.array(addressSchema).default([]),
  archivedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Client = z.infer<typeof clientSchema>;

// Criação — sem id/timestamps; documento opcional no 1º contato.
export const createClientInputSchema = z.strictObject({
  personType: personTypeSchema,
  displayName: displayNameSchema,
  cpf: cpfSchema.optional(),
  cnpj: cnpjSchema.optional(),
  contacts: z.array(contactSchema).optional(),
  addresses: z.array(addressSchema).optional(),
});
export type CreateClientInput = z.infer<typeof createClientInputSchema>;
