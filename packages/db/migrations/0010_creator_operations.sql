CREATE TABLE IF NOT EXISTS platform_operations_settings (
 id text PRIMARY KEY DEFAULT 'primary', maintenance_mode boolean NOT NULL DEFAULT false,
 maintenance_message text NOT NULL DEFAULT 'Sistema em manutenção segura. Retornaremos em breve.',
 temporary_notice text, notice_expires_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_operations_settings(id) VALUES('primary') ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS platform_operations_audit (
 id uuid PRIMARY KEY, creator_id uuid NOT NULL, action text NOT NULL, target_organization_id uuid,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_operations_audit_created_idx ON platform_operations_audit(created_at DESC);
