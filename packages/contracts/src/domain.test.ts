import { describe, expect, it } from "vitest";
import {
  paginationParamsSchema,
  errorCodeSchema,
  isoDateTimeSchema,
  uuidSchema,
  personTypeSchema,
  cpfSchema,
  cnpjSchema,
  contactSchema,
  financialClassificationSchema,
  userRoleSchema,
  createUserInputSchema,
  createClientInputSchema,
  atendimentoStatusSchema,
  createAtendimentoInputSchema,
  caseStatusSchema,
  participantRoleSchema,
  createCaseInputSchema,
  registerDocumentInputSchema,
  areaSchema,
} from "./index.js";

const id = "01920000-0000-7000-8000-000000000000";

describe("shared", () => {
  it("paginationParams aplica defaults e coage", () => {
    expect(paginationParamsSchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationParamsSchema.parse({ page: "2", pageSize: "50" })).toEqual({ page: 2, pageSize: 50 });
  });
  it("paginationParams rejeita pageSize acima do máximo", () => {
    expect(() => paginationParamsSchema.parse({ pageSize: "1000" })).toThrow();
  });
  it("errorCode aceita códigos estáveis e rejeita desconhecido", () => {
    expect(errorCodeSchema.parse("NOT_FOUND")).toBe("NOT_FOUND");
    expect(() => errorCodeSchema.parse("BOOM")).toThrow();
  });
  it("uuid valida", () => {
    expect(uuidSchema.parse(id)).toBe(id);
    expect(() => uuidSchema.parse("x")).toThrow();
  });
});

describe("value objects", () => {
  it("personType", () => {
    expect(personTypeSchema.parse("pf")).toBe("pf");
    expect(() => personTypeSchema.parse("xx")).toThrow();
  });
  it("cpf/cnpj formato", () => {
    expect(cpfSchema.parse("12345678901")).toBe("12345678901");
    expect(() => cpfSchema.parse("123")).toThrow();
    expect(cnpjSchema.parse("12345678000199")).toBe("12345678000199");
    expect(() => cnpjSchema.parse("123")).toThrow();
  });
  it("contact é tipo configurável + valor (strict)", () => {
    expect(contactSchema.parse({ type: "whatsapp", value: "+5511999999999" })).toMatchObject({ type: "whatsapp" });
    expect(() => contactSchema.parse({ type: "", value: "x" })).toThrow();
    expect(() => contactSchema.parse({ type: "a", value: "b", extra: 1 })).toThrow();
  });
  it("financialClassification", () => {
    expect(financialClassificationSchema.parse("alto")).toBe("alto");
    expect(() => financialClassificationSchema.parse("altissimo")).toThrow();
  });
});

describe("user", () => {
  it("role + createUserInput valida email e rejeita campos extras", () => {
    expect(userRoleSchema.parse("owner")).toBe("owner");
    expect(createUserInputSchema.parse({ name: "Ana", email: "ana@ex.com" })).toMatchObject({ name: "Ana" });
    expect(() => createUserInputSchema.parse({ name: "Ana", email: "invalido" })).toThrow();
    // `role` pertence ao membership — não é aceito na criação do usuário (strictObject).
    expect(() => createUserInputSchema.parse({ name: "Ana", email: "ana@ex.com", role: "lawyer" })).toThrow();
    expect(() => createUserInputSchema.parse({ name: "Ana", email: "ana@ex.com", id })).toThrow();
  });
});

describe("client", () => {
  it("createClientInput válido e strict", () => {
    expect(createClientInputSchema.parse({ personType: "pf", displayName: "Fulano" })).toMatchObject({ personType: "pf" });
    expect(() => createClientInputSchema.parse({ personType: "pf", displayName: "  " })).toThrow();
    expect(() => createClientInputSchema.parse({ personType: "pf", displayName: "X", id })).toThrow();
  });
});

describe("atendimento", () => {
  it("status enum + createInput strict", () => {
    expect(atendimentoStatusSchema.parse("novo")).toBe("novo");
    expect(() => atendimentoStatusSchema.parse("aberto")).toThrow();
    expect(createAtendimentoInputSchema.parse({ channelOrigin: "site" })).toMatchObject({ channelOrigin: "site" });
    expect(() => createAtendimentoInputSchema.parse({ status: "novo" })).toThrow();
  });
});

describe("case", () => {
  it("status + papel + createInput exige área/tipo/título/classificação", () => {
    expect(caseStatusSchema.parse("ativo")).toBe("ativo");
    expect(participantRoleSchema.parse("parte_contraria")).toBe("parte_contraria");
    expect(
      createCaseInputSchema.parse({ areaId: id, workTypeId: id, title: "Guarda", financialClassification: "medio" }),
    ).toMatchObject({ title: "Guarda" });
    expect(() => createCaseInputSchema.parse({ areaId: id, workTypeId: id, title: "" , financialClassification: "medio" })).toThrow();
  });
});

describe("document", () => {
  it("registerDocumentInput exige metadados mínimos e é strict", () => {
    const ok = { category: "peticao", originalName: "p.pdf", contentHash: "abc", size: 10, mime: "application/pdf" };
    expect(registerDocumentInputSchema.parse(ok)).toMatchObject({ category: "peticao" });
    expect(() => registerDocumentInputSchema.parse({ ...ok, extra: 1 })).toThrow();
    expect(() => registerDocumentInputSchema.parse({ ...ok, category: "" })).toThrow();
  });
});

describe("catalog", () => {
  it("area aplica defaults", () => {
    expect(areaSchema.parse({ id, name: "Família" })).toEqual({ id, name: "Família", active: true, sortOrder: 0 });
  });
});

describe("isoDateTime (fronteira HTTP)", () => {
  it("aceita ISO-8601 e rejeita não-ISO", () => {
    expect(isoDateTimeSchema.parse("2026-07-25T12:00:00.000Z")).toBe("2026-07-25T12:00:00.000Z");
    expect(() => isoDateTimeSchema.parse("25/07/2026")).toThrow();
  });
});
