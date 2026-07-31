import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
  ProductModule,
  Subscription,
  SubscriptionItem,
  PaymentTransaction,
  WebhookEvent,
} from "@britus/contracts";
import type {
  CatalogReader,
  SubscriptionStore,
  PaymentStore,
  WebhookEventStore,
} from "@britus/application";
import {
  productModules,
  subscriptions,
  subscriptionItems,
  paymentTransactions,
  webhookEvents,
  type ProductModuleRow,
  type SubscriptionRow,
  type SubscriptionItemRow,
  type PaymentTransactionRow,
  type WebhookEventRow,
} from "../schema/billing.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

const toModule = (r: ProductModuleRow): ProductModule => ({ code: r.code, name: r.name, priceCents: r.priceCents, currency: r.currency, active: r.active });
const toSubscription = (r: SubscriptionRow): Subscription => ({ id: r.id, organizationId: r.organizationId, status: r.status, currency: r.currency, trialEndsAt: r.trialEndsAt, currentPeriodEndsAt: r.currentPeriodEndsAt, createdAt: r.createdAt, updatedAt: r.updatedAt });
const toItem = (r: SubscriptionItemRow): SubscriptionItem => ({ id: r.id, subscriptionId: r.subscriptionId, moduleCode: r.moduleCode, priceCents: r.priceCents, currency: r.currency });
const toPayment = (r: PaymentTransactionRow): PaymentTransaction => ({ id: r.id, organizationId: r.organizationId, provider: r.provider, externalPaymentId: r.externalPaymentId, amountCents: r.amountCents, currency: r.currency, status: r.status, createdAt: r.createdAt });
const toWebhookEvent = (r: WebhookEventRow): WebhookEvent => ({ id: r.id, provider: r.provider, externalEventId: r.externalEventId, type: r.type, status: r.status, receivedAt: r.receivedAt, processedAt: r.processedAt });

export interface DrizzleCatalog extends CatalogReader {
  // Upsert por `code` — usado pelo bootstrap do catálogo demonstrativo. Idempotente.
  ensureModule(m: ProductModule): Promise<void>;
}

export function createDrizzleCatalog(db: NodePgDatabase): DrizzleCatalog {
  return {
    async listActiveModules() {
      try {
        return (await db.select().from(productModules).where(eq(productModules.active, true))).map(toModule);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async findModule(code) {
      try {
        const [row] = await db.select().from(productModules).where(eq(productModules.code, code)).limit(1);
        return row === undefined ? null : toModule(row);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async ensureModule(m) {
      try {
        await db
          .insert(productModules)
          .values({ code: m.code, name: m.name, priceCents: m.priceCents, currency: m.currency, active: m.active })
          .onConflictDoUpdate({ target: productModules.code, set: { name: m.name, priceCents: m.priceCents, currency: m.currency, active: m.active } });
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
  };
}

export function createDrizzleSubscriptionStore(db: NodePgDatabase): SubscriptionStore {
  return {
    async findByOrganization(organizationId) {
      try {
        const [row] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)).limit(1);
        return row === undefined ? null : toSubscription(row);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async create(input) {
      try {
        const [row] = await db
          .insert(subscriptions)
          .values({ organizationId: input.organizationId, status: input.status, currency: input.currency, trialEndsAt: input.trialEndsAt, currentPeriodEndsAt: input.currentPeriodEndsAt })
          .returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar assinatura");
        return toSubscription(row);
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
    async save(subscription) {
      try {
        const [row] = await db
          .update(subscriptions)
          .set({ status: subscription.status, currency: subscription.currency, trialEndsAt: subscription.trialEndsAt ?? null, currentPeriodEndsAt: subscription.currentPeriodEndsAt ?? null })
          .where(eq(subscriptions.id, subscription.id))
          .returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Assinatura não encontrada");
        return toSubscription(row);
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
    async listItems(subscriptionId) {
      try {
        return (await db.select().from(subscriptionItems).where(eq(subscriptionItems.subscriptionId, subscriptionId))).map(toItem);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async replaceItems(subscriptionId, items) {
      try {
        return await db.transaction(async (tx) => {
          await tx.delete(subscriptionItems).where(eq(subscriptionItems.subscriptionId, subscriptionId));
          if (items.length === 0) return [];
          const rows = await tx
            .insert(subscriptionItems)
            .values(items.map((i) => ({ subscriptionId, moduleCode: i.moduleCode, priceCents: i.priceCents, currency: i.currency })))
            .returning();
          return rows.map(toItem);
        });
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
  };
}

export function createDrizzlePaymentStore(db: NodePgDatabase): PaymentStore {
  return {
    async create(input) {
      try {
        // Idempotente por (provider, external_payment_id): reprocesso não duplica pagamento.
        const inserted = await db
          .insert(paymentTransactions)
          .values({ organizationId: input.organizationId, provider: input.provider, externalPaymentId: input.externalPaymentId, amountCents: input.amountCents, currency: input.currency, status: input.status })
          .onConflictDoNothing()
          .returning();
        const [row] = inserted;
        if (row !== undefined) return toPayment(row);
        if (input.externalPaymentId !== null && input.externalPaymentId !== undefined) {
          const [existing] = await db
            .select()
            .from(paymentTransactions)
            .where(and(eq(paymentTransactions.provider, input.provider), eq(paymentTransactions.externalPaymentId, input.externalPaymentId)))
            .limit(1);
          if (existing !== undefined) return toPayment(existing);
        }
        throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao registrar pagamento");
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
  };
}

export function createDrizzleWebhookEventStore(db: NodePgDatabase): WebhookEventStore {
  return {
    async recordReceived({ provider, externalEventId, type }) {
      try {
        // Deduplicação ATÔMICA por unique(provider, event_id): concorrência → só um isNew.
        const inserted = await db
          .insert(webhookEvents)
          .values({ provider, externalEventId, type })
          .onConflictDoNothing()
          .returning();
        const [row] = inserted;
        if (row !== undefined) return { event: toWebhookEvent(row), isNew: true };
        const [existing] = await db
          .select()
          .from(webhookEvents)
          .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.externalEventId, externalEventId)))
          .limit(1);
        if (existing === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao registrar webhook");
        return { event: toWebhookEvent(existing), isNew: false };
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
    async markProcessed(id) {
      try {
        await db.update(webhookEvents).set({ status: "processed", processedAt: new Date() }).where(eq(webhookEvents.id, id));
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
  };
}

export interface DrizzleBillingStores {
  readonly catalog: DrizzleCatalog;
  readonly subscriptions: SubscriptionStore;
  readonly payments: PaymentStore;
  readonly webhookEvents: WebhookEventStore;
}

export function createDrizzleBillingStores(db: NodePgDatabase): DrizzleBillingStores {
  return {
    catalog: createDrizzleCatalog(db),
    subscriptions: createDrizzleSubscriptionStore(db),
    payments: createDrizzlePaymentStore(db),
    webhookEvents: createDrizzleWebhookEventStore(db),
  };
}
