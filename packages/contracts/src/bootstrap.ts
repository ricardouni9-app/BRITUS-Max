import { z } from "zod";
import { userRoleSchema } from "./user.js";

// Configuração de BOOTSTRAP da primeira organização e do primeiro usuário operacional.
//
// Fornecida NA IMPLANTAÇÃO (deploy), nunca versionada com dados reais. NÃO contém
// senha, token, segredo ou credencial — a autenticação é provisionada em fluxo próprio,
// futuro. Os dados pessoais (e-mail) são preenchidos no deploy; o repositório não os inventa.
//
// Idempotência: a chave estável é `installationId` (identidade técnica da instalação),
// NÃO o nome da organização — permitindo renomear a organização no futuro sem risco.
export const bootstrapConfigSchema = z.strictObject({
  installationId: z.string().trim().min(1).max(120),
  organization: z.strictObject({
    name: z.string().trim().min(1).max(200),
  }),
  operator: z.strictObject({
    name: z.string().trim().min(1).max(200),
    email: z.email(),
    // Combinação de papéis organizacionais permitida (ex.: ["owner", "lawyer"]).
    roles: z.array(userRoleSchema).min(1),
  }),
});
export type BootstrapConfig = z.infer<typeof bootstrapConfigSchema>;
