import {
  makeCreateClient,
  makeRegisterAtendimento,
  makeOpenCase,
  makeConvertAtendimentoToClient,
  type ClientRepository,
  type ClientDuplicateChecker,
  type AtendimentoRepository,
  type AtendimentoLookup,
  type AtendimentoConverter,
  type CaseRepository,
} from "../index.js";

// Backend de persistência sob teste (ports do workflow). Cada `makeBackend()` deve
// devolver um estado LIMPO e isolado (memória: novos stores; Drizzle: tabelas truncadas).
export interface PersistenceBackend {
  readonly clients: ClientRepository & ClientDuplicateChecker;
  readonly atendimentos: AtendimentoRepository & AtendimentoLookup & AtendimentoConverter;
  readonly cases: CaseRepository;
}

export type MakeBackend = () => Promise<PersistenceBackend>;

// Asserção mínima e independente de framework (reutilizável por qualquer runner).
function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Contrato de persistência violado: ${message}`);
  }
}

const ORG_A = "01920000-0000-7000-8000-00000000000a";
const ORG_B = "01920000-0000-7000-8000-00000000000b";
const AREA = "01920000-0000-7000-8000-000000000000";

const clientInput = { personType: "pf" as const, displayName: "Ricardo", cpf: "12345678901" };
const caseInput = (atendimentoId?: string) => ({
  areaId: AREA,
  workTypeId: AREA,
  title: "Caso",
  financialClassification: "medio" as const,
  ...(atendimentoId !== undefined ? { atendimentoId } : {}),
});

// Contrato COMPORTAMENTAL que TODO adapter (memória e Drizzle/PostgreSQL) deve cumprir.
// node-free e framework-free: cada runner apenas itera e executa `run(makeBackend)`.
export const persistenceContractChecks: ReadonlyArray<{
  readonly name: string;
  readonly run: (make: MakeBackend) => Promise<void>;
}> = [
  {
    name: "criação atribui organizationId e isola leitura/duplicidade por organização",
    run: async (make) => {
      const b = await make();
      const create = makeCreateClient({ clients: b.clients, duplicates: b.clients });
      const a = await create.execute({ organizationId: ORG_A, input: clientInput });
      ensure(a.ok, "criação em A deve suceder");
      ensure(a.value.organizationId === ORG_A, "cliente deve carregar a org do contexto");
      ensure(await b.clients.existsByDocument(ORG_A, { cpf: clientInput.cpf }), "doc existe em A");
      ensure(
        !(await b.clients.existsByDocument(ORG_B, { cpf: clientInput.cpf })),
        "doc de A não deve aparecer em B",
      );
    },
  },
  {
    name: "mesmo CPF permitido em organizações diferentes",
    run: async (make) => {
      const b = await make();
      const create = makeCreateClient({ clients: b.clients, duplicates: b.clients });
      const a = await create.execute({ organizationId: ORG_A, input: clientInput });
      const c = await create.execute({ organizationId: ORG_B, input: clientInput });
      ensure(a.ok && c.ok, "mesmo CPF deve ser aceito em A e em B");
    },
  },
  {
    name: "duplicidade documental rejeitada na mesma organização (CONFLICT)",
    run: async (make) => {
      const b = await make();
      const create = makeCreateClient({ clients: b.clients, duplicates: b.clients });
      await create.execute({ organizationId: ORG_A, input: clientInput });
      const dup = await create.execute({ organizationId: ORG_A, input: clientInput });
      ensure(!dup.ok, "segundo CPF igual na mesma org deve falhar");
      ensure(dup.error.code === "CONFLICT", "deve ser CONFLICT");
    },
  },
  {
    name: "atendimento é tenant-scoped: outra organização vê NOT_FOUND (sem revelar existência)",
    run: async (make) => {
      const b = await make();
      const register = makeRegisterAtendimento({ atendimentos: b.atendimentos });
      const created = await register.execute({ organizationId: ORG_A, input: { channelOrigin: "indicacao" } });
      ensure(created.ok, "registro deve suceder");
      ensure((await b.atendimentos.findById(ORG_B, created.value.id)) === null, "org B não enxerga atendimento de A");
      const inA = await b.atendimentos.findById(ORG_A, created.value.id);
      ensure(inA !== null && inA.organizationId === ORG_A, "org A enxerga o próprio atendimento");
    },
  },
  {
    name: "conversão preserva organizationId; segunda conversão é rejeitada",
    run: async (make) => {
      const b = await make();
      const register = makeRegisterAtendimento({ atendimentos: b.atendimentos });
      const createClient = makeCreateClient({ clients: b.clients, duplicates: b.clients });
      const convert = makeConvertAtendimentoToClient({ atendimentos: b.atendimentos, createClient });
      const at = await register.execute({ organizationId: ORG_A, input: {} });
      ensure(at.ok, "registro deve suceder");
      const first = await convert.execute({ organizationId: ORG_A, input: { atendimentoId: at.value.id, client: clientInput } });
      ensure(first.ok, "primeira conversão deve suceder");
      ensure(first.value.atendimento.organizationId === ORG_A, "atendimento convertido mantém a org");
      ensure(first.value.client.organizationId === ORG_A, "cliente convertido carrega a org");
      ensure(first.value.atendimento.status === "convertido", "estado passa a convertido");
      const second = await convert.execute({
        organizationId: ORG_A,
        input: { atendimentoId: at.value.id, client: { personType: "pf", displayName: "Outro", cpf: "98765432100" } },
      });
      ensure(!second.ok, "segunda conversão deve falhar");
      ensure(second.error.code === "CONFLICT", "segunda conversão → CONFLICT");
    },
  },
  {
    name: "conversão cross-tenant é impossível (NOT_FOUND)",
    run: async (make) => {
      const b = await make();
      const register = makeRegisterAtendimento({ atendimentos: b.atendimentos });
      const createClient = makeCreateClient({ clients: b.clients, duplicates: b.clients });
      const convert = makeConvertAtendimentoToClient({ atendimentos: b.atendimentos, createClient });
      const at = await register.execute({ organizationId: ORG_A, input: {} });
      ensure(at.ok, "registro deve suceder");
      const res = await convert.execute({ organizationId: ORG_B, input: { atendimentoId: at.value.id, client: clientInput } });
      ensure(!res.ok, "conversão cross-tenant deve falhar");
      ensure(res.error.code === "NOT_FOUND", "cross-tenant → NOT_FOUND");
    },
  },
  {
    name: "abertura de Case é tenant-scoped: origem de outra organização → NOT_FOUND",
    run: async (make) => {
      const b = await make();
      const register = makeRegisterAtendimento({ atendimentos: b.atendimentos });
      const open = makeOpenCase({ cases: b.cases, atendimentos: b.atendimentos });
      const at = await register.execute({ organizationId: ORG_A, input: {} });
      ensure(at.ok, "registro deve suceder");
      const okCase = await open.execute({ organizationId: ORG_A, input: caseInput(at.value.id) });
      ensure(okCase.ok, "abrir caso na mesma org deve suceder");
      ensure(okCase.value.organizationId === ORG_A, "caso carrega a org");
      const cross = await open.execute({ organizationId: ORG_B, input: caseInput(at.value.id) });
      ensure(!cross.ok, "abrir caso a partir de atendimento de outra org deve falhar");
      ensure(cross.error.code === "NOT_FOUND", "case cross-tenant → NOT_FOUND");
    },
  },
];
