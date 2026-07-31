# @britus/api

Aplicação **de backend** (API) da BRITUS Platform — **Fastify** (Node 24 + TypeScript).

## Estado atual (PACOTE 004 — Fundação da API)
Fundação executável mínima; **sem regra de negócio**, sem rota de domínio, sem acesso ao banco.

- `src/config.ts` — validação de ambiente (Zod), uma única vez, com defaults de dev.
- `src/app.ts` — `buildApp()`: cria a instância Fastify, registra erros e rotas; **não** abre porta e **não** acessa banco (testável via `inject`).
- `src/server.ts` — `start()`: carrega config, constrói a app, inicia o listener e trata **encerramento controlado** (SIGINT/SIGTERM). `process.exit` vive só aqui.
- `src/index.ts` — ponto de entrada.
- `src/routes/health.ts` — `GET /health` → `{ "status": "ok" }`.
- `src/http/errors.ts` + `src/http/error-handler.ts` — erros com códigos estáveis
  e formato `{ "error": { "code", "message" } }`; nunca expõe stack/SQL/caminhos.
- `src/http/validation.ts` — `parseInput(schema, data)`: validação reutilizável de
  params/query/body (falha → `VALIDATION_ERROR`).

## Integração com @britus/contracts (PACOTE 006)
- **Fonte única de erros:** os códigos (`ErrorCode`) e o envelope (`apiErrorSchema`)
  vêm de `@britus/contracts` — a API não mantém um segundo conjunto de códigos.
- **Datas no HTTP:** o domínio usa `Date` (`timestampSchema`); na fronteira HTTP/JSON
  as datas são serializadas como **ISO-8601** (validável por `isoDateTimeSchema`).
- **Validação padronizada** via `parseInput` + schemas compartilhados de contracts.

## Isolamento organizacional e workflow autorizado (MACRO PACOTE 012)
O workflow (Cliente, Atendimento, Caso, conversão) é **isolado por organização**: o tenant
(`organizationId`) vem **exclusivamente do contexto server-side**, nunca do corpo. Como ainda
**não há autenticação**, o workflow HTTP é exposto **apenas** pelo mecanismo de teste/dev
(gated por `enableTestRoutes`, **inexistente em produção**), com a identidade injetada pelo
header `x-dev-authz-context` (JSON) — **jamais** confundível com autenticação real.

- Rotas gated `POST /__dev/authorized/{clients,atendimentos,cases,atendimentos/:id/conversion}`
  (`src/modules/authz/dev-routes.ts`). A rota **só transporta** identidade + corpo; a
  autorização, a auditoria e a **derivação do tenant** vivem na Application (boundary
  `withAuthorization`). **201** em sucesso; **400** (contexto ausente/`VALIDATION_ERROR`);
  **403** (`FORBIDDEN`, sem membership na organização-alvo); **404** (origem inexistente na org);
  **409** (`CONFLICT`, duplicidade/reconversão).
- `organizationId` **não** existe nos inputs de criação (`createXInput` são `strictObject`);
  enviá-lo no corpo é **rejeitado** (400). A entidade criada carrega o `organizationId` do contexto.
- Stores **em memória isolados por organização** (`src/modules/{client,atendimento,case}/in-memory-store.ts`),
  substituíveis pela infraestrutura real (Drizzle/PostgreSQL) — sem banco/Docker.

> Sem `enableTestRoutes`, apenas `GET /health` existe: sem autenticação, não há workflow
> público seguro (o tenant confiável depende da autenticação futura). Domínio (ADR-0019):
> não há entidade "Lead" separada — um **lead é um `Atendimento` em recepção**.

## Autenticação de borda (MACRO PACOTE 014 — comprovado com PostgreSQL)
Autenticação **server-side stateful**, sem JWT. Composição REAL via `buildApp({ auth })`
(adapters Drizzle) — independente do mecanismo `__dev`, que permanece restrito a
`enableTestRoutes` e **não** é necessário ao fluxo autenticado.
- **`POST /auth/login`** — credencial (e-mail+senha) verificada com **Argon2id**
  (`@node-rs/argon2`, atrás de `PasswordHasher`); cria sessão opaca; devolve `csrfToken`.
  Falha → **401 genérico** (sem enumeração).
- **`POST /auth/logout`** — revoga a sessão (imediata, idempotente) e invalida o cookie.
- **`POST /auth/active-organization`** — seleciona a org ativa, validada ⊆ memberships
  (rejeita **tenant spoofing** → 403).
- **`POST /clients`** (autenticada) — contexto derivado 100% no servidor a partir da sessão;
  org ativa da sessão (nunca do corpo); exige header **`x-csrf-token`** (double-submit,
  validado server-side) em mutação. Mesmo caso de uso autorizado da rota `__dev` → **paridade**.
- **Cookie de sessão:** `HttpOnly` + `SameSite=Lax` + `Path` + `Max-Age`; `Secure` orientado
  por ambiente. Só o **hash** do token é persistido (token bruto nunca gravado). Sessão
  expirada/revogada nunca é retornada como válida.
- **Identidade:** `user` (organizacional) e `creator` (global) são subjects distintos
  (`subject_type`); credencial (só hash) e sessão são separadas da identidade; o Criador
  é **singleton** e **não** recebe membership.

## Scripts
- `dev` — execução com watch (Node 24, TypeScript nativo).
- `build` — `tsc --build` (gera `dist/`).
- `start` — executa **código compilado** (`node dist/index.js`).
- `typecheck` / `lint` / `test`.

> Estrutura pronta para receber módulos futuros (contratos em `@britus/contracts`).
> Nenhuma exposição pública é pressuposta (ADR-0018); topologia indefinida (ADR-0021).
