import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import type { UserStatus } from "@britus/contracts";

// Usuário organizacional. E-mail **normalizado** (lowercase) na aplicação e **único**.
// O papel NÃO vive aqui — pertence exclusivamente ao membership.
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    email: text("email").notNull(),
    status: text("status").notNull().default("active").$type<UserStatus>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);

export type UserRow = typeof users.$inferSelect;
