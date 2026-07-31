import { pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import type { Contact, Address } from "@britus/contracts";

// Tabela `clients` — obrigatoriamente vinculada a uma organização (`organization_id`).
// `id` UUID gerado no lado da aplicação (uuidv7). Unicidade documental **por organização**
// (índices únicos PARCIAIS): o mesmo CPF/CNPJ pode existir em organizações distintas.
export const clients = pgTable(
  "clients",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    personType: text("person_type").notNull().$type<"pf" | "pj">(),
    displayName: text("display_name").notNull(),
    cpf: text("cpf"),
    cnpj: text("cnpj"),
    contacts: jsonb("contacts")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Contact[]>(),
    addresses: jsonb("addresses")
      .notNull()
      .default(sql`'[]'::jsonb`)
      .$type<Address[]>(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("clients_organization_id_idx").on(t.organizationId),
    uniqueIndex("clients_org_cpf_unique").on(t.organizationId, t.cpf).where(sql`${t.cpf} is not null`),
    uniqueIndex("clients_org_cnpj_unique").on(t.organizationId, t.cnpj).where(sql`${t.cnpj} is not null`),
  ],
);

export type ClientRow = typeof clients.$inferSelect;
