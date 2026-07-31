import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import { atendimentos } from "./atendimentos.js";
import type { CaseStatus, FinancialClassification } from "@britus/contracts";

// Tabela `cases` — obrigatoriamente vinculada a uma organização. `atendimento_id`
// (opcional) preserva a origem operacional (rastreabilidade). `area_id`/`work_type_id`
// são UUIDs sem FK (catálogo em pacote futuro).
export const cases = pgTable(
  "cases",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    atendimentoId: uuid("atendimento_id").references(() => atendimentos.id),
    areaId: uuid("area_id").notNull(),
    workTypeId: uuid("work_type_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().$type<CaseStatus>(),
    financialClassification: text("financial_classification").notNull().$type<FinancialClassification>(),
    processNumber: text("process_number"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("cases_organization_id_idx").on(t.organizationId)],
);

export type CaseRow = typeof cases.$inferSelect;
