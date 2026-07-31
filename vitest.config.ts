import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.{test,spec}.ts"],
    exclude: ["**/dist/**", "**/node_modules/**"],
    // As suítes PostgreSQL compartilham um banco descartável e fazem TRUNCATE
    // entre cenários. Execute os arquivos em série nesse modo para evitar
    // deadlocks/colisões artificiais entre suítes.
    fileParallelism: process.env.BRITUS_DB_TEST_DISPOSABLE !== "1",
    testTimeout: process.env.BRITUS_DB_TEST_DISPOSABLE === "1" ? 20_000 : 5_000,
  },
  resolve: {
    // Resolve os workspaces a partir do código-fonte nos testes, evitando dependência
    // do build (dist). Forma de ARRAY: entradas mais específicas primeiro.
    alias: [
      {
        find: "@britus/application/testing",
        replacement: fileURLToPath(
          new URL("./packages/application/src/testing/persistence-contract.ts", import.meta.url),
        ),
      },
      {
        find: "@britus/application",
        replacement: fileURLToPath(new URL("./packages/application/src/index.ts", import.meta.url)),
      },
      {
        find: "@britus/contracts",
        replacement: fileURLToPath(new URL("./packages/contracts/src/index.ts", import.meta.url)),
      },
    ],
  },
});
