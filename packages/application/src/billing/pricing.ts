import type { ProductModule, Currency } from "@britus/contracts";
import { ok, err, type Result } from "../result.js";
import { validationError, type ApplicationError } from "../errors.js";

export interface PriceQuote {
  readonly amountCents: number;
  readonly currency: Currency;
  readonly items: readonly { readonly moduleCode: string; readonly priceCents: number }[];
}

// Composição INCREMENTAL determinística: soma dos preços (em centavos) dos módulos.
// Exige moeda única. Sem float, sem efeitos colaterais.
export function computePrice(modules: readonly ProductModule[]): Result<PriceQuote, ApplicationError> {
  const [first, ...rest] = modules;
  if (first === undefined) {
    return err(validationError("Nenhum módulo selecionado"));
  }
  const currency = first.currency;
  if (!rest.every((m) => m.currency === currency)) {
    return err(validationError("Moedas divergentes entre módulos"));
  }
  const amountCents = modules.reduce((sum, m) => sum + m.priceCents, 0);
  return ok({
    amountCents,
    currency,
    items: modules.map((m) => ({ moduleCode: m.code, priceCents: m.priceCents })),
  });
}
