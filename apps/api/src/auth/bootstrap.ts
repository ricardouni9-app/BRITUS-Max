import {
  normalizeEmail,
  makeProvisionCredential,
  type CredentialStore,
  type CredentialWriter,
  type PasswordHasher,
} from "@britus/application";
import type { UserRole } from "@britus/contracts";
import type { DrizzleAuthWriters } from "@britus/db";

export interface BootstrapConfig {
  readonly organizationId: string;
  readonly operator: { readonly name: string; readonly email: string; readonly password: string; readonly role: UserRole };
  // Criador provisionado SEPARADAMENTE (identidade global distinta; sem membership).
  readonly creator?: { readonly label: string; readonly password: string };
}

export interface BootstrapResult {
  readonly userId: string;
  readonly creatorId: string | null;
}

export interface BootstrapDeps {
  readonly writers: DrizzleAuthWriters;
  readonly credentials: CredentialStore;
  readonly credentialWriter: CredentialWriter;
  readonly hasher: PasswordHasher;
}

// FALHA SEGURA diante de configuração parcial/inválida — nunca provisiona pela metade.
function assertComplete(config: BootstrapConfig): void {
  const op = config.operator;
  const okOperator =
    typeof config.organizationId === "string" &&
    config.organizationId.length > 0 &&
    typeof op?.name === "string" &&
    op.name.trim().length > 0 &&
    typeof op.email === "string" &&
    op.email.trim().length > 0 &&
    typeof op.password === "string" &&
    op.password.length >= 8 &&
    typeof op.role === "string";
  if (!okOperator) {
    throw new Error("Bootstrap: configuração do operador incompleta ou inválida");
  }
  if (config.creator !== undefined) {
    const c = config.creator;
    if (typeof c.label !== "string" || c.label.trim().length === 0 || typeof c.password !== "string" || c.password.length < 8) {
      throw new Error("Bootstrap: configuração do Criador incompleta ou inválida");
    }
  }
}

// Bootstrap REAL, IDEMPOTENTE. Segredos chegam SOMENTE por configuração externa; são
// convertidos em hash imediatamente (senha nunca persistida) e NUNCA retornados/logados.
export async function runBootstrap(deps: BootstrapDeps, config: BootstrapConfig): Promise<BootstrapResult> {
  assertComplete(config);
  const provision = makeProvisionCredential({
    reader: deps.credentials,
    writer: deps.credentialWriter,
    hasher: deps.hasher,
  });

  const user = await deps.writers.ensureUser({
    name: config.operator.name,
    email: normalizeEmail(config.operator.email),
  });
  await deps.writers.ensureMembership({
    organizationId: config.organizationId,
    userId: user.id,
    role: config.operator.role,
  });
  await provision.execute({ subjectType: "user", subjectId: user.id, password: config.operator.password });

  let creatorId: string | null = null;
  if (config.creator !== undefined) {
    const creator = await deps.writers.ensureCreator({ label: config.creator.label });
    await provision.execute({ subjectType: "creator", subjectId: creator.id, password: config.creator.password });
    creatorId = creator.id;
  }

  return { userId: user.id, creatorId };
}
