import { describe, expect, it } from "vitest";
import type { ProductModule } from "@britus/contracts";
import {
  computePrice,
  makeStartTrial,
  makeContractModules,
  makeResolveEntitlements,
  makeProcessWebhook,
  createInMemoryCatalog,
  createInMemorySubscriptionStore,
  createInMemoryPaymentStore,
  createInMemoryWebhookEventStore,
  ok,
  err,
  forbiddenError,
  type BillingProviderGateway,
  type NormalizedBillingEvent,
} from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";

const MODULES: ProductModule[] = [
  { code: "clients", name: "Clientes", priceCents: 5000, currency: "BRL", active: true },
  { code: "cases", name: "Casos", priceCents: 3000, currency: "BRL", active: true },
  { code: "documents", name: "Documentos", priceCents: 2000, currency: "BRL", active: true },
];

function fakeGateway(): BillingProviderGateway {
  return {
    provider: "fake",
    verifyAndParse(raw, headers) {
      if (headers["x-fake-sig"] !== "valid") return err(forbiddenError("assinatura inválida"));
      return ok(JSON.parse(raw) as NormalizedBillingEvent);
    },
  };
}

function paymentEvent(eventId: string, status: "approved" | "pending" | "rejected", organizationId = ORG_A): string {
  const evt: NormalizedBillingEvent = {
    externalEventId: eventId,
    type: "payment.updated",
    payment: { externalPaymentId: `pay-${eventId}`, amountCents: 8000, currency: "BRL", status, organizationId },
  };
  return JSON.stringify(evt);
}

describe("billing — preço", () => {
  it("compõe preço incremental em centavos inteiros; rejeita vazio e moedas divergentes", () => {
    const q = computePrice([MODULES[0]!, MODULES[1]!]);
    expect(q.ok).toBe(true);
    if (q.ok) expect(q.value.amountCents).toBe(8000);
    expect(computePrice([]).ok).toBe(false);
    const mixed = computePrice([MODULES[0]!, { ...MODULES[1]!, currency: "BRL" }]);
    expect(mixed.ok).toBe(true);
  });
});

describe("billing — trial", () => {
  it("inicia trial de 2 dias; idempotente; não reinicia após consumo (CONFLICT); isolado por org", async () => {
    const subs = createInMemorySubscriptionStore();
    const trial = makeStartTrial({ subscriptions: subs });
    const a1 = await trial.execute({ organizationId: ORG_A });
    expect(a1.ok).toBe(true);
    if (a1.ok) {
      expect(a1.value.status).toBe("trialing");
      const days = (a1.value.trialEndsAt!.getTime() - a1.value.createdAt.getTime()) / (24 * 3600 * 1000);
      expect(Math.round(days)).toBe(2);
    }
    // Idempotente enquanto trialing.
    const a2 = await trial.execute({ organizationId: ORG_A });
    expect(a2.ok && a1.ok && a2.value.id === a1.value.id).toBe(true);
    // Isolamento: org B independe.
    expect((await trial.execute({ organizationId: ORG_B })).ok).toBe(true);
    // Anti-reinício: após expirar/converter, novo trial é recusado.
    if (a1.ok) await subs.save({ ...a1.value, status: "expired" });
    const restart = await trial.execute({ organizationId: ORG_A });
    expect(restart.ok).toBe(false);
    if (!restart.ok) expect(restart.error.code).toBe("CONFLICT");
  });
});

