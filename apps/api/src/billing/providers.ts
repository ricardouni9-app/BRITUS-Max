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
      if (secret.length === 0) return err(forbiddenError("segredo do provedor ausente (fail-closed)"));
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
export function createMercadoPagoGateway(secret: string): BillingProviderGateway {
  return {
    provider: "mercadopago",
    verifyAndParse(raw, headers) {
      if (secret.length === 0) return err(forbiddenError("MERCADOPAGO_WEBHOOK_SECRET ausente (fail-closed)"));
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
      return ok({ externalEventId: String(body.id ?? dataId), type: String(body.type ?? "payment") });
    },
  };
}
