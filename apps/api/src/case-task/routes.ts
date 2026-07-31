import type { FastifyInstance, FastifyReply } from "fastify";
import type { Authenticator, Result, ApplicationError, DashboardSummary } from "@britus/application";
import type { CaseTask } from "@britus/contracts";
import { toHttpError } from "../http/error-map.js";
import { resolveActiveOrg } from "../http/session-context.js";

type Exec<I, O> = { execute(input: I): Promise<Result<O, ApplicationError>> };

export interface WorkflowRoutesDeps {
  readonly authenticator: Authenticator;
  readonly createCaseTask: Exec<{ organizationId: string; caseId: string; input: unknown }, CaseTask>;
  readonly listCaseTasks: Exec<{ organizationId: string; caseId: string }, readonly CaseTask[]>;
  readonly completeCaseTask: Exec<{ organizationId: string; taskId: string }, CaseTask>;
  readonly dashboard: { execute(organizationId: string): Promise<DashboardSummary> };
}

export function registerWorkflowRoutes(app: FastifyInstance, deps: WorkflowRoutesDeps): void {
  async function respond<O>(reply: FastifyReply, r: Result<O, ApplicationError>, okStatus: number): Promise<void> {
    if (r.ok) {
      await reply.status(okStatus).send(r.value);
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  }

  app.post("/cases/:caseId/tasks", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, true);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const { caseId } = request.params as { caseId: string };
    await respond(reply, await deps.createCaseTask.execute({ organizationId: org.organizationId, caseId, input: request.body }), 201);
  });

  app.get("/cases/:caseId/tasks", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, false);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const { caseId } = request.params as { caseId: string };
    const r = await deps.listCaseTasks.execute({ organizationId: org.organizationId, caseId });
    if (r.ok) {
      await reply.status(200).send({ tasks: r.value });
      return;
    }
    const e = toHttpError(r.error);
    await reply.status(e.statusCode).send(e.body);
  });

  app.post("/tasks/:taskId/complete", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, true);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    const { taskId } = request.params as { taskId: string };
    await respond(reply, await deps.completeCaseTask.execute({ organizationId: org.organizationId, taskId }), 200);
  });

  app.get("/dashboard", async (request, reply) => {
    const org = await resolveActiveOrg(deps.authenticator, request, false);
    if (!org.ok) {
      await reply.status(org.status).send(org.body);
      return;
    }
    await reply.status(200).send(await deps.dashboard.execute(org.organizationId));
  });
}
