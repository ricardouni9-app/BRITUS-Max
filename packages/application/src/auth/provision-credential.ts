import type { Credential, SubjectType } from "@britus/contracts";
import { ok, type Result } from "../result.js";
import type { ApplicationError } from "../errors.js";
import type { CredentialStore, CredentialWriter, PasswordHasher } from "./ports.js";

export interface ProvisionCredentialResult {
  readonly credential: Credential;
  readonly alreadyProvisioned: boolean;
}

export interface ProvisionCredentialDeps {
  readonly reader: CredentialStore;
  readonly writer: CredentialWriter;
  readonly hasher: PasswordHasher;
}

// Provisiona a credencial inicial de um subject (usuário ou Criador) para o bootstrap.
// IDEMPOTENTE (não recria se já existe). O segredo chega por CONFIGURAÇÃO externa (nunca
// versionado) e é imediatamente convertido em HASH — a senha nunca é persistida.
export function makeProvisionCredential(deps: ProvisionCredentialDeps) {
  return {
    async execute(input: {
      subjectType: SubjectType;
      subjectId: string;
      password: string;
    }): Promise<Result<ProvisionCredentialResult, ApplicationError>> {
      const existing = await deps.reader.findBySubject({ type: input.subjectType, id: input.subjectId });
      if (existing !== null) {
        return ok({ credential: existing, alreadyProvisioned: true });
      }
      const secretHash = await deps.hasher.hash(input.password);
      const credential = await deps.writer.create({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        secretHash,
        algorithm: deps.hasher.algorithm,
      });
      return ok({ credential, alreadyProvisioned: false });
    },
  };
}
