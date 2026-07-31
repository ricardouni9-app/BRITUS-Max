import { createCaseInputSchema, type Case } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, notFoundError, type ApplicationError } from "../errors.js";
import type { UseCase, TenantCommand } from "../use-case.js";
import type { CaseRepository } from "./ports.js";
import type { AtendimentoLookup } from "../atendimento/ports.js";

export interface OpenCaseDeps {
  readonly cases: CaseRepository;
  readonly atendimentos: AtendimentoLookup;
}

export type OpenCaseUseCase = UseCase<TenantCommand<unknown>, Case>;

// Abrir Caso na organização do contexto. Se houver Atendimento de origem, ele deve
// pertencer à MESMA organização (lookup org-scoped): um Atendimento de outra organização
// resolve para `null` → NOT_FOUND (bloqueio cross-tenant).
export function makeOpenCase(deps: OpenCaseDeps): OpenCaseUseCase {
  return {
    async execute({ organizationId, input: raw }: TenantCommand<unknown>): Promise<Result<Case, ApplicationError>> {
      const parsed = createCaseInputSchema.safeParse(raw);
      if (!parsed.success) {
        return err(validationError("Dados de caso inválidos"));
      }
      const input = parsed.data;

      if (input.atendimentoId !== undefined) {
        const origin = await deps.atendimentos.findById(organizationId, input.atendimentoId);
        if (origin === null) {
          return err(notFoundError("Atendimento de origem não encontrado nesta organização"));
        }
      }

      const created = await deps.cases.create(organizationId, input);
      return ok(created);
    },
  };
}
