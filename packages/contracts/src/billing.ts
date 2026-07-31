import { z } from "zod";
import { uuidSchema, timestampSchema } from "./shared.js";

// Moeda explícita (sem float; valores SEMPRE em centavos inteiros). Um único código por ora.
export const currencySchema = z.enum(["BRL"]);
export type Currency = z.infer<typeof currencySchema>;

export const amountCentsSchema = z.number().int().min(0);

// Provedores de pagamento — `gateway`/`provider` como enum extensível (novo provedor NÃO
// exige migração de schema; a coluna é text no banco).
export const billingProviderSchema = z.enum(["mercadopago", "fake"]);
export type BillingProvider = z.infer<typeof billingProviderSchema>;

// Catálogo: módulo contratável com preço incremental. `code` é o identificador estável.
export const productModuleSchema = z.object({
  code: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  priceCents: amountCentsSchema,
  currency: currencySchema,
  active: z.boolean().default(true),
});
export type ProductModule = z.infer<typeof productModuleSchema>;

// Estados de assinatura — explícitos e finitos.
export const subscriptionStatusSchema = z.enum([
  "trialing",
  "active",
  "past_due",
  "canceled",
  "expired",
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  status: subscriptionStatusSchema,
  currency: currencySchema,
  trialEndsAt: timestampSchema.nullable().optional(),
  currentPeriodEndsAt: timestampSchema.nullable().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});
export type Subscription = z.infer<typeof subscriptionSchema>;

// Item contratado — SNAPSHOT do preço no momento da contratação (preserva histórico quando
// o catálogo muda).
export const subscriptionItemSchema = z.object({
  id: uuidSchema,
  subscriptionId: uuidSchema,
  moduleCode: z.string().trim().min(1).max(60),
  priceCents: amountCentsSchema,
  currency: currencySchema,
});
export type SubscriptionItem = z.infer<typeof subscriptionItemSchema>;

// Entitlement DERIVADO server-side (nunca de claims do cliente nem de resposta do provedor).
export const entitlementSourceSchema = z.enum(["trial", "paid"]);
export const entitlementSchema = z.object({
  organizationId: uuidSchema,
  moduleCode: z.string().trim().min(1).max(60),
  active: z.boolean(),
  source: entitlementSourceSchema,
  expiresAt: timestampSchema.nullable().optional(),
});
export type Entitlement = z.infer<typeof entitlementSchema>;

// Referência ao cliente no provedor (mínimo necessário; nunca dados de cartão).
export const paymentCustomerReferenceSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  provider: billingProviderSchema,
  externalCustomerId: z.string().trim().min(1),
});
export type PaymentCustomerReference = z.infer<typeof paymentCustomerReferenceSchema>;

export const paymentStatusSchema = z.enum(["pending", "approved", "rejected", "refunded"]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentTransactionSchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  provider: billingProviderSchema,
  externalPaymentId: z.string().trim().min(1).nullable().optional(),
  amountCents: amountCentsSchema,
  currency: currencySchema,
  status: paymentStatusSchema,
  createdAt: timestampSchema,
});
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>;

// Evento de webhook — persistido ANTES do processamento; idempotência por (provider, eventId).
export const webhookEventStatusSchema = z.enum(["received", "processed", "failed"]);
export const webhookEventSchema = z.object({
  id: uuidSchema,
  provider: billingProviderSchema,
  externalEventId: z.string().trim().min(1),
  type: z.string().trim().min(1).max(120),
  status: webhookEventStatusSchema,
  receivedAt: timestampSchema,
  processedAt: timestampSchema.nullable().optional(),
});
export type WebhookEvent = z.infer<typeof webhookEventSchema>;
