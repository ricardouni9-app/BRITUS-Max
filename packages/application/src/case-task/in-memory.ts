import { uuidv7 } from "uuidv7";
import type { CaseTask } from "@britus/contracts";
import type { CaseTaskRepository, NewCaseTask } from "./ports.js";

// Implementação EM MEMÓRIA (testes/dev), org-scoped. Substituível pelo adapter Drizzle.
export function createInMemoryCaseTaskStore(): CaseTaskRepository {
  const items = new Map<string, CaseTask>();
  return {
    async create(organizationId, caseId, input: NewCaseTask) {
      const now = new Date();
      const task: CaseTask = {
        id: uuidv7(),
        organizationId,
        caseId,
        kind: input.kind,
        title: input.title,
        description: input.description,
        status: "open",
        assignedUserId: input.assignedUserId ?? null,
        dueAt: input.dueAt,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      items.set(task.id, task);
      return task;
    },
    async listByCase(organizationId, caseId) {
      return [...items.values()].filter((t) => t.organizationId === organizationId && t.caseId === caseId);
    },
    async findById(organizationId, taskId) {
      const t = items.get(taskId);
      return t !== undefined && t.organizationId === organizationId ? t : null;
    },
    async save(task) {
      items.set(task.id, task);
      return task;
    },
  };
}
