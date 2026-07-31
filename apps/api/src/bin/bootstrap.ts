import { uuidv7 } from "uuidv7";
import { createDatabasePool, createDatabaseClient, createDrizzleAuthStores } from "@britus/db";
import { createArgon2PasswordHasher } from "../auth/crypto.js";
import { runBootstrap } from "../auth/bootstrap.js";

// CLI de PROVISIONAMENTO comercial (Postgres): cria a organização e o PRIMEIRO operador
// (usuário + credencial Argon2id + vínculo). Substitui qualquer rota de seed. Idempotência
// do operador é garantida pelo próprio runBootstrap (ver auth/bootstrap).
//
// Uso: DATABASE_URL=... BOOTSTRAP_EMAIL=... BOOTSTRAP_PASSWORD=... [BOOTSTRAP_NAME=...] \
//      [BOOTSTRAP_ORG_NAME=...] node dist/bin/bootstrap.js
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  const email = process.env.BOOTSTRAP_EMAIL;
  const password = process.env.BOOTSTRAP_PASSWORD;
  const name = process.env.BOOTSTRAP_NAME ?? "Operador";
  const orgName = process.env.BOOTSTRAP_ORG_NAME ?? "Organização";

  const missing = [
    !url && "DATABASE_URL",
    !email && "BOOTSTRAP_EMAIL",
    !password && "BOOTSTRAP_PASSWORD",
  ].filter(Boolean);
  if (missing.length > 0) {
    console.error(`Configuração ausente: ${missing.join(", ")}`);
    process.exit(1);
    return;
  }
  if ((password as string).length < 8) {
    console.error("BOOTSTRAP_PASSWORD deve ter ao menos 8 caracteres.");
    process.exit(1);
    return;
  }

  const pool = createDatabasePool({ connectionString: url as string });
  try {
    const db = createDatabaseClient(pool);
    const organizationId = uuidv7();
    await pool.query("insert into organizations (id,name,status) values ($1,$2,'active')", [organizationId, orgName]);

    const stores = createDrizzleAuthStores(db);
    await runBootstrap(
      { writers: stores.writers, credentials: stores.credentials, credentialWriter: stores.credentialWriter, hasher: createArgon2PasswordHasher() },
      { organizationId, operator: { name, email: email as string, password: password as string, role: "owner" } },
    );

    console.log("✓ Bootstrap concluído.");
    console.log(`  organizationId: ${organizationId}`);
    console.log(`  operador:       ${email} (role=owner)`);
  } finally {
    await pool.end();
  }
}

void main();
