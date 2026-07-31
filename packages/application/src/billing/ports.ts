import type {
  ProductModule,
  Subscription,
  SubscriptionStatus,
  SubscriptionItem,
  PaymentTransaction,
  PaymentStatus,
  WebhookEvent,
  BillingProvider,
  Currency,
} from "@britus/contracts";
import type { Result } from "../result.js";
import type { ApplicationError } from "../errors.js";

export interface CatalogReader {
  listActiveModules(): Promise<readonly ProductModule[]>;
  findModule(code: string): Promise<ProductModule | null>;
}

export interface SubscriptionStore {
  findByOrganization(organizationId: string): Promise<Subscription | null>;
  create(input: {
    readonly organizationId: string;
    readonly status: SubscriptionStatus;
    readonly currency: Currency;
    readonly trialEndsAt: Date | null;
    readonly currentPeriodEndsAt: Date | null;
  }): Promise<Subscription>;
  save(subscription: Subscription): Promise<Subscription>;
  listItems(subscriptionId: string): Promise<readonly SubscriptionItem[]>;
  // Substitui os itens da assinatura (snapshot de preços) atomicamente.
  replaceItems(
    subscriptionId: string,
    items: readonly { moduleCode: string; priceCents: number; currency: Currency }[],
  ): Promise<readonly SubscriptionItem[]>;
}

export interface PaymentStore {
  create(input: {
    readonly organizationId: string;
    readonly provider: BillingProvider;
    readonly externalPaymentId: string | null;
    readonly amountCents: number;
    readonly currency: Currency;
    readonly status: PaymentStatus;
  }): Promise<PaymentTransaction>;
}

export interface WebhookEventStore {
  // IDEMPOTENTE: insere se novo (unique provider+externalEventId); retorna isNew=false quando
  // já existe. É a fronteira de deduplicação de webhook.
  recordReceived(input: {
    readonly provider: BillingProvider;
    readonly externalEventId: string;
    readonly type: string;
  }): Promise<{ event: WebhookEvent; isNew: boolean }>;
  markProcessed(id: string): Promise<void>;
}

// Evento de billing NORMALIZADO pelo provedor — a Application nunca conhece MercadoPago.
export interface NormalizedBillingEvent {
  readonly externalEventId: string;
  readonly type: string;
  readonly payment?: {
    readonly externalPaymentId: string;
    readonly amountCents: number;
    readonly currency: Currency;
    readonly status: PaymentStatus;
    readonly organizationId: string;
  };
}

// Provedor externo atrás de PORT: valida assinatura (fail-closed) e normaliza o evento.
// Adapters (MercadoPago, fake) vivem na infraestrutura, nunca na Application.
export interface BillingProviderGateway {
  readonly provider: BillingProvider;
  verifyAndParse(
    raw: string,
    headers: Record<string, string | undefined>,
  ): Result<NormalizedBillingEvent, ApplicationError>;
}
