import type { EmergencyAccessGrant, ResourceType } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { forbiddenError, notFoundError, type ApplicationError } from "../errors.js";
import type { UseCase } from "../use-case.js";
import type { AuditLog } from "../audit/ports.js";
import type { EmergencyAccessStore } from "./ports.js";

export interface CheckEmergencyAccessInput {
  readonly grantId: string;
  readonly resourceType: ResourceType;
  readonly at?: Date;
}

export type CheckEmergencyAccessUseCase = UseCase<CheckEmergencyAccessInput, EmergencyAccessGrant>;

// Uma concessão é utilizável somente se ATIVA e ainda não expirada.
export function isEmergencyGrantUsable(grant: EmergencyAccessGrant, at: Date): boolean {
  return grant.status === "active" && at.getTime() < grant.endsAt.getTime();
}

// Verifica se uma operação sob concessão emergencial é permitida: concessão utilizável
// (ativa, não expirada, não revogada) e recurso dentro do escopo mínimo concedido.
// Nega uso após expiração/revogação ou fora do escopo. Registra auditoria.
export function makeCheckEmergencyAccess(deps: {
  readonly grants: EmergencyAccessStore;
  readonly audit: AuditLog;
}): CheckEmergencyAccessUseCase {
  return {
    async execute({
      grantId,
      resourceType,
      at,
    }: CheckEmergencyAccessInput): Promise<Result<EmergencyAccessGrant, ApplicationError>> {
      const grant = await deps.grants.findById(grantId);
      if (grant === null) {
        return err(notFoundError("Concessão emergencial não encontrada"));
      }
      const now = at ?? new Date();
      const usable = isEmergencyGrantUsable(grant, now);
      const inScope = grant.scope.includes(resourceType);
      const decision = usable && inScope ? "allow" : "deny";

      await deps.audit.record({
        actorId: grant.operatorIdentityId,
        identityType: "platform_creator",
        action: "emergency_access.start",
        organizationId: grant.organizationId,
        resourceType,
        decision,
        emergencyGrantId: grant.id,
        metadata: { phase: "use", grantStatus: grant.status },
      });

      if (decision === "deny") {
        return err(forbiddenError("Acesso emergencial expirado, revogado ou fora de escopo"));
      }
      return ok(grant);
    },
  };
}
