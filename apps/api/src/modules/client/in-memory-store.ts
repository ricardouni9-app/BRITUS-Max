import { uuidv7 } from "uuidv7";
import type { Client, CreateClientInput } from "@britus/contracts";
import type { ClientRepository, ClientDuplicateChecker } from "@britus/application";

export interface InMemoryClientStore extends ClientRepository, ClientDuplicateChecker {
  readonly all: readonly Client[];
}

// Implementação EM MEMÓRIA, **isolada por organização** e substituível pela
// infraestrutura real. Gera `id`/timestamps no lado da aplicação (uuidv7). A duplicidade
// documental é escopada por organização (chave `${organizationId}:${documento}`).
export function createInMemoryClientStore(): InMemoryClientStore {
  const clients: Client[] = [];
  const documents = new Set<string>();
  const docKey = (organizationId: string, doc: string): string => `${organizationId}:${doc}`;

  return {
    get all(): readonly Client[] {
      return clients;
    },
    async existsByDocument(
      organizationId: string,
      doc: { cpf?: string; cnpj?: string },
    ): Promise<boolean> {
      return (
        (doc.cpf !== undefined && documents.has(docKey(organizationId, doc.cpf))) ||
        (doc.cnpj !== undefined && documents.has(docKey(organizationId, doc.cnpj)))
      );
    },
    async create(organizationId: string, input: CreateClientInput): Promise<Client> {
      const now = new Date();
      const client: Client = {
        id: uuidv7(),
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
      clients.push(client);
      if (input.cpf !== undefined) documents.add(docKey(organizationId, input.cpf));
      if (input.cnpj !== undefined) documents.add(docKey(organizationId, input.cnpj));
      return client;
    },
  };
}
