import { createAtendimentoInputSchema, type Atendimento } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, type ApplicationError } from "../errors.js";
import type { UseCase, TenantCommand } from "../use-case.js";
import type { AtendimentoRepository } from "./ports.js";

export interface RegisterAtendimentoDeps {
  readonly atendimentos: AtendimentoRepository;
}

export type RegisterAtendimentoUseCase = UseCase<TenantCommand<unknown>, Atendimento>;

// Registrar Atendimento (recepção/lead) na organização do contexto. Valida e delega.
export function makeRegisterAtendimento(deps: RegisterAtendimentoDeps): RegisterAtendimentoUseCase {
  return {
    async execute({ organizationId, input: raw }: TenantCommand<unknown>): Promise<Result<Atendimento, ApplicationError>> {
      const parsed = createAtendimentoInputSchema.safeParse(raw);
      if (!parsed.success) {
        return err(validationError("Dados de atendimento inválidos"));
      }
      const atendimento = await deps.atendimentos.create(organizationId, parsed.data);
      return ok(atendimento);
    },
  };
}
