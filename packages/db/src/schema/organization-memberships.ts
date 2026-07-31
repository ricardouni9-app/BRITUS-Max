import { pgTable, uuid, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";
import { organizations } from "./organizations.js";
import { users } from "./users.js";
import type { UserRole } from "@britus/contracts";

// Vínculo usuário↔organização com papel. Unicidade (organization_id, user_id): um usuário
// tem no máximo um vínculo por organização (multi-org via múltiplas linhas).
export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: uuid("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull().$type<UserRole>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("org_memberships_org_user_unique").on(t.organizationId, t.userId),
    index("org_memberships_user_idx").on(t.userId),
  ],
);

export type OrganizationMembershipRow = typeof organizationMemberships.$inferSelect;
