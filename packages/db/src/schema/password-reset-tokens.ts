import { pgTable, uuid, text, timestamp, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import type { SubjectType } from "@britus/contracts";

// Token bruto é enviado somente por e-mail. O banco guarda exclusivamente SHA-256.
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    subjectType: text("subject_type").notNull().$type<SubjectType>(),
    subjectId: uuid("subject_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("password_reset_subject_idx").on(table.subjectType, table.subjectId)],
);
