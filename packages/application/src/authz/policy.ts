import { globalActions, type AuthorizationContext } from "@britus/contracts";

export interface AuthorizationOutcome {
  readonly decision: "allow" | "deny";
  readonly reason?: string;
}

const allow = (): AuthorizationOutcome => ({ decision: "allow" });
const deny = (reason: string): AuthorizationOutcome => ({ decision: "deny", reason });

// Componente REUTILIZÁVEL e PURO de autorização. Não conhece HTTP, banco ou auth real.
// Não espalha verificação de papel pelas rotas — toda a decisão vive aqui.
//
// Regras:
//  • Ação GLOBAL → somente identidade global (Criador). owner organizacional NÃO obtém
//    poderes globais por ser proprietário.
//  • Ação ORGANIZACIONAL → exige membership adequada na organização-alvo.
//    - `organization.admin` exige papel `owner`.
//  • Criador NÃO é membro automático de nenhuma organização: só acessa dados de uma
//    organização quando o recurso está sob um escopo emergencial ATIVO já resolvido.
export function authorize(ctx: AuthorizationContext): AuthorizationOutcome {
  const isGlobalAction = globalActions.has(ctx.action);

  if (isGlobalAction) {
    if (ctx.identityType === "platform_creator" && (ctx.platformIdentityId ?? null) !== null) {
      return allow();
    }
    return deny("Ação global exige identidade global autorizada (Criador)");
  }

  // Ação organizacional.
  if (ctx.identityType === "platform_creator") {
    if (ctx.resourceType !== null && ctx.resourceType !== undefined && ctx.emergencyScopes.includes(ctx.resourceType)) {
      return allow(); // acesso via concessão emergencial ativa (escopo específico)
    }
    return deny("Criador não possui acesso organizacional automático");
  }

  const targetOrg = ctx.organizationId ?? null;
  if (targetOrg === null) {
    return deny("Organização-alvo ausente");
  }
  const membership = ctx.memberships.find((m) => m.organizationId === targetOrg);
  if (membership === undefined) {
    return deny("Sem membership na organização-alvo");
  }
  if (ctx.action === "organization.admin" && membership.role !== "owner") {
    return deny("Administração da organização exige papel owner");
  }
  return allow();
}
