import { defineConfig } from "drizzle-kit";

// Configuração do Drizzle Kit. NÃO abre conexão e NÃO contém credenciais.
// `dbCredentials` (a partir de DATABASE_URL) será fornecida quando um banco for
// provisionado (Etapa 3+). Comandos que exigem conexão (ex.: `migrate`) falham
// de forma clara enquanto a URL não estiver configurada.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./migrations",
});
