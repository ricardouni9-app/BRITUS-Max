import type { Subscription } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { conflictError, type ApplicationError } from "../errors.js";
import type { SubscriptionStore } from "./ports.js";

export const TRIAL_DAYS = 2;

export interface StartTrialDeps {
  readonly subscriptions: SubscriptionStore;
  readonly now?: () => Date;
}

// Inicia o trial de 2 dias. IDEMPOTENTE e ANTI-REINÍCIO: se a org já tem assinatura em
// trial, devolve a mesma; se já houve assinatura em qualquer outro estado (trial já
// consumido/expirado/pago/cancelado), recusa novo trial (CONFLICT).
export function makeStartTrial(deps: StartTrialDeps) {
  const clock = deps.now ?? ((): Date => new Date());
  return {
    async execute(input: { organizationId: string }): Promise<Result<Subscription, ApplicationError>> {
      const existing = await deps.subscriptions.findByOrganization(input.organizationId);
      if (existing !== null) {
        if (existing.status === "trialing") return ok(existing);
        return err(conflictError("Organização não é elegível a um novo trial"));
      }
      const now = clock();
      const created = await deps.subscriptions.create({
        organizationId: input.organizationId,
        status: "trialing",
        currency: "BRL",
        trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 24 * 3600 * 1000),
        currentPeriodEndsAt: null,
      });
      return ok(created);
    },
  };
}
