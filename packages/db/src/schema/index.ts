// Barrel de schemas Drizzle (Core).
//
// Tabelas do Core seguindo ADR-0020 (Core universal e módulos acopláveis) e
// ADR-0021 (custódia local dos dados). Módulos não duplicam entidades do Core.
// Entidades operacionais (clients/atendimentos/cases) são **tenant-aware**:
// `organization_id` obrigatório + isolamento nas consultas/mutações (ver adapters).
export * from "./organizations.js";
export * from "./clients.js";
export * from "./atendimentos.js";
export * from "./cases.js";
export * from "./users.js";
export * from "./organization-memberships.js";
export * from "./platform-identities.js";
export * from "./credentials.js";
export * from "./sessions.js";
export * from "./billing.js";
export * from "./case-tasks.js";
export * from "./commercial-leads.js";
