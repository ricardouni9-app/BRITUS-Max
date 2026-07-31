import type {
  AuthorizationContext,
  AuthorizationAction,
  ResourceType,
  Client,
} from "@britus/contracts";
import { err, type Result } from "../result.js";
import { forbiddenError, type ApplicationError } from "../errors.js";
import type { UseCase, TenantCommand } from "../use-case.js";
import type { AuthorizationGuard } from "./guard.js";

// Entrada de um caso de uso AUTORIZADO: contexto (identidade/memberships/org) + payload.
export interface AuthorizedInput {
  readonly context: AuthorizationContext;
  readonly input: unknown;
}

export interface WithAuthorizationConfig {
  readonly action: AuthorizationAction;
  readonly resourceType: ResourceType;
}

// Boundary genérico de autorização (substitui wrappers específicos). Define a ação/recurso
// REAIS (não confia no que foi injetado no contexto), executa o guard (decide + AUDITA,
// inclusive negativas) e, se permitido, injeta `context.organizationId` no comando
// tenant-aware do caso de uso interno. O caso de uso interno NÃO conhece o
// AuthorizationContext — recebe apenas o tenant + input, mantendo o domínio desacoplado.
export function withAuthorization<Out>(
  inner: UseCase<TenantCommand<unknown>, Out>,
  config: WithAuthorizationConfig,
  deps: { readonly guard: AuthorizationGuard },
): UseCase<AuthorizedInput, Out> {
  return {
    async execute({ context, input }: AuthorizedInput): Promise<Result<Out, ApplicationError>> {
      const effective: AuthorizationContext = {
        ...context,
        action: config.action,
        resourceType: config.resourceType,
      };
      const gate = await deps.guard.check(effective);
      if (!gate.ok) {
        return err(gate.error);
      }
      const organizationId = effective.organizationId ?? null;
      if (organizationId === null) {
        // Uma ação organizacional permitida sempre tem organização-alvo; defensivo.
        return err(forbiddenError("Organização-alvo ausente"));
      }
      return inner.execute({ organizationId, input });
    },
  };
}

// O caso de uso autorizado de Criar Cliente é o boundary aplicado ao Criar Cliente —
// substitui o antigo `makeAuthorizedCreateClient` preservando o mesmo tipo público.
export type AuthorizedCreateClientUseCase = UseCase<AuthorizedInput, Client>;
