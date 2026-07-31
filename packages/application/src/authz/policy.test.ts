import { describe, expect, it } from "vitest";
import type { AuthorizationContext } from "@britus/contracts";
import { authorize } from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const USER = "01920000-0000-7000-8000-000000000001";
const CREATOR = "01920000-0000-7000-8000-0000000000c0";

function ctx(
  partial: Partial<AuthorizationContext> &
    Pick<AuthorizationContext, "identityType" | "action">,
): AuthorizationContext {
  return { memberships: [], emergencyScopes: [], ...partial };
}

describe("authorize (política reutilizável)", () => {
  it("permite ação organizacional a membro da organização-alvo", () => {
    const out = authorize(
      ctx({
        identityType: "organization_user",
        userId: USER,
        action: "client.create",
        organizationId: ORG_A,
        memberships: [{ organizationId: ORG_A, role: "lawyer" }],
      }),
    );
    expect(out.decision).toBe("allow");
  });

  it("nega ação organizacional sem membership na organização-alvo", () => {
    const out = authorize(
      ctx({
        identityType: "organization_user",
        userId: USER,
        action: "case.open",
        organizationId: ORG_A,
        memberships: [],
      }),
    );
    expect(out.decision).toBe("deny");
  });

  it("exige papel owner para organization.admin", () => {
    const asLawyer = authorize(
      ctx({
        identityType: "organization_user",
        userId: USER,
        action: "organization.admin",
        organizationId: ORG_A,
        memberships: [{ organizationId: ORG_A, role: "lawyer" }],
      }),
    );
    const asOwner = authorize(
      ctx({
        identityType: "organization_user",
        userId: USER,
        action: "organization.admin",
        organizationId: ORG_A,
        memberships: [{ organizationId: ORG_A, role: "owner" }],
      }),
    );
    expect(asLawyer.decision).toBe("deny");
    expect(asOwner.decision).toBe("allow");
  });

  it("permite ação global somente à identidade global (Criador)", () => {
    const out = authorize(
      ctx({ identityType: "platform_creator", platformIdentityId: CREATOR, action: "plans.manage" }),
    );
    expect(out.decision).toBe("allow");
  });

  it("nega ação global a owner organizacional (owner não confere poder global)", () => {
    const out = authorize(
      ctx({
        identityType: "organization_user",
        userId: USER,
        action: "pricing.manage",
        organizationId: ORG_A,
        memberships: [{ organizationId: ORG_A, role: "owner" }],
      }),
    );
    expect(out.decision).toBe("deny");
  });

  it("nega Criador em ação organizacional sem escopo emergencial", () => {
    const out = authorize(
      ctx({
        identityType: "platform_creator",
        platformIdentityId: CREATOR,
        action: "case.open",
        organizationId: ORG_A,
        resourceType: "case",
      }),
    );
    expect(out.decision).toBe("deny");
  });

  it("permite Criador em ação organizacional coberta por escopo emergencial ativo", () => {
    const out = authorize(
      ctx({
        identityType: "platform_creator",
        platformIdentityId: CREATOR,
        action: "case.open",
        organizationId: ORG_A,
        resourceType: "case",
        emergencyScopes: ["case"],
      }),
    );
    expect(out.decision).toBe("allow");
  });
});
