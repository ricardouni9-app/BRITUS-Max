import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Case, CreateCaseInput } from "@britus/contracts";
import type { CaseRepository } from "@britus/application";
import { cases, type CaseRow } from "../schema/cases.js";
import { atendimentos } from "../schema/atendimentos.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

function toCase(row: CaseRow): Case {
  return {
    id: row.id,
    organizationId: row.organizationId,
    atendimentoId: row.atendimentoId,
    areaId: row.areaId,
    workTypeId: row.workTypeId,
    title: row.title,
    status: row.status,
    financialClassification: row.financialClassification,
    processNumber: row.processNumber,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Adapter Drizzle de Caso — SEMPRE org-scoped. Nasce em "triagem". Quando há Atendimento de
// origem, o próprio adapter garante (em transação) que ele pertence à MESMA organização —
// defesa contra chamada direta cross-tenant, sem depender apenas da validação do caso de uso.
export function createDrizzleCaseStore(db: NodePgDatabase): CaseRepository {
  return {
    async create(organizationId, input: CreateCaseInput) {
      const atendimentoId = input.atendimentoId;
      const values = {
        organizationId,
        atendimentoId,
        areaId: input.areaId,
        workTypeId: input.workTypeId,
        title: input.title,
        status: "triagem" as const,
        financialClassification: input.financialClassification,
        processNumber: input.processNumber,
      };
      try {
        if (atendimentoId !== undefined) {
          return await db.transaction(async (tx) => {
            const [origin] = await tx
              .select({ id: atendimentos.id })
              .from(atendimentos)
              .where(and(eq(atendimentos.id, atendimentoId), eq(atendimentos.organizationId, organizationId)))
              .limit(1);
            if (origin === undefined) {
              // Atendimento inexistente ou de outra organização → recusa sem revelar existência.
              throw new PersistenceError(
                "INTERNAL_SERVER_ERROR",
                "Atendimento de origem não pertence à organização",
              );
            }
            const [row] = await tx.insert(cases).values(values).returning();
            if (row === undefined) {
              throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar caso");
            }
            return toCase(row);
          });
        }
        const [row] = await db.insert(cases).values(values).returning();
        if (row === undefined) {
          throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar caso");
        }
        return toCase(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
  };
}
