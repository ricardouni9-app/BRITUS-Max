import { createClientInputSchema, type Client } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { conflictError, validationError, type ApplicationError } from "../errors.js";
import type { UseCase, TenantCommand } from "../use-case.js";
import type { ClientRepository, ClientDuplicateChecker } from "./ports.js";

export interface CreateClientDeps {
  readonly clients: ClientRepository;
  readonly duplicates: ClientDuplicateChecker;
}

// Tenant-aware: recebe `{ organizationId, input }`. O `organizationId` vem do contexto.
export type CreateClientUseCase = UseCase<TenantCommand<unknown>, Client>;

// Caso de uso "Criar Cliente". Valida a entrada, impede documento duplicado
// **na organização** (via interface de consulta org-scoped) e delega a persistência.
// Não conhece Drizzle, PostgreSQL, Fastify, Docker nem o AuthorizationContext.
export function makeCreateClient(deps: CreateClientDeps): CreateClientUseCase {
  return {
    async execute({ organizationId, input: rawInput }: TenantCommand<unknown>): Promise<Result<Client, ApplicationError>> {
      const parsed = createClientInputSchema.safeParse(rawInput);
      if (!parsed.success) {
        return err(validationError("Dados de cliente inválidos"));
      }
      const input = parsed.data;

      // Duplicidade por **documento** (CPF/CNPJ) POR ORGANIZAÇÃO; a duplicidade "leve"
      // por nome permanece um aviso e não é tratada aqui (DOMAIN_MODEL).
      if (input.cpf !== undefined || input.cnpj !== undefined) {
        const exists = await deps.duplicates.existsByDocument(organizationId, {
          cpf: input.cpf,
          cnpj: input.cnpj,
        });
        if (exists) {
          return err(conflictError("Já existe cliente com este documento nesta organização"));
        }
      }

      const client = await deps.clients.create(organizationId, input);
      return ok(client);
    },
  };
}
