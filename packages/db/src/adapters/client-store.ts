import { and, eq, or } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Client, CreateClientInput } from "@britus/contracts";
import type { ClientRepository, ClientDuplicateChecker } from "@britus/application";
import { clients, type ClientRow } from "../schema/clients.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    organizationId: row.organizationId,
    personType: row.personType,
    displayName: row.displayName,
    cpf: row.cpf ?? undefined,
    cnpj: row.cnpj ?? undefined,
    contacts: row.contacts,
    addresses: row.addresses,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Adapter Drizzle de Cliente — SEMPRE org-scoped. Duplicidade documental por organização;
// nunca consulta/insere ignorando `organizationId`.
export function createDrizzleClientStore(
  db: NodePgDatabase,
): ClientRepository & ClientDuplicateChecker {
  return {
    async existsByDocument(organizationId, { cpf, cnpj }) {
      if (cpf === undefined && cnpj === undefined) return false;
      try {
        const rows = await db
          .select({ id: clients.id })
          .from(clients)
          .where(
            and(
              eq(clients.organizationId, organizationId),
              or(
                cpf !== undefined ? eq(clients.cpf, cpf) : undefined,
                cnpj !== undefined ? eq(clients.cnpj, cnpj) : undefined,
              ),
            ),
          )
          .limit(1);
        return rows.length > 0;
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },
    async create(organizationId, input: CreateClientInput) {
      try {
        const [row] = await db
          .insert(clients)
          .values({
            organizationId,
            personType: input.personType,
            displayName: input.displayName,
            cpf: input.cpf,
            cnpj: input.cnpj,
            contacts: input.contacts ?? [],
            addresses: input.addresses ?? [],
          })
          .returning();
        if (row === undefined) {
          throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar cliente");
        }
        return toClient(row);
      } catch (error) {
        if (error instanceof PersistenceError) throw error;
        throw translatePersistenceError(error);
      }
    },
  };
}
