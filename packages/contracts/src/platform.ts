import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";

// =====================================================================
// IDENTIDADE GLOBAL DA PLATAFORMA — "Criador" (operador técnico global).
//
// SEPARAÇÃO ARQUITETURAL (quatro camadas distintas — NÃO confundir):
//   1. Identidade global da plataforma (`platformIdentitySchema`) — o Criador.
//   2. Usuário operacional (`userSchema`) — pessoa que opera uma organização.
//   3. Vínculo usuário↔organização (`organizationMembershipSchema`).
//   4. Papéis organizacionais (`userRoleSchema`: owner/lawyer/assistant).
//
// O Criador NÃO é um valor de `userRole` e NÃO pertence a uma organização comum.
// Ele é uma identidade técnica global, fora do modelo de papéis organizacionais.
// =====================================================================

export const platformIdentityKindSchema = z.enum(["creator"]);
export type PlatformIdentityKind = z.infer<typeof platformIdentityKindSchema>;

export const platformIdentitySchema = z.object({
  id: uuidSchema,
  kind: platformIdentityKindSchema,
  label: z.string().trim().min(1).max(120),
  email: z.string().email().nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  whatsapp: z.string().trim().max(40).nullable().optional(),
  website: z.string().url().max(500).nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type PlatformIdentity = z.infer<typeof platformIdentitySchema>;

// Poderes globais EXCLUSIVOS do Criador — conceituais (NÃO implementados aqui).
// Estabelecidos para evitar modelagem incorreta futura (ex.: colocá-los como papel org).
export const globalPowerSchema = z.enum([
  "pricing.manage",
  "plans.manage",
  "modules.toggle",
  "platform_parameters.manage",
  "emergency_maintenance",
  "diagnostics",
  "operational_recovery",
  "organization.suspend",
  "organization.reactivate",
  "global_resources.manage",
]);
export type GlobalPower = z.infer<typeof globalPowerSchema>;

// ---------------------------------------------------------------------
// ACESSO EMERGENCIAL a dados de uma organização — CONTRATO DE EXIGÊNCIAS.
//
// O Criador NÃO tem acesso automático, permanente ou silencioso ao conteúdo
// jurídico das organizações. Qualquer operação emergencial futura é uma concessão
// LIMITADA e AUDITÁVEL. Estrutura declarada; o MECANISMO completo (verificação,
// enforcement, trilha imutável) NÃO é implementado neste pacote.
// ---------------------------------------------------------------------
export const emergencyAccessStatusSchema = z.enum([
  "requested",
  "active",
  "ended",
  "revoked",
]);
export type EmergencyAccessStatus = z.infer<typeof emergencyAccessStatusSchema>;

// Entrada para SOLICITAR acesso emergencial. Justificativa não vazia e tecnicamente
// útil (comprimento mínimo); escopo explícito e mínimo; duração limitada e positiva.
export const requestEmergencyAccessInputSchema = z.strictObject({
  organizationId: uuidSchema,
  purpose: z.string().trim().min(1).max(500),
  justification: z.string().trim().min(10).max(1000),
  scope: z.array(z.string().trim().min(1)).min(1),
  durationMinutes: z.number().int().min(1).max(24 * 60),
});
export type RequestEmergencyAccessInput = z.infer<typeof requestEmergencyAccessInputSchema>;

export const emergencyAccessGrantSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  operatorIdentityId: uuidSchema, // identificação do operador (Criador)
  purpose: z.string().trim().min(1).max(500), // finalidade técnica explícita
  justification: z.string().trim().min(1).max(1000), // justificativa
  scope: z.array(z.string().trim().min(1)).min(1), // escopo mínimo
  status: emergencyAccessStatusSchema,
  startedAt: timestampSchema.nullable().optional(), // registro de início
  endsAt: timestampSchema, // duração limitada → revogação automática
  endedAt: timestampSchema.nullable().optional(), // término explícito
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type EmergencyAccessGrant = z.infer<typeof emergencyAccessGrantSchema>;

// ---------------------------------------------------------------------
// CONFIGURAÇÕES GLOBAIS — nível PLATAFORMA (não pertencem a uma org comum).
//
// Prepara a separação para que planos, módulos e parâmetros globais sejam
// administrados no nível da plataforma. SEM valores comerciais, SEM preços
// definitivos, SEM cobrança. Somente uma identidade global autorizada (Criador)
// poderá, no futuro, modificá-los (ver `globalPowerSchema`).
// ---------------------------------------------------------------------
export const platformPlanSchema = z.object({
  id: uuidSchema,
  code: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  active: z.boolean().default(true),
});
export type PlatformPlan = z.infer<typeof platformPlanSchema>;

export const moduleToggleSchema = z.object({
  moduleCode: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
});
export type ModuleToggle = z.infer<typeof moduleToggleSchema>;

export const globalParameterSchema = z.object({
  key: z.string().trim().min(1).max(120),
  value: z.string().trim().max(2000),
});
export type GlobalParameter = z.infer<typeof globalParameterSchema>;
