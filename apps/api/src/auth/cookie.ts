import type { FastifyReply, FastifyRequest } from "fastify";

// Cookie de sessão manual (sem dependência): httpOnly + SameSite=Lax + Path=/.
// `Secure` é aplicado quando o ambiente for HTTPS. Prepara a fronteira para CSRF (SameSite)
// e futura rotação, sem implementá-las agora.
const COOKIE_NAME = "britus_session";

export function readSessionCookie(request: FastifyRequest): string | null {
  const header = request.headers.cookie;
  if (typeof header !== "string") return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === COOKIE_NAME) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export function setSessionCookie(reply: FastifyReply, token: string, maxAgeSeconds: number, secure: boolean): void {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secure) attrs.push("Secure");
  reply.header("set-cookie", attrs.join("; "));
}

export function clearSessionCookie(reply: FastifyReply, secure: boolean): void {
  const attrs = [`${COOKIE_NAME}=`, "HttpOnly", "SameSite=Lax", "Path=/", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  reply.header("set-cookie", attrs.join("; "));
}
