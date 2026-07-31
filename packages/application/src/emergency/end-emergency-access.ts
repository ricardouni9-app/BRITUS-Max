import type { EmergencyAccessGrant, AuthorizationContext } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { forbiddenError, notFoundError, type ApplicationError } from "../errors.js";
import type { UseCase } from "../use-case.js";
import type { AuditLog } from "../audit/ports.js";
import type { EmergencyAccessStore } from "./ports.js";

export interface EndEmergencyAccessInput {
  readonly context: AuthorizationContext;
  readonly grantId: string;
  // "ended" = encerramento explícito; "revoked" = revogação.
  readonly mode: "ended" | "revoked";
}

export type EndEmergencyAccessUseCase = UseCase<EndEmergencyAccessInput, EmergencyAccessGrant>;

// Encerrar ou revogar uma concessão emergencial. Apenas identidade global autorizada.
export function makeEndEmergencyAccess(deps: {
  readonly grants: EmergencyAccessStore;
  readonly audit: AuditLog;
}): EndEmergencyAccessUseCase {
  return {
    async execute({
      context,
      grantId,
      mode,
    }: EndEmergencyAccessInput): Promise<Result<EmergencyAccessGrant, ApplicationError>> {
      const authorized =
        context.identityType === "platform_creator" && (context.platformIdentityId ?? null) !== null;
      if (!authorized) {
        await deps.audit.record({
          actorId: context.platformIdentityId ?? null,
          identityType: context.identityType,
          action: "emergency_access.start",
          resourceType: "emergency_access",
          decision: "deny",
          emergencyGrantId: grantId,
          metadata: { phase: mode },
        });
        return err(forbiddenError("Encerrar acesso emergencial exige identidade global autorizada"));
      }

      const grant = await deps.grants.findById(grantId);
      if (grant === null) {
        return err(notFoundError("Concessão emergencial não encontrada"));
      }

      const now = new Date();
      const updated = await deps.grants.save({
        ...grant,
        status: mode,
        endedAt: now,
        updatedAt: now,
      });

      await deps.audit.record({
        actorId: context.platformIdentityId ?? null,
        identityType: context.identityType,
        action: "emergency_access.start",
        organizationId: grant.organizationId,
        resourceType: "emergency_access",
        decision: "allow",
        emergencyGrantId: grant.id,
        metadata: { phase: mode },
      });
      return ok(updated);
    },
  };
}
