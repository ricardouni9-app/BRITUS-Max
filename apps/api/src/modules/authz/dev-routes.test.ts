import { describe, expect, it } from "vitest";
import { apiErrorSchema, uuidSchema } from "@britus/contracts";
import { buildApp } from "../../app.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const USER = "01920000-0000-7000-8000-000000000001";

function contextHeader(
  memberships: Array<{ organizationId: string; role: string }>,
  organizationId = ORG_A,
): string {
  return JSON.stringify({ identityType: "organization_user", userId: USER, memberships, organizationId });
}
const withMembership = contextHeader([{ organizationId: ORG_A, role: "lawyer" }]);
const withoutMembership = contextHeader([]);

describe("POST /__dev/authorized/* (isolamento organizacional — mecanismo de teste/dev)", () => {
  it("cria cliente com organizationId derivado do CONTEXTO (rota só transporta)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      headers: { "x-dev-authz-context": withMembership },
      payload: { personType: "pf", displayName: "Ricardo Advogado" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.organizationId).toBe(ORG_A);
    expect(uuidSchema.safeParse(body.id).success).toBe(true);
    await app.close();
  });

  it("organizationId enviado no CORPO não é aceito (strictObject → 400)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      headers: { "x-dev-authz-context": withMembership },
      payload: { personType: "pf", displayName: "Ricardo", organizationId: ORG_B },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("nega criação sem membership na organização-alvo (403 FORBIDDEN)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      headers: { "x-dev-authz-context": withoutMembership },
      payload: { personType: "pf", displayName: "X" },
    });
    expect(res.statusCode).toBe(403);
    expect(apiErrorSchema.parse(res.json()).error.code).toBe("FORBIDDEN");
    await app.close();
  });

  it("rejeita ausência do contexto de identidade de teste (400)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const res = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      payload: { personType: "pf", displayName: "X" },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("percorre o workflow autorizado na mesma organização (atendimento → conversão → caso)", async () => {
    const app = buildApp({ enableTestRoutes: true });
    const headers = { "x-dev-authz-context": withMembership };

    const at = await app.inject({
      method: "POST",
      url: "/__dev/authorized/atendimentos",
      headers,
      payload: { channelOrigin: "indicacao" },
    });
    expect(at.statusCode).toBe(201);
    const atendimentoId = at.json().id as string;
    expect(at.json().organizationId).toBe(ORG_A);

    const conv = await app.inject({
      method: "POST",
      url: `/__dev/authorized/atendimentos/${atendimentoId}/conversion`,
      headers,
      payload: { personType: "pf", displayName: "Ricardo", cpf: "12345678901" },
    });
    expect(conv.statusCode).toBe(201);
    expect(conv.json().atendimento.organizationId).toBe(ORG_A);

    const cs = await app.inject({
      method: "POST",
      url: "/__dev/authorized/cases",
      headers,
      payload: { atendimentoId, areaId: ORG_A, workTypeId: ORG_A, title: "Caso", financialClassification: "alto" },
    });
    expect(cs.statusCode).toBe(201);
    expect(cs.json().organizationId).toBe(ORG_A);
    expect(cs.json().atendimentoId).toBe(atendimentoId);
    await app.close();
  });

  it("rota __dev indisponível quando enableTestRoutes está desabilitado (404)", async () => {
    const app = buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/__dev/authorized/clients",
      headers: { "x-dev-authz-context": withMembership },
      payload: { personType: "pf", displayName: "X" },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
