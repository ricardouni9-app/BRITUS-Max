import { describe, expect, it } from "vitest";
import type { AuthorizationContext, Client, CreateClientInput } from "@britus/contracts";
import {
  withAuthorization,
  makeAuthorizationGuard,
  makeCreateClient,
  createInMemoryAuditLog,
  type ClientRepository,
  type ClientDuplicateChecker,
} from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const USER = "01920000-0000-7000-8000-000000000001";

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
      return {
        id: "01920000-0000-7000-8000-0000000000bb",
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

const ctx = (memberships: Array<{ organizationId: string; role: "owner" | "lawyer" | "assistant" }>): AuthorizationContext => ({
  identityType: "organization_user",
  userId: USER,
  memberships,
  emergencyScopes: [],
  action: "client.create",
  organizationId: ORG_A,
});

function build() {
  const audit = createInMemoryAuditLog();
  const clients = clientStore();
  const authorizedCreateClient = withAuthorization(
    makeCreateClient({ clients, duplicates: clients }),
    { action: "client.create", resourceType: "client" },
    { guard: makeAuthorizationGuard({ audit }) },
  );
  return { audit, authorizedCreateClient };
}

describe("withAuthorization (boundary genérico — preserva o comportamento do wrapper anterior)", () => {
  it("permite com membership; injeta organizationId do contexto; audita allow", async () => {
    const { audit, authorizedCreateClient } = build();
    const res = await authorizedCreateClient.execute({
      context: ctx([{ organizationId: ORG_A, role: "lawyer" }]),
      input: { personType: "pf", displayName: "Ricardo Advogado" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.value.organizationId).toBe(ORG_A);
    const events = await audit.list();
    expect(events).toHaveLength(1);
    expect(events[0]?.decision).toBe("allow");
  });

  it("nega sem membership (FORBIDDEN) e audita deny sem executar o caso base", async () => {
    const { audit, authorizedCreateClient } = build();
    const res = await authorizedCreateClient.execute({
      context: ctx([]),
      input: { personType: "pf", displayName: "Ricardo Advogado" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
    const events = await audit.list();
    expect(events).toHaveLength(1);
    expect(events[0]?.decision).toBe("deny");
  });
});
