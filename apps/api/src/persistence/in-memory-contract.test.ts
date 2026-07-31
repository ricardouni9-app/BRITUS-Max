import { describe, it } from "vitest";
import { persistenceContractChecks, type MakeBackend } from "@britus/application/testing";
import { createInMemoryClientStore } from "../modules/client/in-memory-store.js";
import { createInMemoryAtendimentoStore } from "../modules/atendimento/in-memory-store.js";
import { createInMemoryCaseStore } from "../modules/case/in-memory-store.js";

// Executa o MESMO contrato de persistência contra os adapters EM MEMÓRIA. Estado limpo
// por verificação (novos stores isolados a cada `makeBackend`).
const makeBackend: MakeBackend = async () => ({
  clients: createInMemoryClientStore(),
  atendimentos: createInMemoryAtendimentoStore(),
  cases: createInMemoryCaseStore(),
});

describe("Contrato de persistência — adapters EM MEMÓRIA", () => {
  for (const check of persistenceContractChecks) {
    it(check.name, () => check.run(makeBackend));
  }
});
