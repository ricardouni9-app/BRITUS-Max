# @britus/application

**Camada de aplicação** (casos de uso) da BRITUS Platform. Coordena o domínio e é
**independente** de Fastify, banco, Drizzle, Docker e transporte HTTP.

## Padrão
- `result.ts` — `Result<T, E>` (`ok`/`err`): sucesso ou falha tipada, sem exceções para fluxo previsível.
- `errors.ts` — `ApplicationError` (código reutiliza `ErrorCode` de `@britus/contracts`).
- `use-case.ts` — `UseCase<Input, Output>` + `TenantCommand<Input>` (`{ organizationId, input }`):
  contrato base + comando **tenant-aware** dos casos de uso operacionais. O `organizationId` vem
  sempre do contexto server-side, **nunca** do `input`; o tipo é extensível aditivamente.
- **Dependências por interface (ports):** cada caso de uso declara suas dependências
  (ex.: repositório, consulta de duplicidade); a implementação concreta fica na
  infraestrutura. **Injeção simples** via função-fábrica (`makeXxx(deps)`).

## Piloto — Criar Cliente (`client/`)
`makeCreateClient({ clients, duplicates })` — **tenant-aware**, recebe `{ organizationId, input }`:
1. valida `createClientInputSchema` (`@britus/contracts`) sobre `input`;
2. impede **documento duplicado (CPF/CNPJ) POR ORGANIZAÇÃO** via `ClientDuplicateChecker`;
3. delega a persistência a `ClientRepository.create(organizationId, input)`;
4. retorna `Result<Client, ApplicationError>` (o Cliente carrega `organizationId`).

> A duplicidade "leve" por nome permanece um **aviso** e não é tratada aqui (DOMAIN_MODEL).
> As interfaces são testadas com implementações **em memória** exclusivas dos testes.

## Workflow operacional — Lead → Cliente → Atendimento → Caso (`atendimento/`, `case/`)
Todos **tenant-aware** (`{ organizationId, input }`) e org-scoped:
- `makeRegisterAtendimento({ atendimentos })` — registra o **Atendimento** (recepção/**lead**)
  na organização do contexto. Domínio (ADR-0019): não há entidade "Lead" separada.
- `makeOpenCase({ cases, atendimentos })` — se houver `atendimentoId` de origem, ele deve
  pertencer à **mesma organização** (`AtendimentoLookup.findById(organizationId, id)` org-scoped);
  origem de outra organização resolve para `null` → `NOT_FOUND` (bloqueio **cross-tenant**).

> Regra de negócio 100% na Application; API só adapta. Persistência real (Drizzle/PostgreSQL)
> substitui os ports sem tocar nos casos de uso.

## Conversão real Atendimento → Cliente (MACRO PACOTE 010)
`makeConvertAtendimentoToClient({ atendimentos, createClient })`:
1. valida `convertAtendimentoInputSchema` (`atendimentoId` + dados complementares do Cliente);
2. exige a existência do Atendimento (`AtendimentoLookup`) — senão `NOT_FOUND`;
3. **segunda conversão** (já `convertido` ou já vinculado) → `CONFLICT` previsível;
4. **reutiliza** `makeCreateClient` (duplicidade documental tratada lá → `CONFLICT`);
5. marca o vínculo/estado (`AtendimentoConverter.markConverted`: `clientId`, `status=convertido`,
   `result=convertido`, `convertedAt`) e retorna `{ atendimento, client }`.

> Rastreabilidade: Atendimento → Cliente (via `clientId`/`convertedAt`) e Caso → Atendimento
> de origem (via `atendimentoId`). Não há entidade "Lead" separada (ADR-0019).

## Bootstrap da primeira organização (`bootstrap/`)
`makeBootstrapFirstOrganization({ ledger, organizations, operators, memberships })` —
**idempotente por chave técnica estável** (`installationId` via `BootstrapLedger`, **não**
pelo nome da organização → permite renomear depois), sem credenciais. Valida
`bootstrapConfigSchema` (dados de implantação) e provisiona a organização, o operador
(**Ricardo**: `owner` + `lawyer`) e os vínculos; a reexecução não duplica nada.

## Autorização, auditoria e acesso emergencial (`authz/`, `audit/`, `emergency/`)
Responde **quem pode fazer / o quê / em qual contexto / sob quais condições / com qual
registro** — **sem** autenticação.
- `authz/policy.ts` — `authorize(context)` **puro e reutilizável** (`AuthorizationContext`):
  ação global só para o Criador (owner **não** obtém poder global); ação organizacional exige
  membership (e `owner` para administração); Criador acessa dados de org só sob escopo
  emergencial ativo. Não há verificação de papel espalhada nas rotas.
- `authz/guard.ts` + `authz/with-authorization.ts` — guard que **decide e audita** + **boundary
  genérico** `withAuthorization(useCase, { action, resourceType })`: define a ação real, autoriza,
  audita e injeta `context.organizationId` no comando tenant-aware. Aplicado a **todos** os casos
  de uso do workflow; o caso de uso **não** conhece o `AuthorizationContext`. Sem autoridade → `FORBIDDEN`.
- `audit/` — `AuditLog` **append-only** (sem exclusão/atualização); impl em memória só p/ testes/demo.
- `emergency/` — `makeRequestEmergencyAccess` / `makeEndEmergencyAccess` / `makeCheckEmergencyAccess`:
  concessão exige justificativa/escopo/duração; uso pós-expiração/revogação é negado; tudo auditado.

Ver `docs/07-architecture/PLATFORM_OPERATOR_AND_GLOBAL_IDENTITY.md`.
