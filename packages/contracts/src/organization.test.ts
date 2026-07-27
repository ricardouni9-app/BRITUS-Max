import { describe, expect, it } from "vitest";
import {
  organizationSchema,
  createOrganizationInputSchema,
  organizationStatusSchema,
  organizationIdSchema,
} from "./organization.js";

const validId = "01920000-0000-7000-8000-000000000000"; // UUID (formato v7)

describe("organizationStatusSchema", () => {
  it("aceita status válido", () => {
    expect(organizationStatusSchema.parse("active")).toBe("active");
    expect(organizationStatusSchema.parse("inactive")).toBe("inactive");
  });
  it("rejeita status inválido", () => {
    expect(() => organizationStatusSchema.parse("deleted")).toThrow();
  });
});

describe("organizationIdSchema (UUID)", () => {
  it("aceita UUID válido", () => {
    expect(organizationIdSchema.parse(validId)).toBe(validId);
  });
  it("rejeita valor que não é UUID", () => {
    expect(() => organizationIdSchema.parse("not-a-uuid")).toThrow();
  });
});

describe("organizationSchema", () => {
  it("valida uma organização completa", () => {
    const org = {
      id: validId,
      name: "Escritório Exemplo",
      status: "active" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(organizationSchema.parse(org)).toMatchObject({ id: validId, name: "Escritório Exemplo" });
  });
  it("rejeita nome vazio/em branco", () => {
    expect(() =>
      organizationSchema.parse({
        id: validId,
        name: "   ",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ).toThrow();
  });
});

describe("createOrganizationInputSchema", () => {
  it("aceita payload de criação válido (só name)", () => {
    expect(createOrganizationInputSchema.parse({ name: "Novo Escritório" })).toEqual({
      name: "Novo Escritório",
    });
  });
  it("aceita status opcional", () => {
    expect(createOrganizationInputSchema.parse({ name: "X", status: "inactive" })).toEqual({
      name: "X",
      status: "inactive",
    });
  });
  it("rejeita nome vazio", () => {
    expect(() => createOrganizationInputSchema.parse({ name: "" })).toThrow();
  });
  it("rejeita campos indevidos: id e timestamps", () => {
    expect(() => createOrganizationInputSchema.parse({ name: "X", id: validId })).toThrow();
    expect(() =>
      createOrganizationInputSchema.parse({ name: "X", createdAt: new Date() }),
    ).toThrow();
  });
});
