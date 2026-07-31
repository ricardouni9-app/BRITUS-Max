// Tradução de erros de infraestrutura (PostgreSQL/Drizzle) para um erro SEGURO da
// aplicação — sem vazar SQL, nomes de constraint, tabelas ou detalhes internos.
export class PersistenceError extends Error {
  constructor(
    readonly appCode: "CONFLICT" | "INTERNAL_SERVER_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "PersistenceError";
  }
}

export function translatePersistenceError(error: unknown): PersistenceError {
  const pgCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;
  // 23505 = unique_violation → defesa em profundidade da unicidade documental por organização.
  if (pgCode === "23505") {
    return new PersistenceError("CONFLICT", "Registro já existente na organização");
  }
  return new PersistenceError("INTERNAL_SERVER_ERROR", "Falha de persistência");
}
