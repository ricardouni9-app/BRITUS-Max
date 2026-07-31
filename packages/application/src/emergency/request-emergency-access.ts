import {
  requestEmergencyAccessInputSchema,
  type EmergencyAccessGrant,
  type AuthorizationContext,
} from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, forbiddenError, type ApplicationError } from "../errors.js";
import type { UseCase } from "../use-case.js";
import type { AuditLog, RecordAuditInput } from "../audit/ports.js";
import type { EmergencyAccessStore } from "./ports.js";

export interface RequestEmergencyAccessInputWrapper {
  readonly context: AuthorizationContext;
  readonly input: unknown;
}

export type RequestEmergencyAccessUseCase = UseCase<
  RequestEmergencyAccessInputWrapper,
  EmergencyAccessGrant
>;

function isAuthorizedCreator(ctx: AuthorizationContext): boolean {
  return ctx.identityType === "platform_creator" && (ctx.platformIdentityId ?? null) !== null;
}

function auditBase(ctx: AuthorizationContext, decision: "allow" | "deny"): RecordAuditInput {
  return {
    actorId: ctx.platformIdentityId ?? null,
    identityType: ctx.identityType,
    action: "emergency_access.start",
    organizationId: ctx.organizationId ?? null,
    resourceType: "emergency_access",
    resourceId: null,
    decision,
    justification: ctx.justification ?? null,
    emergencyGrantId: null,
  };
}

// Solicitar acesso emergencial. Exige identidade global autorizada, justificativa não
// vazia e útil (schema), escopo explícito e duração válida. Concede status "active"
// com início e expiração; registra auditoria (concessão e negativas relevantes).
export function makeRequestEmergencyAccess(deps: {
  readonly grants: EmergencyAccessStore;
  readonly audit: AuditLog;
}): RequestEmergencyAccessUseCase {
  return {
    async execute({
      context,
      input,
    }: RequestEmergencyAccessInputWrapper): Promise<Result<EmergencyAccessGrant, ApplicationError>> {
      if (!isAuthorizedCreator(context)) {
        await deps.audit.record(auditBase(context, "deny"));
        return err(forbiddenError("Acesso emergencial exige identidade global autorizada"));
      }

      const parsed = requestEmergencyAccessInputSchema.safeParse(input);
      if (!parsed.success) {
        await deps.audit.record(auditBase(context, "deny"));
        return err(validationError("Solicitação de acesso emergencial inválida"));
      }
      const data = parsed.data;

      const now = new Date();
      const endsAt = new Date(now.getTime() + data.durationMinutes * 60_000);
      const grant = await deps.grants.create({
        organizationId: data.organizationId,
        operatorIdentityId: context.platformIdentityId as string,
        purpose: data.purpose,
        justification: data.justification,
        scope: data.scope,
        status: "active",
        startedAt: now,
        endsAt,
        endedAt: null,
      });

      await deps.audit.record({
        ...auditBase(context, "allow"),
        organizationId: data.organizationId,
        emergencyGrantId: grant.id,
        justification: data.justification,
      });
      return ok(grant);
    },
  };
}
