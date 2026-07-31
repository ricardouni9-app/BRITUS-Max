import type { Subscription, SubscriptionItem, ProductModule } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, notFoundError, type ApplicationError } from "../errors.js";
import type { SubscriptionStore, CatalogReader } from "./ports.js";
import { computePrice } from "./pricing.js";

export interface ContractModulesResult {
  readonly subscription: Subscription;
  readonly items: readonly SubscriptionItem[];
  readonly totalCents: number;
}

export interface ContractModulesDeps {
  readonly subscriptions: SubscriptionStore;
  readonly catalog: CatalogReader;
}

// Seleciona/contrata módulos. Faz SNAPSHOT do preço atual do catálogo nos itens da
// assinatura → mudanças futuras no catálogo NÃO alteram cobrança já contratada.
export function makeContractModules(deps: ContractModulesDeps) {
  return {
    async execute(input: {
      organizationId: string;
      moduleCodes: readonly string[];
    }): Promise<Result<ContractModulesResult, ApplicationError>> {
      const subscription = await deps.subscriptions.findByOrganization(input.organizationId);
      if (subscription === null) {
        return err(notFoundError("Assinatura não encontrada; inicie o trial antes de contratar"));
      }
      const modules: ProductModule[] = [];
      for (const code of input.moduleCodes) {
        const found = await deps.catalog.findModule(code);
        if (found === null || !found.active) {
          return err(validationError(`Módulo indisponível: ${code}`));
        }
        modules.push(found);
      }
      const priced = computePrice(modules);
      if (!priced.ok) {
        return err(priced.error);
      }
      const items = await deps.subscriptions.replaceItems(
        subscription.id,
        modules.map((m) => ({ moduleCode: m.code, priceCents: m.priceCents, currency: m.currency })),
      );
      return ok({ subscription, items, totalCents: priced.value.amountCents });
    },
  };
}
