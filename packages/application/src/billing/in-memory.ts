import { uuidv7 } from "uuidv7";
import type {
  ProductModule,
  Subscription,
  SubscriptionItem,
  PaymentTransaction,
  WebhookEvent,
} from "@britus/contracts";
import type { CatalogReader, SubscriptionStore, PaymentStore, WebhookEventStore } from "./ports.js";

// Implementações EM MEMÓRIA — testes e composição de desenvolvimento. Substituíveis pelos
// adapters Drizzle sem tocar nos casos de uso.
export interface InMemoryCatalog extends CatalogReader {
  setPrice(code: string, priceCents: number): void;
}
export function createInMemoryCatalog(modules: readonly ProductModule[]): InMemoryCatalog {
  const byCode = new Map<string, ProductModule>(modules.map((m) => [m.code, { ...m }]));
  return {
    async listActiveModules() {
      return [...byCode.values()].filter((m) => m.active);
    },
    async findModule(code) {
      return byCode.get(code) ?? null;
    },
    setPrice(code, priceCents) {
      const m = byCode.get(code);
      if (m !== undefined) byCode.set(code, { ...m, priceCents });
    },
  };
}

export function createInMemorySubscriptionStore(): SubscriptionStore {
  const subs = new Map<string, Subscription>();
  const byOrg = new Map<string, string>();
  const items = new Map<string, SubscriptionItem[]>();
  return {
    async findByOrganization(organizationId) {
      const id = byOrg.get(organizationId);
      return id !== undefined ? (subs.get(id) ?? null) : null;
    },
    async create(input) {
      const now = new Date();
      const sub: Subscription = {
        id: uuidv7(),
        organizationId: input.organizationId,
        status: input.status,
        currency: input.currency,
        trialEndsAt: input.trialEndsAt,
        currentPeriodEndsAt: input.currentPeriodEndsAt,
        createdAt: now,
        updatedAt: now,
      };
      subs.set(sub.id, sub);
      byOrg.set(input.organizationId, sub.id);
      items.set(sub.id, []);
      return sub;
    },
    async save(subscription) {
      subs.set(subscription.id, subscription);
      return subscription;
    },
    async listItems(subscriptionId) {
      return items.get(subscriptionId) ?? [];
    },
    async replaceItems(subscriptionId, newItems) {
      const created = newItems.map((i) => ({
        id: uuidv7(),
        subscriptionId,
        moduleCode: i.moduleCode,
        priceCents: i.priceCents,
        currency: i.currency,
      }));
      items.set(subscriptionId, created);
      return created;
    },
  };
}

export interface InMemoryPaymentStore extends PaymentStore {
  readonly all: readonly PaymentTransaction[];
}
export function createInMemoryPaymentStore(): InMemoryPaymentStore {
  const all: PaymentTransaction[] = [];
  return {
    get all() {
      return all;
    },
    async create(input) {
      const p: PaymentTransaction = {
        id: uuidv7(),
        organizationId: input.organizationId,
        provider: input.provider,
        externalPaymentId: input.externalPaymentId,
        amountCents: input.amountCents,
        currency: input.currency,
        status: input.status,
        createdAt: new Date(),
      };
      all.push(p);
      return p;
    },
  };
}

export function createInMemoryWebhookEventStore(): WebhookEventStore {
  const seen = new Map<string, WebhookEvent>();
  return {
    async recordReceived({ provider, externalEventId, type }) {
      const key = `${provider}:${externalEventId}`;
      const existing = seen.get(key);
      if (existing !== undefined) return { event: existing, isNew: false };
      const event: WebhookEvent = {
        id: uuidv7(),
        provider,
        externalEventId,
        type,
        status: "received",
        receivedAt: new Date(),
        processedAt: null,
      };
      seen.set(key, event);
      return { event, isNew: true };
    },
    async markProcessed(id) {
      for (const [k, e] of seen) {
        if (e.id === id) seen.set(k, { ...e, status: "processed", processedAt: new Date() });
      }
    },
  };
}
