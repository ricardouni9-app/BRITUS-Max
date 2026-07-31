import type { AuditEvent } from "@britus/contracts";

// Entrada de registro: sem `id`/`occurredAt` (atribuídos na persistência do log).
export type RecordAuditInput = Omit<AuditEvent, "id" | "occurredAt">;

// Trilha de auditoria APPEND-ONLY. A interface NÃO oferece exclusão nem atualização
// destrutiva — a impossibilidade de apagar a trilha é garantida pelo próprio contrato.
export interface AuditLog {
  record(input: RecordAuditInput): Promise<AuditEvent>;
  list(): Promise<readonly AuditEvent[]>;
}
