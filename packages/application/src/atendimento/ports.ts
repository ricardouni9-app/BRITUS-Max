import type { Atendimento, CreateAtendimentoInput } from "@britus/contracts";

// Persistência de Atendimento — org-scoped.
export interface AtendimentoRepository {
  create(organizationId: string, input: CreateAtendimentoInput): Promise<Atendimento>;
}

// Consulta de Atendimento por id DENTRO de uma organização: retorna null quando o id
// não pertence à organização informada (bloqueia leitura cross-tenant).
export interface AtendimentoLookup {
  findById(organizationId: string, id: string): Promise<Atendimento | null>;
}

// Persistência da conversão de um Atendimento em Cliente (escopada por organização).
export interface AtendimentoConverter {
  markConverted(params: {
    readonly organizationId: string;
    readonly atendimentoId: string;
    readonly clientId: string;
    readonly convertedAt: Date;
  }): Promise<Atendimento>;
}
