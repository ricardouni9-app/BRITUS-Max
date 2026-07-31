import type { Client, CreateClientInput } from "@britus/contracts";

// Contratos de dependências (ports) do caso de uso. A implementação concreta
// (Drizzle/PostgreSQL) vive na infraestrutura — a camada de aplicação não a conhece.
// Todos os ports são org-scoped: o tenant é sempre explícito, nunca vindo do input.

// Duplicidade documental POR ORGANIZAÇÃO (não global): o mesmo CPF/CNPJ pode existir
// em organizações distintas.
export interface ClientDuplicateChecker {
  existsByDocument(
    organizationId: string,
    doc: { readonly cpf?: string; readonly cnpj?: string },
  ): Promise<boolean>;
}

// Persistência de cliente. O `id` e os timestamps são gerados na persistência.
export interface ClientRepository {
  create(organizationId: string, input: CreateClientInput): Promise<Client>;
}
