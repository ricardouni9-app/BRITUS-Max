import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import type { SubjectType } from "@britus/contracts";

// Sessão STATEFUL. Guarda apenas o HASH do token opaco (nunca o token bruto).
// `subject_id` é polimórfico (user|creator) → sem FK. `active_organization_id` é validado
// ⊆ memberships na aplicação. Revogação/expiração explícitas.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    tokenHash: text("token_hash").notNull(),
    subjectType: text("subject_type").notNull().$type<SubjectType>(),
    subjectId: uuid("subject_id").notNull(),
    csrfToken: text("csrf_token").notNull(),
    activeOrganizationId: uuid("active_organization_id").references(() => organizations.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("sessions_token_hash_unique").on(t.tokenHash),
    index("sessions_subject_idx").on(t.subjectType, t.subjectId),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
