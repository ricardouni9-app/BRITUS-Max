import { z } from "zod";
import { uuidSchema } from "./shared.js";

// Catálogos configuráveis (ativar/desativar/ordenar) — não enum rígido no código.
const catalogNameSchema = z.string().trim().min(1).max(120);

export const areaSchema = z.object({
  id: uuidSchema,
  name: catalogNameSchema,
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type Area = z.infer<typeof areaSchema>;

export const workTypeSchema = z.object({
  id: uuidSchema,
  name: catalogNameSchema,
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type WorkType = z.infer<typeof workTypeSchema>;
