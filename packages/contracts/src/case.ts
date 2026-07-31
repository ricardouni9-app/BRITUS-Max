import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import { financialClassificationSchema, processNumberSchema } from "./value-objects.js";

// Caso é conceito genérico; processo judicial é uma manifestação (pode não ter número).
export const caseStatusSchema = z.enum([
  "triagem",
  "ativo",
  "aguardando",
  "encerrado",
  "arquivado",
  "cancelado",
]);
export type CaseStatus = z.infer<typeof caseStatusSchema>;

// Participante com papel controlado (uma única relação — evita tabela por papel).
export const participantRoleSchema = z.enum([
  "cliente",
  "parte_contraria",
  "representante",
  "responsavel_financeiro",
  "terceiro",
  "advogado_externo",
]);
export type ParticipantRole = z.infer<typeof participantRoleSchema>;

export const caseParticipantSchema = z.object({
  id: uuidSchema,
  role: participantRoleSchema,
  partyRef: uuidSchema,
  isPrimary: z.boolean().default(false),
});
export type CaseParticipant = z.infer<typeof caseParticipantSchema>;

export const caseSchema = z.object({
  id: uuidSchema,
  // Isolamento organizacional (tenant) — derivado do contexto, nunca do input.
  organizationId: uuidSchema,
  atendimentoId: uuidSchema.nullable().optional(),
  areaId: uuidSchema,
  workTypeId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  status: caseStatusSchema,
  financialClassification: financialClassificationSchema,
  processNumber: processNumberSchema.nullable().optional(),
  archivedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Case = z.infer<typeof caseSchema>;

// Criação — nasce classificado (área + tipo + potencial financeiro).
export const createCaseInputSchema = z.strictObject({
  atendimentoId: uuidSchema.optional(),
  areaId: uuidSchema,
  workTypeId: uuidSchema,
  title: z.string().trim().min(1).max(200),
  financialClassification: financialClassificationSchema,
  processNumber: processNumberSchema.optional(),
});
export type CreateCaseInput = z.infer<typeof createCaseInputSchema>;
