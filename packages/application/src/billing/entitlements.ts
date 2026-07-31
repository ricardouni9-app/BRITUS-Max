import type { Entitlement } from "@britus/contracts";
import type { SubscriptionStore } from "./ports.js";

export interface EntitlementsDeps {
  readonly subscriptions: SubscriptionStore;
  readonly now?: () => Date;
}

// Entitlements DERIVADOS server-side, organization-scoped. Um módulo contratado só é
// entitled se a assinatura estiver em `trialing` (trial não expirado) ou `active` (período
// pago vigente). Expiração/cancelamento/remoção do módulo → bloqueio imediato.
export function makeResolveEntitlements(deps: EntitlementsDeps) {
  const clock = deps.now ?? ((): Date => new Date());

  async function resolve(organizationId: string): Promise<readonly Entitlement[]> {
    const sub = await deps.subscriptions.findByOrganization(organizationId);
    if (sub === null) return [];
    const items = await deps.subscriptions.listItems(sub.id);
    const now = clock();

    let active = false;
    let source: "trial" | "paid" = "paid";
    let expiresAt: Date | null = null;
    if (sub.status === "trialing" && sub.trialEndsAt != null && sub.trialEndsAt.getTime() > now.getTime()) {
      active = true;
      source = "trial";
      expiresAt = sub.trialEndsAt;
    } else if (sub.status === "active" && sub.currentPeriodEndsAt != null && sub.currentPeriodEndsAt.getTime() > now.getTime()) {
      active = true;
      source = "paid";
      expiresAt = sub.currentPeriodEndsAt;
    }
    return items.map((it) => ({ organizationId, moduleCode: it.moduleCode, active, source, expiresAt }));
  }

  return {
    execute: resolve,
    // Verificação utilizável por módulos futuros: só true quando ativo e contratado.
    async has(organizationId: string, moduleCode: string): Promise<boolean> {
      const ents = await resolve(organizationId);
      return ents.some((e) => e.moduleCode === moduleCode && e.active);
    },
  };
}
