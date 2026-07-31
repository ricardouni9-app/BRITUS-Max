import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import { persistenceContractChecks, type MakeBackend } from "@britus/application/testing";
import {
  makeCreateClient,
  makeRegisterAtendimento,
  makeConvertAtendimentoToClient,
} from "@britus/application";
import { createDatabaseClient } from "../client.js";
import { createDrizzlePersistence, type DrizzlePersistence } from "./index.js";

const ORG_A = "01920000-0000-7000-8000-00000000000a";

// Teste de INTEGRAÇÃO real (PostgreSQL) — o MESMO contrato dos adapters em memória.
//
// BLOQUEADO POR AMBIENTE: só executa quando `DATABASE_URL` está definido E
// `BRITUS_DB_TEST_DISPOSABLE=1` confirma explicitamente um banco DESCARTÁVEL (o teste
// TRUNCA as tabelas do workflow). Nunca roda contra banco não confirmado como descartável.
//
// Procedimento de desbloqueio (único e seguro):
//   1. subir um Postgres descartável (ex.: container efêmero) e aplicar as migrações:
//        DATABASE_URL=postgres://... pnpm --filter @britus/db run db:migrate
//   2. executar somente esta integração:
//        DATABASE_URL=postgres://... BRITUS_DB_TEST_DISPOSABLE=1 pnpm test
const url = process.env.DATABASE_URL;
const disposable = process.env.BRITUS_DB_TEST_DISPOSABLE === "1";
const shouldRun = typeof url === "string" && url.length > 0 && disposable;

const suite = shouldRun ? describe : describe.skip;

suite("Contrato de persistência — adapter DRIZZLE/PostgreSQL (integração)", () => {
  let pool: Pool | undefined;

  const makeBackend: MakeBackend = async () => {
    const activePool = pool ?? new Pool({ connectionString: url });
    pool = activePool;
    const db = createDatabaseClient(activePool);
    const persistence: DrizzlePersistence = createDrizzlePersistence(db);

    // Estado limpo por verificação (banco descartável): trunca o workflow e garante as
    // organizações de teste (necessárias para as FKs).
    await db.execute(sql`truncate table cases, atendimentos, clients cascade`);
    await db.execute(sql`
      insert into organizations (id, name, status) values
        ('01920000-0000-7000-8000-00000000000a', 'Org A (test)', 'active'),
        ('01920000-0000-7000-8000-00000000000b', 'Org B (test)', 'active')
      on conflict (id) do nothing`);
    return persistence;
  };

  afterAll(async () => {
    if (pool !== undefined) await pool.end();
  });

  for (const check of persistenceContractChecks) {
    it(check.name, () => check.run(makeBackend));
  }

  // Prova REAL de concorrência (só demonstrável em banco real): duas conversões do MESMO
  // atendimento, simultâneas e com documentos distintos, disparadas em paralelo. O
  // compare-and-swap atômico garante EXATAMENTE UM vencedor.
  it("concorrência: duas conversões simultâneas do mesmo atendimento → exatamente um vencedor", async () => {
    const b = await makeBackend();
    const register = makeRegisterAtendimento({ atendimentos: b.atendimentos });
    const createClient = makeCreateClient({ clients: b.clients, duplicates: b.clients });
    const convert = makeConvertAtendimentoToClient({ atendimentos: b.atendimentos, createClient });

    const at = await register.execute({ organizationId: ORG_A, input: {} });
    expect(at.ok).toBe(true);
    if (!at.ok) return;

    const settled = await Promise.allSettled([
      convert.execute({
        organizationId: ORG_A,
        input: { atendimentoId: at.value.id, client: { personType: "pf", displayName: "R1", cpf: "11111111111" } },
      }),
      convert.execute({
        organizationId: ORG_A,
        input: { atendimentoId: at.value.id, client: { personType: "pf", displayName: "R2", cpf: "22222222222" } },
      }),
    ]);

    const winners = settled.filter((s) => s.status === "fulfilled" && s.value.ok);
    expect(winners.length).toBe(1);

    const after = await b.atendimentos.findById(ORG_A, at.value.id);
    expect(after?.status).toBe("convertido");
  });
});
