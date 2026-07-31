import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";

// Item operacional de um Caso: TAREFA ou PRAZO (deadline). Um prazo é uma tarefa com
// vencimento juridicamente relevante (`kind: "deadline"` + `dueAt` obrigatório na regra).
export const caseTaskKindSchema = z.enum(["task", "deadline"]);
export type CaseTaskKind = z.infer<typeof caseTaskKindSchema>;

export const caseTaskStatusSchema = z.enum(["open", "done", "canceled"]);
export type CaseTaskStatus = z.infer<typeof caseTaskStatusSchema>;

export const caseTaskSchema = z.object({
  id: uuidSchema,
  // Isolamento organizacional (tenant) — derivado do contexto, nunca do input.
  organizationId: uuidSchema,
  caseId: uuidSchema,
  kind: caseTaskKindSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  status: caseTaskStatusSchema,
  assignedUserId: uuidSchema.nullable().optional(),
  dueAt: timestampSchema.nullable().optional(),
  completedAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type CaseTask = z.infer<typeof caseTaskSchema>;

// Criação — sem id/timestamps/status (nascem no domínio/persistência). `dueAt` é ISO string
// na fronteira HTTP; um `deadline` exige `dueAt`.
export const createCaseTaskInputSchema = z
  .strictObject({
    kind: caseTaskKindSchema.default("task"),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    assignedUserId: uuidSchema.optional(),
    dueAt: z.iso.datetime().optional(),
  })
  .refine((v) => v.kind !== "deadline" || v.dueAt !== undefined, {
    message: "Prazo (deadline) exige dueAt",
    path: ["dueAt"],
  });
export type CreateCaseTaskInput = z.infer<typeof createCaseTaskInputSchema>;
