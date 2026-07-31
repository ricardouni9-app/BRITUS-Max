import { describe, expect, it } from "vitest";
import type { Atendimento, Case, CreateCaseInput } from "@britus/contracts";
import { makeOpenCase, type CaseRepository, type AtendimentoLookup } from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const VALID_ID = "01920000-0000-7000-8000-000000000000";
const ATEND_A = "01920000-0000-7000-8000-0000000000aa";

const baseInput = {
  areaId: VALID_ID,
  workTypeId: VALID_ID,
  title: "Ação trabalhista",
  financialClassification: "medio" as const,
};

function fakeCaseRepo(): CaseRepository & { readonly created: Case[] } {
  const created: Case[] = [];
  return {
    created,
    async create(organizationId, input: CreateCaseInput): Promise<Case> {
      const now = new Date();
      const c: Case = {
        id: VALID_ID,
        organizationId,
        atendimentoId: input.atendimentoId,
        areaId: input.areaId,
        workTypeId: input.workTypeId,
        title: input.title,
        status: "triagem",
        financialClassification: input.financialClassification,
        createdAt: now,
        updatedAt: now,
      };
      created.push(c);
      return c;
    },
  };
}

// Lookup org-scoped: ATEND_A pertence exclusivamente à ORG_A.
function lookup(): AtendimentoLookup {
  return {
    async findById(organizationId, id) {
      if (id !== ATEND_A || organizationId !== ORG_A) return null;
      const now = new Date();
      const a: Atendimento = {
        id,
        organizationId: ORG_A,
        status: "qualificado",
        conflictFlag: false,
        firstContactAt: now,
        lastRelevantInteractionAt: now,
        createdAt: now,
        updatedAt: now,
      };
      return a;
    },
  };
}

describe("makeOpenCase (tenant-aware + cross-tenant)", () => {
  it("abre caso na organização, vinculado a atendimento da MESMA organização", async () => {
    const repo = fakeCaseRepo();
    const res = await makeOpenCase({ cases: repo, atendimentos: lookup() }).execute({
      organizationId: ORG_A,
      input: { ...baseInput, atendimentoId: ATEND_A },
    });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.organizationId).toBe(ORG_A);
      expect(res.value.status).toBe("triagem");
      expect(res.value.atendimentoId).toBe(ATEND_A);
    }
  });

  it("NEGA abrir caso a partir de atendimento de OUTRA organização → NOT_FOUND", async () => {
    const res = await makeOpenCase({ cases: fakeCaseRepo(), atendimentos: lookup() }).execute({
      organizationId: ORG_B,
      input: { ...baseInput, atendimentoId: ATEND_A },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NOT_FOUND");
  });

  it("abre caso direto (sem atendimento de origem)", async () => {
    const res = await makeOpenCase({ cases: fakeCaseRepo(), atendimentos: lookup() }).execute({
      organizationId: ORG_A,
      input: baseInput,
    });
    expect(res.ok).toBe(true);
  });

  it("rejeita entrada inválida com VALIDATION_ERROR", async () => {
    const res = await makeOpenCase({ cases: fakeCaseRepo(), atendimentos: lookup() }).execute({
      organizationId: ORG_A,
      input: { title: "" },
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR");
  });
});
