import { bootstrapConfigSchema, type OrganizationMembership } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, type ApplicationError } from "../errors.js";
import type { UseCase } from "../use-case.js";
import type {
  BootstrapLedger,
  OrganizationDirectory,
  OperatorDirectory,
  MembershipDirectory,
} from "./ports.js";

export interface BootstrapResult {
  readonly installationId: string;
  readonly organizationId: string;
  readonly operatorId: string;
  readonly memberships: readonly OrganizationMembership[];
  // true quando a instalação já havia sido provisionada (reexecução idempotente).
  readonly alreadyBootstrapped: boolean;
}

export interface BootstrapDeps {
  readonly ledger: BootstrapLedger;
  readonly organizations: OrganizationDirectory;
  readonly operators: OperatorDirectory;
  readonly memberships: MembershipDirectory;
}

export type BootstrapFirstOrganizationUseCase = UseCase<unknown, BootstrapResult>;

// Bootstrap IDEMPOTENTE por `installationId` (chave técnica estável): a reexecução não
// duplica organização, usuário nem vínculos, e o nome da organização pode mudar depois.
// NÃO grava senha/segredo; dados vêm da configuração de implantação.
export function makeBootstrapFirstOrganization(deps: BootstrapDeps): BootstrapFirstOrganizationUseCase {
  return {
    async execute(raw: unknown): Promise<Result<BootstrapResult, ApplicationError>> {
      const parsed = bootstrapConfigSchema.safeParse(raw);
      if (!parsed.success) {
        return err(validationError("Configuração de bootstrap inválida"));
      }
      const config = parsed.data;

      const existing = await deps.ledger.findByInstallationId(config.installationId);
      if (existing !== null) {
        return ok({
          installationId: existing.installationId,
          organizationId: existing.organizationId,
          operatorId: existing.operatorId,
          memberships: [],
          alreadyBootstrapped: true,
        });
      }

      const organization = await deps.organizations.create({ name: config.organization.name });
      const operator = await deps.operators.create({
        name: config.operator.name,
        email: config.operator.email,
      });

      const memberships: OrganizationMembership[] = [];
      for (const role of config.operator.roles) {
        memberships.push(
          await deps.memberships.create({
            organizationId: organization.id,
            userId: operator.id,
            role,
          }),
        );
      }

      await deps.ledger.record({
        installationId: config.installationId,
        organizationId: organization.id,
        operatorId: operator.id,
      });

      return ok({
        installationId: config.installationId,
        organizationId: organization.id,
        operatorId: operator.id,
        memberships,
        alreadyBootstrapped: false,
      });
    },
  };
}
