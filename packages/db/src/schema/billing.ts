import { pgTable, uuid, text, integer, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import type { Currency, SubscriptionStatus, PaymentStatus, BillingProvider } from "@britus/contracts";

const ts = (name: string) => timestamp(name, { withTimezone: true });

// Catálogo de módulos contratáveis. `code` é a chave natural estável. Preço em CENTAVOS.
export const productModules = pgTable("product_modules", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().$type<Currency>(),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});
export type ProductModuleRow = typeof productModules.$inferSelect;

// Assinatura — uma por organização (tenancy). Estados finitos.
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    status: text("status").notNull().$type<SubscriptionStatus>(),
    currency: text("currency").notNull().$type<Currency>(),
    trialEndsAt: ts("trial_ends_at"),
    currentPeriodEndsAt: ts("current_period_ends_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("subscriptions_org_unique").on(t.organizationId)],
);
export type SubscriptionRow = typeof subscriptions.$inferSelect;

// Itens contratados — SNAPSHOT do preço (preserva histórico quando o catálogo muda).
export const subscriptionItems = pgTable(
  "subscription_items",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    subscriptionId: uuid("subscription_id").notNull().references(() => subscriptions.id),
    moduleCode: text("module_code").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().$type<Currency>(),
  },
  (t) => [uniqueIndex("subscription_items_sub_module_unique").on(t.subscriptionId, t.moduleCode)],
);
export type SubscriptionItemRow = typeof subscriptionItems.$inferSelect;

// Transações de pagamento. Unicidade parcial (provider, external_payment_id) → idempotência.
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    provider: text("provider").notNull().$type<BillingProvider>(),
    externalPaymentId: text("external_payment_id"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().$type<Currency>(),
    status: text("status").notNull().$type<PaymentStatus>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("payment_tx_organization_idx").on(t.organizationId),
    uniqueIndex("payment_tx_provider_external_unique").on(t.provider, t.externalPaymentId).where(sql`${t.externalPaymentId} is not null`),
  ],
);
export type PaymentTransactionRow = typeof paymentTransactions.$inferSelect;

// Eventos de webhook — persistidos antes do processamento; unicidade (provider, event_id).
export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    provider: text("provider").notNull().$type<BillingProvider>(),
    externalEventId: text("external_event_id").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull().default("received").$type<"received" | "processed" | "failed">(),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [uniqueIndex("webhook_events_provider_event_unique").on(t.provider, t.externalEventId)],
);
export type WebhookEventRow = typeof webhookEvents.$inferSelect;

// Referência ao cliente no provedor (mínimo; nunca dados de cartão).
export const paymentCustomerReferences = pgTable(
  "payment_customer_references",
  {
    id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id),
    provider: text("provider").notNull().$type<BillingProvider>(),
    externalCustomerId: text("external_customer_id").notNull(),
  },
  (t) => [uniqueIndex("payment_customer_ref_org_provider_unique").on(t.organizationId, t.provider)],
);
export type PaymentCustomerReferenceRow = typeof paymentCustomerReferences.$inferSelect;
