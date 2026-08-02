import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ok,
  err,
  forbiddenError,
  type BillingProviderGateway,
  type NormalizedBillingEvent,
} from "@britus/application";

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Provider FAKE — operacional e TESTÁVEL. Assinatura HMAC-SHA256 REAL sobre o corpo bruto;
// o corpo é o evento normalizado (carrega o pagamento). Segredo por configuração externa.
export function createFakeGateway(secret: string): BillingProviderGateway {
  return {
    provider: "fake",
    verifyAndParse(raw, headers) {
      if (secret.length === 0)
        return err(forbiddenError("segredo do provedor ausente (fail-closed)"));
      const sig = headers["x-fake-signature"];
      if (typeof sig !== "string") return err(forbiddenError("assinatura ausente"));
      const expected = createHmac("sha256", secret).update(raw).digest("hex");
      if (!safeEqual(expected, sig)) return err(forbiddenError("assinatura inválida"));
      try {
        return ok(JSON.parse(raw) as NormalizedBillingEvent);
      } catch {
        return err(forbiddenError("payload inválido"));
      }
    },
  };
}

// MercadoPago — verificação de assinatura REAL (formato `x-signature` ts=/v1= + manifest),
// FAIL-CLOSED sem segredo (adaptado do SIR). A resolução completa do pagamento (amount/status
// via API MP) depende de credenciais e é FUTURA — NÃO é simulada; sem `payment`, o evento é
// apenas registrado (nenhuma ativação sem entitlement derivado).
export function createMercadoPagoGateway(
  secret: string,
  accessToken: string,
): BillingProviderGateway {
  return {
    provider: "mercadopago",
    async verifyAndParse(raw, headers) {
      if (secret.length === 0)
        return err(forbiddenError("MERCADOPAGO_WEBHOOK_SECRET ausente (fail-closed)"));
      if (accessToken.length === 0)
        return err(forbiddenError("MP_ACCESS_TOKEN ausente (fail-closed)"));
      const xSignature = headers["x-signature"];
      const xRequestId = headers["x-request-id"] ?? "";
      if (typeof xSignature !== "string") return err(forbiddenError("assinatura ausente"));
      const parts = xSignature.split(",");
      const ts = parts.find((p) => p.startsWith("ts="))?.slice(3);
      const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
      if (ts === undefined || v1 === undefined) return err(forbiddenError("assinatura malformada"));
      let body: { data?: { id?: unknown }; type?: unknown; id?: unknown };
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        return err(forbiddenError("payload inválido"));
      }
      const dataId = String(body.data?.id ?? "");
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const expected = createHmac("sha256", secret).update(manifest).digest("hex");
      if (!safeEqual(expected, v1)) return err(forbiddenError("assinatura inválida"));
      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      if (!response.ok)
        return err(forbiddenError("Não foi possível validar o pagamento no Mercado Pago"));
      const payment = (await response.json()) as {
        id?: unknown;
        status?: unknown;
        transaction_amount?: unknown;
        currency_id?: unknown;
        external_reference?: unknown;
        metadata?: { plan?: unknown };
      };
      const organizationId =
        typeof payment.external_reference === "string" ? payment.external_reference : "";
      if (!organizationId) return err(forbiddenError("Pagamento sem referência da organização"));
      const status =
        payment.status === "approved"
          ? "approved"
          : payment.status === "rejected" || payment.status === "cancelled"
            ? "rejected"
            : "pending";
      return ok({
        externalEventId: String(body.id ?? dataId),
        type: String(body.type ?? "payment"),
        payment: {
          externalPaymentId: String(payment.id ?? dataId),
          amountCents: Math.round(Number(payment.transaction_amount ?? 0) * 100),
          currency: payment.currency_id === "BRL" ? "BRL" : "BRL",
          status,
          organizationId,
          periodDays: payment.metadata?.plan === "annual" ? 365 : 30,
        },
      });
    },
  };
}
