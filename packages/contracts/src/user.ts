import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";

export const userRoleSchema = z.enum(["owner", "lawyer", "assistant"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userStatusSchema = z.enum(["active", "suspended", "disabled"]);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const userSchema = z.object({
  id: uuidSchema,
  name: z.string().trim().min(1).max(200),
  email: z.email(),
  status: userStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type User = z.infer<typeof userSchema>;

// O papel (role) pertence EXCLUSIVAMENTE ao membership organizacional — não à criação do
// usuário. Por isso não figura aqui.
export const createUserInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(200),
  email: z.email(),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Vínculo usuário ↔ organização (papel controlado). Carrega `organizationId` —
// um usuário pode pertencer a várias organizações.
export const organizationMembershipSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  userId: uuidSchema,
  role: userRoleSchema,
});
export type OrganizationMembership = z.infer<typeof organizationMembershipSchema>;
