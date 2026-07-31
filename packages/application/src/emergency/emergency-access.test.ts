import { describe, expect, it } from "vitest";
import type { EmergencyAccessGrant, AuthorizationContext } from "@britus/contracts";
import {
  makeRequestEmergencyAccess,
  makeEndEmergencyAccess,
  makeCheckEmergencyAccess,
  createInMemoryAuditLog,
  type EmergencyAccessStore,
  type NewEmergencyAccessGrant,
  type AuditLog,
} from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const USER = "01920000-0000-7000-8000-000000000001";
const CREATOR = "01920000-0000-7000-8000-0000000000c0";

function grantStore(): EmergencyAccessStore {
  const items = new Map<string, EmergencyAccessGrant>();
  let seq = 0;
  return {
    async create(input: NewEmergencyAccessGrant): Promise<EmergencyAccessGrant> {
      const now = new Date();
      const id = `01920000-0000-7000-8000-0000000${String(++seq).padStart(5, "0")}`;
      const grant: EmergencyAccessGrant = { ...input, id, createdAt: now, updatedAt: now };
      items.set(id, grant);
      return grant;
    },
    async findById(id) {
      return items.get(id) ?? null;
    },
    async save(grant) {
      items.set(grant.id, grant);
      return grant;
    },
  };
}

const creatorCtx: AuthorizationContext = {
  identityType: "platform_creator",
  platformIdentityId: CREATOR,
  memberships: [],
  emergencyScopes: [],
  action: "emergency_access.start",
  organizationId: ORG_A,
};

const orgUserCtx: AuthorizationContext = {
  identityType: "organization_user",
  userId: USER,
  memberships: [{ organizationId: ORG_A, role: "owner" }],
  emergencyScopes: [],
  action: "emergency_access.start",
  organizationId: ORG_A,
};

const validInput = {
  organizationId: ORG_A,
  purpose: "manutenção técnica",
  justification: "corrigir índice corrompido no atendimento",
  scope: ["case"],
  durationMinutes: 60,
};

function build(): {
  request: ReturnType<typeof makeRequestEmergencyAccess>;
  end: ReturnType<typeof makeEndEmergencyAccess>;
  check: ReturnType<typeof makeCheckEmergencyAccess>;
  audit: AuditLog;
} {
  const audit = createInMemoryAuditLog();
  const grants = grantStore();
  return {
    request: makeRequestEmergencyAccess({ grants, audit }),
    end: makeEndEmergencyAccess({ grants, audit }),
    check: makeCheckEmergencyAccess({ grants, audit }),
    audit,
  };
}

describe("acesso emergencial", () => {
  it("concede acesso válido (ativo, com início e expiração) e audita", async () => {
    const { request, audit } = build();
    const res = await request.execute({ context: creatorCtx, input: validInput });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.status).toBe("active");
      expect(res.value.startedAt).toBeInstanceOf(Date);
      expect(res.value.endsAt.getTime()).toBeGreaterThan(res.value.startedAt!.getTime());
      expect(res.value.scope).toEqual(["case"]);
    }
    expect((await audit.list()).some((e) => e.decision === "allow")).toBe(true);
  });

  it("rejeita ausência de justificativa (VALIDATION_ERROR)", async () => {
    const { request } = build();
    const res = await request.execute({ context: creatorCtx, input: { ...validInput, justification: "" } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejeita operador não autorizado (FORBIDDEN) e audita deny", async () => {
    const { request, audit } = build();
    const res = await request.execute({ context: orgUserCtx, input: validInput });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
    expect((await audit.list()).some((e) => e.decision === "deny")).toBe(true);
  });

  it("rejeita duração inválida (VALIDATION_ERROR)", async () => {
    const { request } = build();
    const res = await request.execute({ context: creatorCtx, input: { ...validInput, durationMinutes: 0 } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("permite uso dentro do prazo e escopo; nega fora do escopo", async () => {
    const { request, check } = build();
    const granted = await request.execute({ context: creatorCtx, input: validInput });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;

    const inScope = await check.execute({ grantId: granted.value.id, resourceType: "case" });
    expect(inScope.ok).toBe(true);

    const outOfScope = await check.execute({ grantId: granted.value.id, resourceType: "organization" });
    expect(outOfScope.ok).toBe(false);
    if (!outOfScope.ok) expect(outOfScope.error.code).toBe("FORBIDDEN");
  });

  it("nega uso após revogação e após expiração", async () => {
    const { request, end, check } = build();
    const granted = await request.execute({ context: creatorCtx, input: validInput });
    expect(granted.ok).toBe(true);
    if (!granted.ok) return;
    const grantId = granted.value.id;

    // Expiração: uso em instante posterior à validade.
    const afterExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const expired = await check.execute({ grantId, resourceType: "case", at: afterExpiry });
    expect(expired.ok).toBe(false);

    // Revogação explícita → uso subsequente negado.
    const revoked = await end.execute({ context: creatorCtx, grantId, mode: "revoked" });
    expect(revoked.ok).toBe(true);
    if (revoked.ok) expect(revoked.value.status).toBe("revoked");
    const afterRevoke = await check.execute({ grantId, resourceType: "case" });
    expect(afterRevoke.ok).toBe(false);
  });

  it("trilha é append-only e cresce a cada decisão (sem remoção)", async () => {
    const { request, check, audit } = build();
    const before = (await audit.list()).length;
    const granted = await request.execute({ context: creatorCtx, input: validInput });
    if (granted.ok) await check.execute({ grantId: granted.value.id, resourceType: "case" });
    const after = (await audit.list()).length;
    expect(after).toBeGreaterThan(before);
    // A interface AuditLog não expõe remoção/atualização destrutiva (garantia de contrato).
  });
});
