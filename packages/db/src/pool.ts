import { Pool, type PoolConfig } from "pg";

// Cria explicitamente um pool de conexões PostgreSQL.
// Nada é executado no import: a conexão só ocorre quando esta função é chamada.
export function createDatabasePool(config: PoolConfig): Pool {
  return new Pool(config);
}
