import { describe, expect, it } from "vitest";
import type { Atendimento, Client, CreateClientInput } from "@britus/contracts";
import {
  makeConvertAtendimentoToClient,
  makeCreateClient,
  type AtendimentoLookup,
  type AtendimentoConverter,
  type ClientRepository,
  type ClientDuplicateChecker,
} from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const ATEND_A = "01920000-0000-7000-8000-0000000000aa";
const CLIENT_ID = "01920000-0000-7000-8000-0000000000bb";

// Store de Atendimento em memória, org-scoped (lookup + conversão).
function atendimentoStore(seed: Atendimento[]): AtendimentoLookup & AtendimentoConverter {
  const items = new Map(seed.map((a) => [a.id, a]));
  return {
    async findById(organizationId, id) {
      const a = items.get(id);
      return a !== undefined && a.organizationId === organizationId ? a : null;
    },
    async markConverted({ organizationId, atendimentoId, clientId, convertedAt }) {
      const current = items.get(atendimentoId);
      if (current === undefined || current.organizationId !== organizationId) {
        throw new Error("cross-tenant");
      }
      const updated: Atendimento = {
        ...current,
        clientId,
        status: "convertido",
        result: "convertido",
        convertedAt,
        updatedAt: convertedAt,
      };
      items.set(atendimentoId, updated);
      return updated;
    },
  };
}

// Store de Cliente em memória, org-scoped (duplicidade documental por organização).
function clientStore(): ClientRepository & ClientDuplicateChecker {
  const docs = new Set<string>();
  const key = (o: string, d: string): string => `${o}:${d}`;
  return {
    async existsByDocument(organizationId, { cpf, cnpj }) {
      return (
        (cpf !== undefined && docs.has(key(organizationId, cpf))) ||
        (cnpj !== undefined && docs.has(key(organizationId, cnpj)))
      );
    },
    async create(organizationId, input: CreateClientInput): Promise<Client> {
      const now = new Date();
      if (input.cpf !== undefined) docs.add(key(organizationId, input.cpf));
      if (input.cnpj !== undefined) docs.add(key(organizationId, input.cnpj));
      return {
        id: CLIENT_ID,
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
    },
  };
}

function atendimento(id: string, organizationId: string, over: Partial<Atendimento> = {}): Atendimento {
  const now = new Date();
  return {
    id,
    organizationId,
    status: "novo",
    conflictFlag: false,
    firstContactAt: now,
    lastRelevantInteractionAt: now,
    createdAt: now,
    updatedAt: now,
    ...over,
  };
}

const validClient = { personType: "pf" as const, displayName: "Ricardo Advogado", cpf: "12345678901" };

function build(seed: Atendimento[]) {
  const clients = clientStore();
  const store = atendimentoStore(seed);
  return makeConvertAtendimentoToClient({
    atendimentos: store,
    createClient: makeCreateClient({ clients, duplicates: clients }),
  });
}

describe("makeConvertAtendimentoToClient (tenant-aware)", () => {
  it("converte preservando a organização (atendimento e cliente na mesma org)", async () => {
    const useCase = build([atendimento(ATEND_A, ORG_A)]);
    const result = await useCase.execute({ organizationId: ORG_A, input: { atendimentoId: ATEND_A, client: validClient } });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.atendimento.organizationId).toBe(ORG_A);
      expect(result.value.atendimento.status).toBe("convertido");
      expect(result.value.atendimento.clientId).toBe(CLIENT_ID);
      expect(result.value.client.organizationId).toBe(ORG_A);
      expect(result.value.atendimento.convertedAt).toBeInstanceOf(Date);
    }
  });

  it("NEGA converter atendimento de OUTRA organização (NOT_FOUND)", async () => {
    const useCase = build([atendimento(ATEND_A, ORG_A)]);
    const result = await useCase.execute({ organizationId: ORG_B, input: { atendimentoId: ATEND_A, client: validClient } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NOT_FOUND");
  });

  it("rejeita segunda conversão de forma previsível (CONFLICT)", async () => {
    const useCase = build([atendimento(ATEND_A, ORG_A, { status: "convertido", clientId: CLIENT_ID })]);
    const result = await useCase.execute({ organizationId: ORG_A, input: { atendimentoId: ATEND_A, client: validClient } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CONFLICT");
  });

  it("propaga duplicidade documental do Criar Cliente na mesma org (CONFLICT)", async () => {
    const a2 = "01920000-0000-7000-8000-0000000000cc";
    const clients = clientStore();
    const store = atendimentoStore([atendimento(ATEND_A, ORG_A), atendimento(a2, ORG_A)]);
    const useCase = makeConvertAtendimentoToClient({
      atendimentos: store,
      createClient: makeCreateClient({ clients, duplicates: clients }),
    });
    const first = await useCase.execute({ organizationId: ORG_A, input: { atendimentoId: ATEND_A, client: validClient } });
    const second = await useCase.execute({ organizationId: ORG_A, input: { atendimentoId: a2, client: validClient } });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("CONFLICT");
  });

  it("rejeita entrada inválida (VALIDATION_ERROR)", async () => {
    const useCase = build([atendimento(ATEND_A, ORG_A)]);
    const result = await useCase.execute({ organizationId: ORG_A, input: { atendimentoId: "nao-e-uuid", client: validClient } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});
