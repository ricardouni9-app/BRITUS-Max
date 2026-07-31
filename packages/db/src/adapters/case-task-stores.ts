import { and, eq, sql, inArray, lt } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Case, CaseTask } from "@britus/contracts";
import type { CaseReader, CaseTaskRepository, DashboardReader, DashboardSummary, NewCaseTask } from "@britus/application";
import { cases, type CaseRow } from "../schema/cases.js";
import { caseTasks, type CaseTaskRow } from "../schema/case-tasks.js";
import { PersistenceError, translatePersistenceError } from "./errors.js";

function toCase(r: CaseRow): Case {
  return {
    id: r.id,
    organizationId: r.organizationId,
    atendimentoId: r.atendimentoId,
    areaId: r.areaId,
    workTypeId: r.workTypeId,
    title: r.title,
    status: r.status,
    financialClassification: r.financialClassification,
    processNumber: r.processNumber,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}
function toTask(r: CaseTaskRow): CaseTask {
  return {
    id: r.id,
    organizationId: r.organizationId,
    caseId: r.caseId,
    kind: r.kind,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status,
    assignedUserId: r.assignedUserId,
    dueAt: r.dueAt,
    completedAt: r.completedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

// Leitura de Caso org-scoped (tenancy) — usada para validar o Caso antes de operar tarefas.
export function createDrizzleCaseReader(db: NodePgDatabase): CaseReader {
  return {
    async findById(organizationId, caseId) {
      try {
        const [row] = await db.select().from(cases).where(and(eq(cases.id, caseId), eq(cases.organizationId, organizationId))).limit(1);
        return row === undefined ? null : toCase(row);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
  };
}

export function createDrizzleCaseTaskStore(db: NodePgDatabase): CaseTaskRepository {
  return {
    async create(organizationId, caseId, input: NewCaseTask) {
      try {
        const [row] = await db
          .insert(caseTasks)
          .values({ organizationId, caseId, kind: input.kind, title: input.title, description: input.description, assignedUserId: input.assignedUserId, dueAt: input.dueAt })
          .returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Falha ao criar tarefa");
        return toTask(row);
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
    async listByCase(organizationId, caseId) {
      try {
        return (await db.select().from(caseTasks).where(and(eq(caseTasks.organizationId, organizationId), eq(caseTasks.caseId, caseId)))).map(toTask);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async findById(organizationId, taskId) {
      try {
        const [row] = await db.select().from(caseTasks).where(and(eq(caseTasks.id, taskId), eq(caseTasks.organizationId, organizationId))).limit(1);
        return row === undefined ? null : toTask(row);
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
    async save(task) {
      try {
        const [row] = await db
          .update(caseTasks)
          .set({ status: task.status, completedAt: task.completedAt ?? null, title: task.title, description: task.description ?? null, assignedUserId: task.assignedUserId ?? null, dueAt: task.dueAt ?? null })
          .where(and(eq(caseTasks.id, task.id), eq(caseTasks.organizationId, task.organizationId)))
          .returning();
        if (row === undefined) throw new PersistenceError("INTERNAL_SERVER_ERROR", "Tarefa não encontrada");
        return toTask(row);
      } catch (e) {
        if (e instanceof PersistenceError) throw e;
        throw translatePersistenceError(e);
      }
    },
  };
}

// Dashboard operacional — contagens org-scoped, derivadas server-side.
export function createDrizzleDashboardReader(db: NodePgDatabase): DashboardReader {
  const countOf = async (rows: Promise<{ n: number }[]>): Promise<number> => {
    const [r] = await rows;
    return Number(r?.n ?? 0);
  };
  return {
    async summary(organizationId, at): Promise<DashboardSummary> {
      try {
        const openCases = await countOf(
          db.select({ n: sql<number>`count(*)::int` }).from(cases).where(and(eq(cases.organizationId, organizationId), inArray(cases.status, ["triagem", "ativo", "aguardando"]))),
        );
        const openTasks = await countOf(
          db.select({ n: sql<number>`count(*)::int` }).from(caseTasks).where(and(eq(caseTasks.organizationId, organizationId), eq(caseTasks.status, "open"))),
        );
        const overdueDeadlines = await countOf(
          db
            .select({ n: sql<number>`count(*)::int` })
            .from(caseTasks)
            .where(and(eq(caseTasks.organizationId, organizationId), eq(caseTasks.status, "open"), eq(caseTasks.kind, "deadline"), lt(caseTasks.dueAt, at))),
        );
        return { openCases, openTasks, overdueDeadlines };
      } catch (e) {
        throw translatePersistenceError(e);
      }
    },
  };
}
