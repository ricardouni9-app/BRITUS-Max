import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import { clients } from "./clients.js";
import type { AtendimentoStatus, AtendimentoResult } from "@britus/contracts";

// Tabela `atendimentos` — recepção/lead, obrigatoriamente vinculada a uma organização.
// `client_id` (quando convertido/associado) referencia `clients`. `converted_at`/`result`
// registram a conversão. `area_id`/`work_type_id`/`assigned_user_id` são UUIDs sem FK
// (catálogo e usuários materializados em pacotes futuros).
export const atendimentos = pgTable(
  "atendimentos",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    clientId: uuid("client_id").references(() => clients.id),
    channelOrigin: text("channel_origin"),
    areaId: uuid("area_id"),
    workTypeId: uuid("work_type_id"),
    assignedUserId: uuid("assigned_user_id"),
    status: text("status").notNull().$type<AtendimentoStatus>(),
    result: text("result").$type<AtendimentoResult>(),
    nonConversionReason: text("non_conversion_reason"),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    summary: text("summary"),
    conflictFlag: boolean("conflict_flag").notNull().default(false),
    firstContactAt: timestamp("first_contact_at", { withTimezone: true }).notNull().defaultNow(),
    lastRelevantInteractionAt: timestamp("last_relevant_interaction_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("atendimentos_organization_id_idx").on(t.organizationId)],
);

export type AtendimentoRow = typeof atendimentos.$inferSelect;
