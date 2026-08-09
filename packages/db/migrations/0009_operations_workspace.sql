CREATE TABLE IF NOT EXISTS case_financial_accounts (
  organization_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid PRIMARY KEY REFERENCES cases(id),
  quoted_cents integer NOT NULL DEFAULT 0 CHECK (quoted_cents >= 0),
  contracted_cents integer NOT NULL DEFAULT 0 CHECK (contracted_cents >= 0),
  description text NOT NULL DEFAULT '',
  expected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_financial_accounts_org_idx ON case_financial_accounts(organization_id);
CREATE TABLE IF NOT EXISTS case_payments (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid NOT NULL REFERENCES cases(id), amount_cents integer NOT NULL CHECK (amount_cents > 0),
  paid_at timestamptz NOT NULL, note text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_payments_org_case_idx ON case_payments(organization_id, case_id);
CREATE TABLE IF NOT EXISTS case_notes (
  id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id),
  case_id uuid NOT NULL REFERENCES cases(id), narrative text NOT NULL,
  source text NOT NULL CHECK (source IN ('typed','voice')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS case_notes_org_case_idx ON case_notes(organization_id, case_id, created_at DESC);
CREATE TABLE IF NOT EXISTS team_packages (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id), seats integer NOT NULL DEFAULT 1 CHECK (seats >= 1),
  additional_seat_cents integer NOT NULL DEFAULT 0 CHECK (additional_seat_cents >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);
