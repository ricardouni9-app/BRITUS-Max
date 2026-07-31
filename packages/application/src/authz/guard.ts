import type { AuthorizationContext } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { forbiddenError, type ApplicationError } from "../errors.js";
import type { AuditLog } from "../audit/ports.js";
import { authorize } from "./policy.js";

// Guard reutilizável: decide via `authorize` e SEMPRE registra a decisão (inclusive
// negativas) na trilha de auditoria. As rotas não repetem verificação de papel.
export interface AuthorizationGuard {
  check(ctx: AuthorizationContext): Promise<Result<void, ApplicationError>>;
}

export function makeAuthorizationGuard(deps: { readonly audit: AuditLog }): AuthorizationGuard {
  return {
    async check(ctx: AuthorizationContext): Promise<Result<void, ApplicationError>> {
      const outcome = authorize(ctx);
      const actorId =
        ctx.identityType === "platform_creator"
          ? (ctx.platformIdentityId ?? null)
          : (ctx.userId ?? null);
      await deps.audit.record({
        actorId,
        identityType: ctx.identityType,
        action: ctx.action,
        organizationId: ctx.organizationId ?? null,
        resourceType: ctx.resourceType ?? null,
        resourceId: ctx.resourceId ?? null,
        decision: outcome.decision,
        justification: ctx.justification ?? null,
        emergencyGrantId: ctx.emergencyGrantId ?? null,
      });
      if (outcome.decision === "allow") {
        return ok(undefined);
      }
      return err(forbiddenError(outcome.reason ?? "Ação não autorizada"));
    },
  };
}
