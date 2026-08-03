# BRITUS API — Operação e Implantação

Procedimentos reproduzíveis. Segredos NUNCA versionados (ver `.env.example`).

## Modos

- `BRITUS_MODE=api` — só health (composição externa).
- `BRITUS_MODE=pilot` (ou `BRITUS_PILOT=1`) — demo em memória + UI de piloto (inclui `__dev`). Uso local.
- `BRITUS_MODE=commercial` — produto real (rotas legítimas + UI comercial). Backend `BRITUS_DB=memory|postgres`.

## Instalação e build

```
pnpm install
pnpm --filter @britus/api build   # tsc --build (compila deps do monorepo)
```

## Migrações (Postgres)

Pré-req: `DATABASE_URL` apontando para o banco.

```
DATABASE_URL=postgres://user:pass@host:5432/db pnpm --filter @britus/db db:migrate
```

Aplica as migrações 0000→0008 (incluindo comercial, contato do Criador, perfil organizacional e recuperação de senha). Forward-only.

## Primeiro operador (Postgres) — sem rota de seed

```
DATABASE_URL=... BOOTSTRAP_EMAIL=admin@escritorio.com BOOTSTRAP_PASSWORD=<>=8chars \
BOOTSTRAP_NAME="Nome" BOOTSTRAP_ORG_NAME="Escritório X" \
node apps/api/dist/bin/bootstrap.js
```

Saída: imprime `organizationId` e o e-mail do operador (role=owner). Idempotente por e-mail.

## Inicialização

```
# Comercial + Postgres (produção/homologação)
BRITUS_MODE=commercial BRITUS_DB=postgres DATABASE_URL=... COOKIE_SECURE=1 \
HOST=0.0.0.0 PORT=3000 node apps/api/dist/index.js

# Comercial + memory (demo local, dados voláteis)
BRITUS_MODE=commercial BRITUS_DB=memory DEMO_OPERATOR_EMAIL=op@britus.test \
DEMO_OPERATOR_PASSWORD=senha-forte-123 node apps/api/dist/index.js
```

UI em `/`. Falha CLARA se faltar `DATABASE_URL` no modo postgres.

## Verificação de saúde

`GET /health` → 200. Pós-deploy: conferir `/health`=200, `/`=200 (UI), `/__dev/*`=404 (dev isolado).

## Encerramento seguro

SIGINT/SIGTERM → fecha app e pool (implementado em `server.ts`).

## Logs

`LOG_LEVEL` (default info). Logger Pino via Fastify. Erros mapeados sem vazar interno (`error-map`).

## Backup e restauração (Postgres)

```
# Backup lógico
pg_dump "$DATABASE_URL" -Fc -f britus_$(date +%F).dump
# Restauração
pg_restore -d "$DATABASE_URL" --clean --if-exists britus_YYYY-MM-DD.dump
```

Política inicial (piloto): backup diário + antes de cada deploy/migração. Reter 7 dias. Testar restauração em banco descartável antes de confiar.

## Checklist de publicação (deploy)

1. `build` verde (typecheck) · `eslint` verde · `vitest run` verde.
2. Migrações aplicadas no banco alvo.
3. Variáveis definidas (DATABASE_URL, COOKIE_SECURE=1, HOST/PORT, LOG_LEVEL).
   Para recuperação automática: PUBLIC_BASE_URL, BREVO_API_KEY, BREVO_FROM_EMAIL e BREVO_FROM_NAME.
4. Operador criado via bootstrap.
5. Backup pré-deploy realizado.
6. Start + `/health`=200 + `/__dev/*`=404 + login OK.
7. HTTPS ativo (plataforma/proxy) — cookie Secure exige TLS.

## Checklist de rollback

1. Parar processo novo.
2. Reimplantar artefato anterior (mesmo commit/build).
3. Se migração incompatível: restaurar dump pré-deploy.
4. `/health`=200 + login OK na versão anterior.
5. Registrar incidente e causa.

## Deploy (menor caminho seguro)

Plataforma compatível com Node 24 + PostgreSQL gerenciado. Build: `pnpm --filter @britus/api build`. Start: `node apps/api/dist/index.js`. Porta: `PORT`. Restart: automático da plataforma. HTTPS: terminação TLS na plataforma/proxy → `COOKIE_SECURE=1`. Domínio: apontar DNS para o host (ação externa do PO). Não publicar sem autorização expressa.
