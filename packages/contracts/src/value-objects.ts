import { z } from "zod";

// Value objects de domínio (persistência-independentes).

export const personTypeSchema = z.enum(["pf", "pj"]);
export type PersonType = z.infer<typeof personTypeSchema>;

// CPF/CNPJ — validação de **formato** (dígitos/comprimento). A validação dos
// dígitos verificadores é regra de negócio e não pertence ao contrato.
export const cpfSchema = z.string().regex(/^\d{11}$/, "CPF deve conter 11 dígitos");
export const cnpjSchema = z.string().regex(/^\d{14}$/, "CNPJ deve conter 14 dígitos");

// Contato — **tipo configurável** (não lista rígida de plataformas) + valor.
export const contactSchema = z.strictObject({
  type: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(200),
  label: z.string().trim().max(80).optional(),
});
export type Contact = z.infer<typeof contactSchema>;

export const addressSchema = z.strictObject({
  street: z.string().trim().max(200).optional(),
  number: z.string().trim().max(20).optional(),
  complement: z.string().trim().max(100).optional(),
  neighborhood: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().length(2).optional(),
  zipCode: z.string().trim().max(20).optional(),
});
export type Address = z.infer<typeof addressSchema>;

// Número de processo — presente apenas quando houver (o Caso pode não ter).
export const processNumberSchema = z.string().trim().min(1).max(40);

// Potencial financeiro (opção discreta; "faixa" fica para o módulo Financeiro).
export const financialClassificationSchema = z.enum(["alto", "medio", "baixo"]);
export type FinancialClassification = z.infer<typeof financialClassificationSchema>;
