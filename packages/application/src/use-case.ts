import type { Result } from "./result.js";
import type { ApplicationError } from "./errors.js";

// Contrato base reutilizável para todos os casos de uso.
export interface UseCase<Input, Output> {
  execute(input: Input): Promise<Result<Output, ApplicationError>>;
}

// Comando tenant-aware mínimo dos casos de uso operacionais. `organizationId` é sempre
// derivado do contexto server-side (nunca do `input`). Tipo NEUTRO (não depende de
// autorização) e extensível ADITIVAMENTE (campos opcionais futuros) sem quebrar consumidores.
export interface TenantCommand<Input> {
  readonly organizationId: string;
  readonly input: Input;
}
