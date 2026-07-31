import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import { organizationMembershipSchema } from "./user.js";

// Tipo de identidade que solicita a ação. NUNCA confundir identidade global com userRole.
export const identityTypeSchema = z.enum(["organization_user", "platform_creator"]);
export type IdentityType = z.infer<typeof identityTypeSchema>;

// Ações organizacionais (escopo: uma organização) e globais (escopo: plataforma).
export const authorizationActionSchema = z.enum([
  // organizacionais
  "client.create",
  "atendimento.register",
  "case.open",
  "organization.view",
  "organization.admin",
  // globais (exclusivas do Criador)
  "platform.config.manage",
  "plans.manage",
  "modules.manage",
  "pricing.manage",
  "diagnostics.run",
  "organization.suspend",
  "organization.reactivate",
  "emergency_access.start",
  // autenticação/sessão (eventos auditáveis; NÃO são ações globais)
  "auth.login",
  "auth.logout",
  "session.select_organization",
]);
export type AuthorizationAction = z.infer<typeof authorizationActionSchema>;

// Conjunto das ações GLOBAIS (SSoT para a política). Ações fora deste conjunto são organizacionais.
export const globalActions: ReadonlySet<AuthorizationAction> = new Set([
  "platform.config.manage",
  "plans.manage",
  "modules.manage",
  "pricing.manage",
  "diagnostics.run",
  "organization.suspend",
  "organization.reactivate",
  "emergency_access.start",
]);

export const resourceTypeSchema = z.enum([
  "client",
  "atendimento",
  "case",
  "organization",
  "platform_config",
  "plan",
  "module",
  "pricing",
  "diagnostics",
  "emergency_access",
]);
export type ResourceType = z.infer<typeof resourceTypeSchema>;

export const authorizationDecisionSchema = z.enum(["allow", "deny"]);
export type AuthorizationDecision = z.infer<typeof authorizationDecisionSchema>;

// Vínculo (org, papel) do usuário no contexto de decisão. É uma PROJEÇÃO do vínculo
// persistente (`organizationMembershipSchema`), reutilizando as mesmas definições sem
// misturar responsabilidades: o vínculo persistente tem `id`/`userId`; o contexto de
// autorização usa apenas `organizationId` + `role`.
export const contextMembershipSchema = organizationMembershipSchema.pick({
  organizationId: true,
  role: true,
});
export type ContextMembership = z.infer<typeof contextMembershipSchema>;

// Contexto de autorização REUTILIZÁVEL. Independente de HTTP/Fastify/banco/auth real.
export const authorizationContextSchema = z.object({
  identityType: identityTypeSchema,
  // Identidade organizacional (quando identityType = organization_user).
  userId: uuidSchema.nullable().optional(),
  memberships: z.array(contextMembershipSchema).default([]),
  // Identidade global (quando identityType = platform_creator).
  platformIdentityId: uuidSchema.nullable().optional(),
  // Alvo e pedido.
  organizationId: uuidSchema.nullable().optional(),
  action: authorizationActionSchema,
  resourceType: resourceTypeSchema.nullable().optional(),
  resourceId: uuidSchema.nullable().optional(),
  // Concessão emergencial eventual + escopos já resolvidos como ativos (se houver).
  emergencyGrantId: uuidSchema.nullable().optional(),
  emergencyScopes: z.array(resourceTypeSchema).default([]),
  // Momento da decisão e justificativa (quando obrigatória).
  decidedAt: timestampSchema.optional(),
  justification: z.string().trim().max(1000).nullable().optional(),
});
export type AuthorizationContext = z.infer<typeof authorizationContextSchema>;
