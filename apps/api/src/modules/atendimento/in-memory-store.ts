import { uuidv7 } from "uuidv7";
import type { Atendimento, CreateAtendimentoInput } from "@britus/contracts";
import type {
  AtendimentoRepository,
  AtendimentoLookup,
  AtendimentoConverter,
} from "@britus/application";

export interface InMemoryAtendimentoStore
  extends AtendimentoRepository,
    AtendimentoLookup,
    AtendimentoConverter {}

// Implementação EM MEMÓRIA, **isolada por organização**. Um Atendimento nasce em "novo".
// Leitura/escrita/conversão só ocorrem dentro da organização informada (bloqueia
// acesso cross-tenant). Não acessa banco/Docker.
export function createInMemoryAtendimentoStore(): InMemoryAtendimentoStore {
  const items = new Map<string, Atendimento>();

  return {
    async create(organizationId: string, input: CreateAtendimentoInput): Promise<Atendimento> {
      const now = new Date();
      const atendimento: Atendimento = {
        id: uuidv7(),
        organizationId,
        clientId: input.clientId,
        channelOrigin: input.channelOrigin,
        areaId: input.areaId,
        workTypeId: input.workTypeId,
        assignedUserId: input.assignedUserId,
        status: "novo",
        summary: input.summary,
        conflictFlag: input.conflictFlag ?? false,
        firstContactAt: now,
        lastRelevantInteractionAt: now,
        createdAt: now,
        updatedAt: now,
      };
      items.set(atendimento.id, atendimento);
      return atendimento;
    },
    async findById(organizationId: string, id: string): Promise<Atendimento | null> {
      const found = items.get(id);
      // Isolamento: só retorna se pertencer à organização informada.
      return found !== undefined && found.organizationId === organizationId ? found : null;
    },
    async markConverted({ organizationId, atendimentoId, clientId, convertedAt }): Promise<Atendimento> {
      const current = items.get(atendimentoId);
      if (current === undefined || current.organizationId !== organizationId) {
        throw new Error("markConverted: atendimento inexistente na organização");
      }
      const updated: Atendimento = {
        ...current,
        clientId,
        status: "convertido",
        result: "convertido",
        convertedAt,
        updatedAt: convertedAt,
      };
      items.set(atendimentoId, updated);
      return updated;
    },
  };
}
