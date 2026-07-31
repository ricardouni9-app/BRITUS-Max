import { uuidv7 } from "uuidv7";
import type { Case, CreateCaseInput } from "@britus/contracts";
import type { CaseRepository } from "@britus/application";

// Implementação EM MEMÓRIA, **isolada por organização**. Um Caso nasce em "triagem".
// Não acessa banco/Docker.
export function createInMemoryCaseStore(): CaseRepository {
  const items: Case[] = [];

  return {
    async create(organizationId: string, input: CreateCaseInput): Promise<Case> {
      const now = new Date();
      const created: Case = {
        id: uuidv7(),
        organizationId,
        atendimentoId: input.atendimentoId,
        areaId: input.areaId,
        workTypeId: input.workTypeId,
        title: input.title,
        status: "triagem",
        financialClassification: input.financialClassification,
        processNumber: input.processNumber,
        createdAt: now,
        updatedAt: now,
      };
      items.push(created);
      return created;
    },
  };
}
