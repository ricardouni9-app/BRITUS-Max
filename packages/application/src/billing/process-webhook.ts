import { ok, err, type Result } from "../result.js";
import type { ApplicationError } from "../errors.js";
import type {
  BillingProviderGateway,
  WebhookEventStore,
  PaymentStore,
  SubscriptionStore,
} from "./ports.js";

export const PAID_PERIOD_DAYS = 30;

export interface ProcessWebhookResult {
  readonly processed: boolean;
  readonly duplicate: boolean;
}

export interface ProcessWebhookDeps {
  readonly gateway: BillingProviderGateway;
  readonly webhookEvents: WebhookEventStore;
  readonly payments: PaymentStore;
  readonly subscriptions: SubscriptionStore;
  readonly now?: () => Date;
}

// Processa um webhook de pagamento com SEGURANÇA e IDEMPOTÊNCIA:
//  1. valida a assinatura (fail-closed) e normaliza o evento — falha não persiste nada;
//  2. persiste o evento ANTES de processar; a unicidade (provider, eventId) deduplica
//     entregas repetidas/concorrentes/fora de ordem → efeitos colaterais no MÁXIMO uma vez;
//  3. pagamento aprovado ativa entitlements (assinatura → active). Acesso é derivado do
//     entitlement, NUNCA diretamente da resposta do provedor. `webhook_events` é a trilha.
export function makeProcessWebhook(deps: ProcessWebhookDeps) {
  const clock = deps.now ?? ((): Date => new Date());
  return {
    async execute(input: {
      raw: string;
      headers: Record<string, string | undefined>;
    }): Promise<Result<ProcessWebhookResult, ApplicationError>> {
      const parsed = await deps.gateway.verifyAndParse(input.raw, input.headers);
      if (!parsed.ok) {
        return err(parsed.error);
      }
      const event = parsed.value;

      const recorded = await deps.webhookEvents.recordReceived({
        provider: deps.gateway.provider,
        externalEventId: event.externalEventId,
        type: event.type,
      });
      if (!recorded.isNew) {
        return ok({ processed: false, duplicate: true });
      }

      if (event.payment !== undefined) {
        const p = event.payment;
        await deps.payments.create({
          organizationId: p.organizationId,
          provider: deps.gateway.provider,
          externalPaymentId: p.externalPaymentId,
          amountCents: p.amountCents,
          currency: p.currency,
          status: p.status,
        });
        if (p.status === "approved") {
          const sub = await deps.subscriptions.findByOrganization(p.organizationId);
          if (sub !== null) {
            const now = clock();
            await deps.subscriptions.save({
              ...sub,
              status: "active",
              currentPeriodEndsAt: new Date(
                now.getTime() + (p.periodDays ?? PAID_PERIOD_DAYS) * 24 * 3600 * 1000,
              ),
              updatedAt: now,
            });
          }
        }
      }

      await deps.webhookEvents.markProcessed(recorded.event.id);
      return ok({ processed: true, duplicate: false });
    },
  };
}
