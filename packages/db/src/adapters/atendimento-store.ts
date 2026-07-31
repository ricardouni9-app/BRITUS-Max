import { and, eq, ne, isNull } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Atendimento, CreateAtendimentoInput } from "@britus/contracts";
import type {
  AtendimentoRepository,
  AtendimentoLookup,
  AtendimentoConverter,
} from "@britus/application";
import { atendimentos, type AtendimentoRow } from "../schema/atendimentos.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

function toAtendimento(row: AtendimentoRow): Atendimento {
  return {
    id: row.id,
    organizationId: row.organizationId,
    clientId: row.clientId,
    channelOrigin: row.channelOrigin ?? undefined,
    areaId: row.areaId,
    workTypeId: row.workTypeId,
    assignedUserId: row.assignedUserId,
    status: row.status,
    result: row.result,
    nonConversionReason: row.nonConversionReason,
    convertedAt: row.convertedAt,
    summary: row.summary ?? undefined,
    conflictFlag: row.conflictFlag,
    firstContactAt: row.firstContactAt,
    lastRelevantInteractionAt: row.lastRelevantInteractionAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Adapter Drizzle de Atendimento — SEMPRE org-scoped. `findById` retorna null quando o id
// não pertence à organização (bloqueia leitura cross-tenant); a conversão só atinge um
// atendimento da própria organização.
export function createDrizzleAtendimentoStore(
  db: NodePgDatabase,
): AtendimentoRepository & AtendimentoLookup & AtendimentoConverter {
  return {
    async create(organizationId, input: CreateAtendimentoInput) {
      try {
        const [row] = await db
          .insert(atendimentos)
          .values({
            organizationId,
            clientId: input.clientId,
            channelOrigin: input.channelOrigin,
            areaId: input.areaId,
            workTypeId: input.workTypeId,
            assignedUserId: input.assignedUserId,
            status: "novo",
            summary: input.summary,
            conflictFlag: input.conflictFlag ?? false,
          })
          .returning();
        if (row === undefined) {
          throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar atendimento");
        }
        return toAtendimento(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
    async findById(organizationId, id) {
      try {
        const [row] = await db
          .select()
          .from(atendimentos)
          .where(and(eq(atendimentos.id, id), eq(atendimentos.organizationId, organizationId)))
          .limit(1);
        return row === undefined ? null : toAtendimento(row);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async markConverted({ organizationId, atendimentoId, clientId, convertedAt }) {
      try {
        // Compare-and-swap ATÔMICO: converte apenas um atendimento AINDA NÃO convertido, na
        // sua organização (condição no próprio UPDATE — não depende da leitura prévia).
        // Duas conversões concorrentes → só uma casa a condição; a perdedora recebe 0 linhas
        // (concorrência), jamais produzindo duas conversões válidas.
        const [row] = await db
          .update(atendimentos)
          .set({
            clientId,
            status: "convertido",
            result: "convertido",
            convertedAt,
            updatedAt: convertedAt,
          })
          .where(
            and(
              eq(atendimentos.id, atendimentoId),
              eq(atendimentos.organizationId, organizationId),
              ne(atendimentos.status, "convertido"),
              isNull(atendimentos.clientId),
            ),
          )
          .returning();
        if (row === undefined) {
          throw new PersistenceError(
            "CONFLICT",
            "Atendimento já convertido ou conversão concorrente detectada",
          );
        }
        return toAtendimento(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
  };
}