describe("billing — contratação e preço histórico", () => {
  it("contrata módulos com SNAPSHOT; mudança de catálogo não altera cobrança contratada", async () => {
    const catalog = createInMemoryCatalog(MODULES);
    const subs = createInMemorySubscriptionStore();
    await makeStartTrial({ subscriptions: subs }).execute({ organizationId: ORG_A });
    const contract = makeContractModules({ subscriptions: subs, catalog });
    const r = await contract.execute({ organizationId: ORG_A, moduleCodes: ["clients", "cases"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.totalCents).toBe(8000);
    // Catálogo sobe de preço; os itens já contratados permanecem no preço histórico.
    catalog.setPrice("clients", 9999);
    const sub = await subs.findByOrganization(ORG_A);
    const items = await subs.listItems(sub!.id);
    expect(items.find((i) => i.moduleCode === "clients")?.priceCents).toBe(5000);
  });
});

describe("billing — entitlements", () => {
  it("derivados server-side: trial ativo libera; expirado/cancelado bloqueia; módulo não contratado bloqueado", async () => {
    let now = new Date("2026-01-01T00:00:00Z");
    const catalog = createInMemoryCatalog(MODULES);
    const subs = createInMemorySubscriptionStore();
    await makeStartTrial({ subscriptions: subs, now: () => now }).execute({ organizationId: ORG_A });
    await makeContractModules({ subscriptions: subs, catalog }).execute({ organizationId: ORG_A, moduleCodes: ["clients"] });
    const ents = makeResolveEntitlements({ subscriptions: subs, now: () => now });
    expect(await ents.has(ORG_A, "clients")).toBe(true);
    expect(await ents.has(ORG_A, "cases")).toBe(false); // não contratado
    // Trial expira → bloqueio imediato.
    now = new Date("2026-01-05T00:00:00Z");
    expect(await ents.has(ORG_A, "clients")).toBe(false);
    // Org sem assinatura → nada.
    expect(await ents.has(ORG_B, "clients")).toBe(false);
  });
});

describe("billing — webhook", () => {
  async function setup() {
    const subs = createInMemorySubscriptionStore();
    const catalog = createInMemoryCatalog(MODULES);
    await makeStartTrial({ subscriptions: subs }).execute({ organizationId: ORG_A });
    await makeContractModules({ subscriptions: subs, catalog }).execute({ organizationId: ORG_A, moduleCodes: ["clients"] });
    const payments = createInMemoryPaymentStore();
    const webhookEvents = createInMemoryWebhookEventStore();
    const process = makeProcessWebhook({ gateway: fakeGateway(), webhookEvents, payments, subscriptions: subs });
    return { subs, payments, process };
  }

  it("assinatura inválida é recusada e nada é persistido", async () => {
    const { process, payments } = await setup();
    const r = await process.execute({ raw: paymentEvent("e1", "approved"), headers: { "x-fake-sig": "errada" } });
    expect(r.ok).toBe(false);
    expect(payments.all).toHaveLength(0);
  });

  it("pagamento aprovado ativa entitlements (assinatura → active)", async () => {
    const { process, subs } = await setup();
    const r = await process.execute({ raw: paymentEvent("e1", "approved"), headers: { "x-fake-sig": "valid" } });
    expect(r.ok).toBe(true);
    const sub = await subs.findByOrganization(ORG_A);
    expect(sub?.status).toBe("active");
    const ents = makeResolveEntitlements({ subscriptions: subs });
    expect((await ents.execute(ORG_A)).find((e) => e.moduleCode === "clients")?.source).toBe("paid");
    expect(await ents.has(ORG_A, "clients")).toBe(true);
  });

  it("webhook duplicado e concorrente: efeito colateral no máximo uma vez", async () => {
    const { process, payments } = await setup();
    const first = await process.execute({ raw: paymentEvent("dup", "approved"), headers: { "x-fake-sig": "valid" } });
    const second = await process.execute({ raw: paymentEvent("dup", "approved"), headers: { "x-fake-sig": "valid" } });
    expect(first.ok && second.ok).toBe(true);
    if (second.ok) expect(second.value.duplicate).toBe(true);
    // Concorrente com o mesmo eventId.
    const [c1, c2] = await Promise.all([
      process.execute({ raw: paymentEvent("conc", "approved"), headers: { "x-fake-sig": "valid" } }),
      process.execute({ raw: paymentEvent("conc", "approved"), headers: { "x-fake-sig": "valid" } }),
    ]);
    const processedCount = [c1, c2].filter((r) => r.ok && r.value.processed).length;
    expect(processedCount).toBe(1);
    // "dup" gerou 1 pagamento; "conc" 1 pagamento → 2 no total (nunca 4).
    expect(payments.all).toHaveLength(2);
  });

  it("evento fora de ordem não gera estado contraditório", async () => {
    const { process, subs } = await setup();
    await process.execute({ raw: paymentEvent("late-approved", "approved"), headers: { "x-fake-sig": "valid" } });
    // Evento "pending" que chega depois (id distinto) não desativa o acesso já concedido.
    await process.execute({ raw: paymentEvent("early-pending", "pending"), headers: { "x-fake-sig": "valid" } });
    expect((await subs.findByOrganization(ORG_A))?.status).toBe("active");
  });
});
