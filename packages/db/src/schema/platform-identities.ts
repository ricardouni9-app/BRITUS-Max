import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

// Identidade GLOBAL da plataforma (Criador). Entidade distinta de `users` — o Criador
// NÃO tem membership organizacional e nunca é um usuário organizacional. `kind` é ÚNICO:
// há no máximo um Criador (idempotência/concorrência do bootstrap garantidas no banco).
export const platformIdentities = pgTable(
  "platform_identities",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    kind: text("kind").notNull().default("creator").$type<"creator">(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("platform_identities_kind_unique").on(t.kind)],
);

export type PlatformIdentityRow = typeof platformIdentities.$inferSelect;
