import { describe, expect, it } from "vitest";
import type { Organization, User, OrganizationMembership } from "@britus/contracts";
import {
  makeBootstrapFirstOrganization,
  type BootstrapLedger,
  type BootstrapRecord,
  type OrganizationDirectory,
  type OperatorDirectory,
  type MembershipDirectory,
} from "../index.js";

const ORG_ID = "01920000-0000-7000-8000-000000000001";
const USER_ID = "01920000-0000-7000-8000-000000000002";

function directories() {
  const ledgerMap = new Map<string, BootstrapRecord>();
  const orgs: Organization[] = [];
  const users: User[] = [];
  const memberships: OrganizationMembership[] = [];

  const ledger: BootstrapLedger = {
    async findByInstallationId(id) {
      return ledgerMap.get(id) ?? null;
    },
    async record(entry) {
      ledgerMap.set(entry.installationId, entry);
    },
  };
  const organizations: OrganizationDirectory = {
    async create({ name }) {
      const now = new Date();
      const org: Organization = { id: ORG_ID, name, status: "active", createdAt: now, updatedAt: now };
      orgs.push(org);
      return org;
    },
  };
  const operators: OperatorDirectory = {
    async create({ name, email }) {
      const now = new Date();
      const user: User = { id: USER_ID, name, email, status: "active", createdAt: now, updatedAt: now };
      users.push(user);
      return user;
    },
  };
  const membershipDir: MembershipDirectory = {
    async create({ userId, role }) {
      const m: OrganizationMembership = { id: `${userId}:${role}`, userId, role };
      memberships.push(m);
      return m;
    },
  };

  return { ledger, organizations, operators, memberships: membershipDir, state: { orgs, users, memberships } };
}

// PII (e-mail) fornecida no teste apenas como dado de configuração — não é credencial.
const config = {
  installationId: "britus-pilot-0001",
  organization: { name: "Britus Advocacia" },
  operator: { name: "Ricardo", email: "ricardo@example.test", roles: ["owner", "lawyer"] as const },
};

describe("makeBootstrapFirstOrganization (idempotente por installationId)", () => {
  it("provisiona organização, operador e vínculos (owner + lawyer) na primeira execução", async () => {
    const d = directories();
    const result = await makeBootstrapFirstOrganization(d).execute(config);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.alreadyBootstrapped).toBe(false);
      expect(result.value.installationId).toBe("britus-pilot-0001");
      expect(result.value.memberships.map((m) => m.role)).toEqual(["owner", "lawyer"]);
    }
    expect(d.state.orgs).toHaveLength(1);
    expect(d.state.users).toHaveLength(1);
    expect(d.state.memberships).toHaveLength(2);
  });

  it("reexecução não duplica organização, usuário ou vínculos", async () => {
    const d = directories();
    const useCase = makeBootstrapFirstOrganization(d);
    await useCase.execute(config);
    const second = await useCase.execute(config);

    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.alreadyBootstrapped).toBe(true);
    expect(d.state.orgs).toHaveLength(1);
    expect(d.state.users).toHaveLength(1);
    expect(d.state.memberships).toHaveLength(2);
  });

  it("idempotência independe do nome — renomear a organização não recria a instalação", async () => {
    const d = directories();
    const useCase = makeBootstrapFirstOrganization(d);
    await useCase.execute(config);
    const renamed = await useCase.execute({ ...config, organization: { name: "Britus Sociedade de Advogados" } });

    expect(renamed.ok).toBe(true);
    if (renamed.ok) expect(renamed.value.alreadyBootstrapped).toBe(true);
    expect(d.state.orgs).toHaveLength(1);
  });

  it("rejeita configuração inválida (sem installationId)", async () => {
    const d = directories();
    const result = await makeBootstrapFirstOrganization(d).execute({
      organization: { name: "X" },
      operator: { name: "R", email: "r@example.test", roles: ["owner"] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});
