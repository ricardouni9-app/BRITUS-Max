import { convertAtendimentoInputSchema, type Atendimento, type Client } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, notFoundError, conflictError, type ApplicationError } from "../errors.js";
import type { UseCase, TenantCommand } from "../use-case.js";
import type { AtendimentoLookup, AtendimentoConverter } from "./ports.js";
import type { CreateClientUseCase } from "../client/create-client.js";

export interface ConvertAtendimentoResult {
  readonly atendimento: Atendimento;
  readonly client: Client;
}

export interface ConvertAtendimentoDeps {
  readonly atendimentos: AtendimentoLookup & AtendimentoConverter;
  // Reutiliza o caso de uso Criar Cliente (duplicidade documental tratada nele).
  readonly createClient: CreateClientUseCase;
}

export type ConvertAtendimentoUseCase = UseCase<TenantCommand<unknown>, ConvertAtendimentoResult>;

// Conversão EXPLÍCITA de Atendimento em Cliente, TODA dentro da organização do contexto:
// o Atendimento de origem, o Cliente criado e o vínculo permanecem na mesma organização.
export function makeConvertAtendimentoToClient(deps: ConvertAtendimentoDeps): ConvertAtendimentoUseCase {
  return {
    async execute({ organizationId, input: raw }: TenantCommand<unknown>): Promise<Result<ConvertAtendimentoResult, ApplicationError>> {
      const parsed = convertAtendimentoInputSchema.safeParse(raw);
      if (!parsed.success) {
        return err(validationError("Dados de conversão inválidos"));
      }
      const { atendimentoId, client } = parsed.data;

      // 1. Atendimento de origem deve existir NA ORGANIZAÇÃO (bloqueia cross-tenant).
      const atendimento = await deps.atendimentos.findById(organizationId, atendimentoId);
      if (atendimento === null) {
        return err(notFoundError("Atendimento não encontrado nesta organização"));
      }

      // 2. Segunda conversão → rejeição previsível (idempotência de estado).
      const alreadyLinked = (atendimento.clientId ?? null) !== null;
      if (atendimento.status === "convertido" || alreadyLinked) {
        return err(conflictError("Atendimento já convertido em Cliente"));
      }

      // 3. Reutiliza Criar Cliente NA MESMA organização — duplicidade documental → CONFLICT.
      const created = await deps.createClient.execute({ organizationId, input: client });
      if (!created.ok) {
        return err(created.error);
      }

      // 4. Marca vínculo/estado convertido (escopado por organização).
      const converted = await deps.atendimentos.markConverted({
        organizationId,
        atendimentoId,
        clientId: created.value.id,
        convertedAt: new Date(),
      });

      return ok({ atendimento: converted, client: created.value });
    },
  };
}
