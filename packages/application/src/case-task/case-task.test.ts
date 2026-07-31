import { describe, expect, it } from "vitest";
import type { Case } from "@britus/contracts";
import {
  makeCreateCaseTask,
  makeListCaseTasks,
  makeCompleteCaseTask,
  createInMemoryCaseTaskStore,
  type CaseReader,
  type EntitlementChecker,
} from "../index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const CASE_A = "01920000-0000-7000-8000-0000000000ca";
const USER = "01920000-0000-7000-8000-000000000001";

function caseReader(): CaseReader {
  const now = new Date();
  const c: Case = {
    id: CASE_A,
    organizationId: ORG_A,
    areaId: ORG_A,
    workTypeId: ORG_A,
    title: "Caso",
    status: "triagem",
    financialClassification: "medio",
    createdAt: now,
    updatedAt: now,
  };
  return {
    async findById(organizationId, caseId) {
      return caseId === CASE_A && organizationId === ORG_A ? c : null;
    },
  };
}

const entitled: EntitlementChecker = { async has() { return true; } };
const notEntitled: EntitlementChecker = { async has() { return false; } };

const validInput = { kind: "task", title: "Protocolar petição" };

describe("case-task — criação (entitlement + tenancy)", () => {
  it("cria tarefa quando entitled e caso existe na org", async () => {
    const tasks = createInMemoryCaseTaskStore();
    const uc = makeCreateCaseTask({ tasks, cases: caseReader(), entitlements: entitled });
    const res = await uc.execute({ organizationId: ORG_A, caseId: CASE_A, input: validInput });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.organizationId).toBe(ORG_A);
      expect(res.value.status).toBe("open");
    }
  });

  it("bloqueia sem entitlement do módulo (FORBIDDEN)", async () => {
    const uc = makeCreateCaseTask({ tasks: createInMemoryCaseTaskStore(), cases: caseReader(), entitlements: notEntitled });
    const res = await uc.execute({ organizationId: ORG_A, caseId: CASE_A, input: validInput });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("FORBIDDEN");
  });

  it("caso de outra organização → NOT_FOUND (não vaza existência)", async () => {
    const uc = makeCreateCaseTask({ tasks: createInMemoryCaseTaskStore(), cases: caseReader(), entitlements: entitled });
    const res = await uc.execute({ organizationId: ORG_B, caseId: CASE_A, input: validInput });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("NOT_FOUND");
  });

  it("prazo (deadline) sem dueAt → VALIDATION_ERROR", async () => {
    const uc = makeCreateCaseTask({ tasks: createInMemoryCaseTaskStore(), cases: caseReader(), entitlements: entitled });
    const res = await uc.execute({ organizationId: ORG_A, caseId: CASE_A, input: { kind: "deadline", title: "Prazo recursal" } });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("VALIDATION_ERROR");
  });

  it("aceita prazo com dueAt e responsável", async () => {
    const tasks = createInMemoryCaseTaskStore();
    const uc = makeCreateCaseTask({ tasks, cases: caseReader(), entitlements: entitled });
    const res = await uc.execute({ organizationId: ORG_A, caseId: CASE_A, input: { kind: "deadline", title: "Contestação", dueAt: "2026-08-01T12:00:00.000Z", assignedUserId: USER } });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value.kind).toBe("deadline");
      expect(res.value.dueAt).toBeInstanceOf(Date);
      expect(res.value.assignedUserId).toBe(USER);
    }
  });
});

describe("case-task — listagem e conclusão", () => {
  it("lista por caso; conclui tarefa aberta; recusa reconclusão; isola por org", async () => {
    const tasks = createInMemoryCaseTaskStore();
    const create = makeCreateCaseTask({ tasks, cases: caseReader(), entitlements: entitled });
    const created = await create.execute({ organizationId: ORG_A, caseId: CASE_A, input: validInput });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const list = makeListCaseTasks({ tasks, cases: caseReader() });
    const listed = await list.execute({ organizationId: ORG_A, caseId: CASE_A });
    expect(listed.ok && listed.value.length === 1).toBe(true);

    const complete = makeCompleteCaseTask({ tasks });
    const done = await complete.execute({ organizationId: ORG_A, taskId: created.value.id });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(done.value.status).toBe("done");
      expect(done.value.completedAt).toBeInstanceOf(Date);
    }
    // Reconclusão → CONFLICT.
    const again = await complete.execute({ organizationId: ORG_A, taskId: created.value.id });
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("CONFLICT");
    // Outra org não enxerga a tarefa.
    const cross = await complete.execute({ organizationId: ORG_B, taskId: created.value.id });
    expect(cross.ok).toBe(false);
    if (!cross.ok) expect(cross.error.code).toBe("NOT_FOUND");
  });
});
