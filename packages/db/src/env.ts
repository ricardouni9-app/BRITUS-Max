// Validação/obtenção da DATABASE_URL.
//
// Função pura, sem efeito colateral: NÃO lê `process.env` automaticamente e NÃO
// abre conexão. O chamador fornece o ambiente explicitamente.
export type DatabaseEnv = { readonly DATABASE_URL?: string | undefined };

export function getDatabaseUrl(env: DatabaseEnv): string {
  const raw = env.DATABASE_URL;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (url.length === 0) {
    throw new Error(
      "DATABASE_URL ausente ou vazia. Defina a variável de ambiente antes de conectar ao banco.",
    );
  }
  return url;
}
