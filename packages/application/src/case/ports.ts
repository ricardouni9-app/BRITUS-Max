import type { Case, CreateCaseInput } from "@britus/contracts";

// Persistência de Caso — org-scoped.
export interface CaseRepository {
  create(organizationId: string, input: CreateCaseInput): Promise<Case>;
}
