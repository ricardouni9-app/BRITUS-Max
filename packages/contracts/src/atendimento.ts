import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";
import { createClientInputSchema } from "./client.js";

// Máquina de estados (ver DOMAIN_MODEL).
export const atendimentoStatusSchema = z.enum([
  "novo",
  "em_triagem",
  "qualificado",
  "convertido",
  "nao_convertido",
  "elegivel_descarte",
  "descartado",
]);
export type AtendimentoStatus = z.infer<typeof atendimentoStatusSchema>;

// Desfecho (decisão do PO — ADR-0019).
export const atendimentoResultSchema = z.enum([
  "convertido",
  "nao_contratado",
  "incompativel",
  "conflito_interesses",
  "sem_retorno",
  "encaminhado",
  "outro",
]);
export type AtendimentoResult = z.infer<typeof atendimentoResultSchema>;

// Resumo do Registro Comercial Mínimo — HIPÓTESE DE UX (~500), não é constraint rígida.
const summarySchema = z.string().trim().max(500);

export const atendimentoSchema = z.object({
  id: uuidSchema,
  // Isolamento organizacional (tenant) — derivado do contexto, nunca do input.
  organizationId: uuidSchema,
  clientId: uuidSchema.nullable().optional(),
  channelOrigin: z.string().trim().max(60).optional(),
  areaId: uuidSchema.nullable().optional(),
  workTypeId: uuidSchema.nullable().optional(),
  assignedUserId: uuidSchema.nullable().optional(),
  status: atendimentoStatusSchema,
  result: atendimentoResultSchema.nullable().optional(),
  nonConversionReason: z.string().trim().max(200).nullable().optional(),
  // Momento da conversão em Cliente (rastreabilidade). Nulo enquanto não convertido.
  convertedAt: timestampSchema.nullable().optional(),
  summary: summarySchema.optional(),
  conflictFlag: z.boolean().default(false),
  firstContactAt: timestampSchema,
  lastRelevantInteractionAt: timestampSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Atendimento = z.infer<typeof atendimentoSchema>;

export const createAtendimentoInputSchema = z.strictObject({
  clientId: uuidSchema.optional(),
  channelOrigin: z.string().trim().max(60).optional(),
  areaId: uuidSchema.optional(),
  workTypeId: uuidSchema.optional(),
  assignedUserId: uuidSchema.optional(),
  summary: summarySchema.optional(),
  conflictFlag: z.boolean().optional(),
});
export type CreateAtendimentoInput = z.infer<typeof createAtendimentoInputSchema>;

// Conversão explícita de Atendimento em Cliente (MACRO PACOTE 010).
// O Atendimento não carrega a identidade do Cliente (nome/documento); por isso a
// conversão recebe os dados de criação do Cliente como **dados complementares**.
// A duplicidade documental é tratada pelo caso de uso Criar Cliente reutilizado.
export const convertAtendimentoInputSchema = z.strictObject({
  atendimentoId: uuidSchema,
  client: createClientInputSchema,
});
export type ConvertAtendimentoInput = z.infer<typeof convertAtendimentoInputSchema>;
