import type { EmergencyAccessGrant } from "@britus/contracts";

// Entrada de criação de concessão: sem id/timestamps (atribuídos na persistência).
export type NewEmergencyAccessGrant = Omit<
  EmergencyAccessGrant,
  "id" | "createdAt" | "updatedAt"
>;

// Armazenamento de concessões emergenciais (estado do grant tem ciclo de vida próprio;
// a TRILHA de auditoria é append-only e vive em `AuditLog`, separada).
export interface EmergencyAccessStore {
  create(input: NewEmergencyAccessGrant): Promise<EmergencyAccessGrant>;
  findById(id: string): Promise<EmergencyAccessGrant | null>;
  save(grant: EmergencyAccessGrant): Promise<EmergencyAccessGrant>;
}
