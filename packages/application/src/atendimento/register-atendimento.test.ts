import { describe, expect, it } from "vitest";
import type { Atendimento, CreateAtendimentoInput } from "@britus/contracts";
import { makeRegisterAtendimento, type AtendimentoRepository } from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ATEND_ID = "01920000-0000-7000-8000-0000000000aa";

function fakeRepo(): AtendimentoRepository & { readonly created: Atendimento[] } {
  const created: Atendimento[] = [];
  return {
    created,
    async create(organizationId, input: CreateAtendimentoInput): Promise<Atendimento> {
      const now = new Date();
      const atendimento: Atendimento = {
        id: ATEND_ID,
        organizationId,
        clientId: input.clientId,
        status: "novo",
        summary: input.summary,
        conflictFlag: input.conflictFlag ?? false,
        firstContactAt: now,
        lastRelevantInteractionAt: now,
        createdAt: now,
        updatedAt: now,
      };
      created.push(atendimento);
      return atendimento;
    },
  };
}

describe("makeRegisterAtendimento (tenant-aware)", () => {
  it("registra atendimento em 'novo' com o organizationId do comando", async () => {
    const repo = fakeRepo();
    const result = await makeRegisterAtendimento({ atendimentos: repo }).execute({
      organizationId: ORG_A,
      input: { channelOrigin: "whatsapp" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("novo");
      expect(result.value.organizationId).toBe(ORG_A);
    }
    expect(repo.created).toHaveLength(1);
  });

  it("rejeita entrada inválida com VALIDATION_ERROR", async () => {
    const result = await makeRegisterAtendimento({ atendimentos: fakeRepo() }).execute({
      organizationId: ORG_A,
      input: { channelOrigin: 123 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });
});
