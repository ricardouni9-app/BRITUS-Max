import type { Organization, User, OrganizationMembership, UserRole } from "@britus/contracts";

// Registro idempotente por CHAVE TÉCNICA ESTÁVEL (installationId), não pelo nome da org.
export interface BootstrapRecord {
  readonly installationId: string;
  readonly organizationId: string;
  readonly operatorId: string;
}

export interface BootstrapLedger {
  findByInstallationId(installationId: string): Promise<BootstrapRecord | null>;
  record(entry: BootstrapRecord): Promise<void>;
}

// Diretório de organizações (criação; id/timestamps gerados na persistência).
export interface OrganizationDirectory {
  create(input: { readonly name: string }): Promise<Organization>;
}

// Diretório de usuários operacionais (sem credencial — auth é fluxo futuro).
export interface OperatorDirectory {
  create(input: { readonly name: string; readonly email: string }): Promise<User>;
}

// Vínculo usuário↔organização com papel organizacional.
export interface MembershipDirectory {
  create(input: {
    readonly organizationId: string;
    readonly userId: string;
    readonly role: UserRole;
  }): Promise<OrganizationMembership>;
}
