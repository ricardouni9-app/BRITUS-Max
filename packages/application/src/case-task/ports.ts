import type { CaseTask, Case, CaseTaskKind } from "@britus/contracts";

// Módulo do catálogo que habilita a operação de casos/tarefas (gating por entitlement).
export const CASES_MODULE = "cases";

export interface NewCaseTask {
  readonly kind: CaseTaskKind;
  readonly title: string;
  readonly description?: string;
  readonly assignedUserId?: string;
  readonly dueAt: Date | null;
}

// Persistência de tarefas/prazos — SEMPRE org-scoped.
export interface CaseTaskRepository {
  create(organizationId: string, caseId: string, input: NewCaseTask): Promise<CaseTask>;
  listByCase(organizationId: string, caseId: string): Promise<readonly CaseTask[]>;
  findById(organizationId: string, taskId: string): Promise<CaseTask | null>;
  save(task: CaseTask): Promise<CaseTask>;
}

// Leitura de Caso org-scoped (valida existência/tenancy antes de operar tarefas).
export interface CaseReader {
  findById(organizationId: string, caseId: string): Promise<Case | null>;
}

// Verificação de entitlement (acesso derivado de assinatura/entitlement, NUNCA do gateway).
export interface EntitlementChecker {
  has(organizationId: string, moduleCode: string): Promise<boolean>;
}

export interface DashboardSummary {
  readonly openCases: number;
  readonly openTasks: number;
  readonly overdueDeadlines: number;
}
export interface DashboardReader {
  summary(organizationId: string, at: Date): Promise<DashboardSummary>;
}
