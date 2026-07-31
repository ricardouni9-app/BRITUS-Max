import { uuidv7 } from "uuidv7";
import type { AuditEvent } from "@britus/contracts";
import type { AuditLog, RecordAuditInput } from "./ports.js";

// Implementação EM MEMÓRIA da trilha append-only — SOMENTE para testes e demonstração.
// NÃO é infraestrutura de produção. Não expõe remoção nem atualização (append-only).
export function createInMemoryAuditLog(): AuditLog {
  const events: AuditEvent[] = [];
  return {
    async record(input: RecordAuditInput): Promise<AuditEvent> {
      const event: AuditEvent = { ...input, id: uuidv7(), occurredAt: new Date() };
      events.push(event);
      return event;
    },
    async list(): Promise<readonly AuditEvent[]> {
      return [...events];
    },
  };
}
