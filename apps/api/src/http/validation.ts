import type { z } from "zod";
import { ValidationError } from "./errors.js";

// Validação reutilizável de params/query/body contra um schema Zod (de
// @britus/contracts ou local). Falha → ValidationError (mapeada a 400 pelo handler).
export function parseInput<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError("Invalid request input");
  }
  return result.data;
}
