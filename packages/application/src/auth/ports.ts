import type {
  User,
  PlatformIdentity,
  Credential,
  Session,
  SubjectType,
  ContextMembership,
} from "@britus/contracts";

// Leitura de identidades (usuário organizacional e Criador) — separada da credencial.
export interface IdentityReader {
  findUserByEmail(normalizedEmail: string): Promise<{ readonly id: string } | null>;
  findUserById(id: string): Promise<User | null>;
  findCreatorById(id: string): Promise<PlatformIdentity | null>;
}

// Memberships do usuário (para derivar contexto e validar organização ativa).
export interface MembershipReader {
  listByUser(userId: string): Promise<readonly ContextMembership[]>;
}

// Credencial por subject (1:1). Retorna apenas o hash + metadados — nunca senha.
export interface CredentialStore {
  findBySubject(subject: { readonly type: SubjectType; readonly id: string }): Promise<Credential | null>;
}

// Escrita de credencial (bootstrap/provisionamento). Recebe SÓ o hash — nunca a senha.
export interface CredentialWriter {
  create(input: {
    readonly subjectType: SubjectType;
    readonly subjectId: string;
    readonly secretHash: string;
    readonly algorithm: string;
  }): Promise<Credential>;
}

// Hashing de senha atrás de abstração substituível (produção: argon2id; default local: scrypt).
export interface PasswordHasher {
  readonly algorithm: string;
  hash(secret: string): Promise<string>;
  verify(secret: string, encodedHash: string): Promise<boolean>;
}

// Geração de token de sessão OPACO (CSPRNG) + token CSRF. O token bruto nunca é persistido
// (só seu hash); `hash` reproduz o hash para lookup.
export interface SessionTokenFactory {
  generate(): { readonly token: string; readonly tokenHash: string; readonly csrfToken: string };
  hash(token: string): string;
}

// Sessão stateful revogável. `findValidByTokenHash` só retorna sessões NÃO expiradas e NÃO
// revogadas (revogação/expiração efetivas na leitura).
export interface SessionStore {
  create(input: {
    readonly tokenHash: string;
    readonly subjectType: SubjectType;
    readonly subjectId: string;
    readonly csrfToken: string;
    readonly expiresAt: Date;
  }): Promise<Session>;
  findValidByTokenHash(tokenHash: string, now: Date): Promise<Session | null>;
  revoke(sessionId: string, now: Date): Promise<void>;
  setActiveOrganization(sessionId: string, organizationId: string | null): Promise<Session>;
}

// Normaliza e-mail conforme a política (case-insensitive, sem espaços). Reutilizado por
// autenticação, adapters e bootstrap para garantir unicidade coerente.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
