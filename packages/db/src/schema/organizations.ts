import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

// Tabela `organizations` — escopo organizacional do Core (ADR-0020) sob custódia
// local (ADR-0021). `id` UUID gerado no **lado da aplicação** (uuidv7), na camada
// de persistência — NÃO pelo banco. Sem cobrança/plano/licença/módulos; sem
// `tenant_id`; sem multitenancy de servidor; sem dados específicos de qualquer escritório.
export const organizations = pgTable("organizations", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  taxId: text("tax_id"),
  email: text("email"),
  phone: text("phone"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  profileCompletedAt: timestamp("profile_completed_at", { withTimezone: true }),
  status: text("status").notNull().default("active").$type<"active" | "inactive">(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type OrganizationRow = typeof organizations.$inferSelect;
