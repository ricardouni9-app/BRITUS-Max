import { pgTable, uuid, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import type { SubjectType } from "@britus/contracts";

// Credencial SEPARADA da identidade (1:1 por subject). `subject_id` é polimórfico
// (user OU creator) — por isso SEM FK. Guarda apenas hash + algoritmo; nunca senha.
export const credentials = pgTable(
  "credentials",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    subjectType: text("subject_type").notNull().$type<SubjectType>(),
    subjectId: uuid("subject_id").notNull(),
    secretHash: text("secret_hash").notNull(),
    algorithm: text("algorithm").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("credentials_subject_unique").on(t.subjectType, t.subjectId)],
);

export type CredentialRow = typeof credentials.$inferSelect;
