import type { FastifyRequest } from "fastify";
import type { Authenticator } from "@britus/application";
import { readSessionCookie } from "../auth/cookie.js";
import { toHttpError } from "./error-map.js";

export type OrgResolution =
  | { ok: true; organizationId: string }
  | { ok: false; status: number; body: unknown };

// Deriva a organização ativa 100% no servidor a partir da sessão (cookie httpOnly).
// Para mutações, valida CSRF (double-submit) contra a sessão. Nunca confia no corpo/cliente.
export async function resolveActiveOrg(
  auth: Authenticator,
  request: FastifyRequest,
  mutation: boolean,
): Promise<OrgResolution> {
  const token = readSessionCookie(request);
  if (token === null) return { ok: false, status: 401, body: { error: { code: "UNAUTHENTICATED", message: "Sessão ausente" } } };
  const authed = await auth.authenticate(token);
  if (!authed.ok) return { ok: false, status: 401, body: toHttpError(authed.error).body };
  const session = authed.value;
  if (session.subjectType !== "user") return { ok: false, status: 403, body: { error: { code: "FORBIDDEN", message: "Contexto organizacional requerido" } } };
  if (mutation) {
    const csrf = request.headers["x-csrf-token"];
    if (session.csrfToken !== (typeof csrf === "string" ? csrf : "")) {
      return { ok: false, status: 403, body: { error: { code: "FORBIDDEN", message: "Falha de verificação CSRF" } } };
    }
  }
  const organizationId = session.activeOrganizationId ?? null;
  if (organizationId === null) return { ok: false, status: 400, body: { error: { code: "VALIDATION_ERROR", message: "Selecione a organização ativa" } } };
  return { ok: true, organizationId };
}
