import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

// Cria explicitamente a instância Drizzle a partir de um pool já existente.
// Sem singleton global e sem conexão automática.
export function createDatabaseClient(pool: Pool): NodePgDatabase {
  return drizzle(pool);
}
