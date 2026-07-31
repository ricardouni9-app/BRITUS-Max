import { createCaseTaskInputSchema, type CaseTask } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, notFoundError, conflictError, forbiddenError, type ApplicationError } from "../errors.js";
import type {
  CaseTaskRepository,
  CaseReader,
  EntitlementChecker,
  DashboardReader,
  DashboardSummary,
} from "./ports.js";
import { CASES_MODULE } from "./ports.js";

export interface CreateCaseTaskDeps {
  readonly tasks: CaseTaskRepository;
  readonly cases: CaseReader;
  readonly entitlements: EntitlementChecker;
}

// Cria tarefa/prazo em um Caso. Exige ENTITLEMENT ativo do módulo (SaaS), valida a existência
// do Caso NA ORGANIZAÇÃO (tenancy/cross-tenant) e nasce sempre org-scoped.
export function makeCreateCaseTask(deps: CreateCaseTaskDeps) {
  return {
    async execute(input: {
      organizationId: string;
      caseId: string;
      input: unknown;
    }): Promise<Result<CaseTask, ApplicationError>> {
      const parsed = createCaseTaskInputSchema.safeParse(input.input);
      if (!parsed.success) {
        return err(validationError("Dados de tarefa inválidos"));
      }
      if (!(await deps.entitlements.has(input.organizationId, CASES_MODULE))) {
        return err(forbiddenError("Módulo de casos não contratado ou inativo"));
      }
      const found = await deps.cases.findById(input.organizationId, input.caseId);
      if (found === null) {
        return err(notFoundError("Caso não encontrado nesta organização"));
      }
      const data = parsed.data;
      const task = await deps.tasks.create(input.organizationId, input.caseId, {
        kind: data.kind,
        title: data.title,
        description: data.description,
        assignedUserId: data.assignedUserId,
        dueAt: data.dueAt !== undefined ? new Date(data.dueAt) : null,
      });
      return ok(task);
    },
  };
}

export interface ListCaseTasksDeps {
  readonly tasks: CaseTaskRepository;
  readonly cases: CaseReader;
}
export function makeListCaseTasks(deps: ListCaseTasksDeps) {
  return {
    async execute(input: {
      organizationId: string;
      caseId: string;
    }): Promise<Result<readonly CaseTask[], ApplicationError>> {
      const found = await deps.cases.findById(input.organizationId, input.caseId);
      if (found === null) {
        return err(notFoundError("Caso não encontrado nesta organização"));
      }
      return ok(await deps.tasks.listByCase(input.organizationId, input.caseId));
    },
  };
}

export interface CompleteCaseTaskDeps {
  readonly tasks: CaseTaskRepository;
  readonly now?: () => Date;
}
export function makeCompleteCaseTask(deps: CompleteCaseTaskDeps) {
  const clock = deps.now ?? ((): Date => new Date());
  return {
    async execute(input: {
      organizationId: string;
      taskId: string;
    }): Promise<Result<CaseTask, ApplicationError>> {
      const task = await deps.tasks.findById(input.organizationId, input.taskId);
      if (task === null) {
        return err(notFoundError("Tarefa não encontrada nesta organização"));
      }
      if (task.status !== "open") {
        return err(conflictError("Tarefa não está aberta"));
      }
      const now = clock();
      return ok(await deps.tasks.save({ ...task, status: "done", completedAt: now, updatedAt: now }));
    },
  };
}

export interface DashboardDeps {
  readonly dashboard: DashboardReader;
  readonly now?: () => Date;
}
// Dashboard operacional básico — contagens org-scoped derivadas server-side.
export function makeCaseDashboard(deps: DashboardDeps) {
  const clock = deps.now ?? ((): Date => new Date());
  return {
    async execute(organizationId: string): Promise<DashboardSummary> {
      return deps.dashboard.summary(organizationId, clock());
    },
  };
}
