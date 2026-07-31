import { describe, expect, it } from "vitest";
import type { Client, CreateClientInput } from "@britus/contracts";
import { makeCreateClient } from "./create-client.js";
import type { ClientRepository, ClientDuplicateChecker } from "./ports.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";

// Implementação EM MEMÓRIA org-scoped — exclusiva dos testes (sem banco).
function inMemory(): ClientRepository & ClientDuplicateChecker & { readonly created: Client[] } {
  const created: Client[] = [];
  const docs = new Set<string>();
  const key = (o: string, d: string): string => `${o}:${d}`;
  return {
    created,
    async existsByDocument(organizationId, { cpf, cnpj }) {
      return (
        (cpf !== undefined && docs.has(key(organizationId, cpf))) ||
        (cnpj !== undefined && docs.has(key(organizationId, cnpj)))
      );
    },
    async create(organizationId, input: CreateClientInput): Promise<Client> {
      const now = new Date();
      const client: Client = {
        id: `01920000-0000-7000-8000-0000000${String(created.length + 1).padStart(5, "0")}`,
        organizationId,
        personType: input.personType,
        displayName: input.displayName,
        cpf: input.cpf,
        cnpj: input.cnpj,
        contacts: input.contacts ?? [],
        addresses: input.addresses ?? [],
        createdAt: now,
        updatedAt: now,
      };
      created.push(client);
      if (input.cpf !== undefined) docs.add(key(organizationId, input.cpf));
      if (input.cnpj !== undefined) docs.add(key(organizationId, input.cnpj));
      return client;
    },
  };
}

const clientInput = { personType: "pf" as const, displayName: "Ricardo", cpf: "12345678901" };

describe("makeCreateClient (tenant-aware)", () => {
  it("atribui o organizationId do comando ao cliente criado", async () => {
    const store = inMemory();
    const res = await makeCreateClient({ clients: store, duplicates: store }).execute({
      organizationId: ORG_A,
      input: clientInput,
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.organizationId).toBe(ORG_A);
  });

  it("rejeita entrada inválida → VALIDATION_ERROR", async () => {
    const store = inMemory();
    const res = await makeCreateClient({ clients: store, duplicates: store }).execute({
      organizationId: ORG_A,
      input: { personType: "xx", displayName: "" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("impede documento duplicado NA MESMA organização → CONFLICT", async () => {
    const store = inMemory();
    const uc = makeCreateClient({ clients: store, duplicates: store });
    await uc.execute({ organizationId: ORG_A, input: clientInput });
    const dup = await uc.execute({ organizationId: ORG_A, input: { ...clientInput, displayName: "Outro" } });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe("CONFLICT");
    expect(store.created).toHaveLength(1);
  });

  it("permite o MESMO CPF em organizações diferentes (duplicidade por organização)", async () => {
    const store = inMemory();
    const uc = makeCreateClient({ clients: store, duplicates: store });
    const a = await uc.execute({ organizationId: ORG_A, input: clientInput });
    const b = await uc.execute({ organizationId: ORG_B, input: clientInput });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.organizationId).toBe(ORG_A);
      expect(b.value.organizationId).toBe(ORG_B);
    }
  });

  it("não bloqueia quando o documento não é informado", async () => {
    const store = inMemory();
    const res = await makeCreateClient({ clients: store, duplicates: store }).execute({
      organizationId: ORG_A,
      input: { personType: "pj", displayName: "Empresa X" },
    });
    expect(res.ok).toBe(true);
  });
});
