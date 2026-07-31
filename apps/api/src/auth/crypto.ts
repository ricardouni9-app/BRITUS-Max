import { randomBytes, createHash } from "node:crypto";
import { hash as argon2Hash, hashSync as argon2HashSync, verify as argon2Verify } from "@node-rs/argon2";
import type { PasswordHasher, SessionTokenFactory } from "@britus/application";

// Parâmetros Argon2id EXPLÍCITOS e centralizados (alinhados ao OWASP; ajustáveis num único
// lugar). O `@node-rs/argon2` usa Argon2id por padrão → saída PHC `$argon2id$v=19$m=..$t=..$p=..`,
// versionável e suficiente para detectar necessidade de rehash no futuro.
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// Hasher Argon2id atrás do port `PasswordHasher`. Segredo bruto nunca persistido/logado.
export function createArgon2PasswordHasher(): PasswordHasher {
  return {
    algorithm: "argon2id",
    async hash(secret) {
      return argon2Hash(secret, ARGON2_OPTIONS);
    },
    async verify(secret, encoded) {
      // `verify` lança em hash malformado → tratamos como inválido, sem vazar detalhes.
      try {
        return await argon2Verify(encoded, secret);
      } catch {
        return false;
      }
    },
  };
}

// Hash "dummy" válido gerado POR PROCESSO (nunca versionado) para verificação em tempo
// ~constante quando o usuário não existe.
export function createDummyPasswordHash(): string {
  return argon2HashSync(randomBytes(16).toString("hex"), ARGON2_OPTIONS);
}

// Token de sessão OPACO (CSPRNG) + token CSRF (double-submit, validado server-side contra a
// sessão). Persiste-se apenas o SHA-256 do token de sessão; o token bruto nunca é guardado.
export function createSessionTokenFactory(): SessionTokenFactory {
  const hashToken = (token: string): string => createHash("sha256").update(token).digest("base64url");
  return {
    generate() {
      const token = randomBytes(32).toString("base64url");
      return { token, tokenHash: hashToken(token), csrfToken: randomBytes(24).toString("base64url") };
    },
    hash(token) {
      return hashToken(token);
    },
  };
}
