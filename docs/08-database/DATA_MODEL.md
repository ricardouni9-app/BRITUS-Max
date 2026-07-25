---
id: DOC-DATA-MODEL
title: Data Model — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [DOC-DOMAIN-MODEL, ADR-0017, DOC-SECURITY-PRIVACY]
---

# Data Model — Núcleo Operacional

> Modelo lógico inicial (PostgreSQL + Drizzle). **Não** executar migrations nesta
> fase. Convenções: `id` UUIDv7, `timestamptz` em UTC, `created_at`/`updated_at`,
> `archived_at` onde há arquivamento, `deleted_at` **apenas** onde a exclusão lógica
> for realmente necessária. `organization_id` em toda tabela tenant-scoped.

## Diagrama ER (Mermaid)
```mermaid
erDiagram
  ORGANIZATION ||--o{ USER_MEMBERSHIP : has
  ORGANIZATION ||--o{ CLIENT : owns
  ORGANIZATION ||--o{ ATENDIMENTO : owns
  ORGANIZATION ||--o{ CASE : owns
  USER ||--o{ USER_MEMBERSHIP : belongs
  CLIENT ||--o{ ATENDIMENTO : originates
  ATENDIMENTO ||--o{ CASE : converts_to
  CLIENT ||--o{ CASE_PARTICIPANT : party
  CASE ||--o{ CASE_PARTICIPANT : has
  CASE ||--o{ DOCUMENT : has
  ATENDIMENTO ||--o{ DOCUMENT : has
  CLIENT ||--o{ DOCUMENT : has
  CASE ||--o{ TIMELINE_EVENT : records
  AREA ||--o{ CASE : classifies
  WORK_TYPE ||--o{ CASE : classifies
```

## Tabelas (resumo lógico)

### organizations
PK `id`; `name`, `status`; timestamps. Raiz de isolamento.

### users
PK `id`; `name`, `email` (único global, `citext`), `password_hash`, `status`; timestamps.

### organization_memberships
PK `id`; FK `organization_id`, FK `user_id`; `role` (`owner|lawyer|assistant`);
UNIQUE(`organization_id`,`user_id`). Índice por `organization_id`.

### clients
PK `id`; FK `organization_id`; `person_type` (`pf|pj`); `display_name`;
`cpf` (nullable), `cnpj` (nullable); `archived_at?`; timestamps.
- UNIQUE **parcial**: `(organization_id, cpf) WHERE cpf IS NOT NULL`; idem `cnpj`.
- Índices: `organization_id`, `display_name`.

### contacts / addresses
FK `organization_id`, FK `client_id?`; contatos (`channel`, `value`), endereços
(`street,number,city,state,zip`). Reutilizáveis (Captura Única).

### atendimentos
PK `id`; FK `organization_id`; FK `client_id?`; `channel_origin`; FK `area_id?`,
FK `work_type_id?`; `status`; `result?`; `non_conversion_reason?`; `assigned_user_id`;
`summary` (texto curto — sem constraint rígida de tamanho, ver NFR/UX); `conflict_flag`;
`first_contact_at`; `last_relevant_interaction_at`; `discard_eligible_at` (derivado:
`last_relevant_interaction_at + 30d`); `discarded_at?`; `discarded_by?`; `anonymized_at?`.
- Índices: `organization_id`, `status`, `last_relevant_interaction_at`.
- Após descarte: PII e `summary` removidos/anonimizados; campos de métrica anonimizada preservados.

### cases
PK `id`; FK `organization_id`; FK `atendimento_id?`; FK `area_id`, FK `work_type_id`;
`status`; `financial_classification`; `process_number?`; `title`; `archived_at?`; timestamps.
- Índices: `organization_id`, `status`, `area_id`.
- Sem `deleted_at` (histórico jurídico não é excluído; usa `archived_at`).

### case_participants
PK `id`; FK `organization_id`; FK `case_id`; `party_ref` (client/contact); `role`
(controlado); `is_primary?`; timestamps. UNIQUE(`case_id`,`party_ref`,`role`).

### areas / work_types (catálogos)
PK `id`; FK `organization_id`; `name`; `active`; `sort_order`. Não excluíveis com
histórico (proteção via FK/constraint aplicacional).

### documents
PK `id`; FK `organization_id`; FK `client_id?`/`case_id?`/`atendimento_id?`; `category`;
`original_name`; `physical_key`; `content_hash`; `size`; `mime`; `version`;
`confidentiality`; timestamps; `deleted_at?` (descarte controlado).
- Integridade: `content_hash` obrigatório; `physical_key` nunca é identidade.

### timeline_events
PK `id`; FK `organization_id`; FK `case_id`; `type`; `payload` (mínimo, sem conteúdo sensível desnecessário); `created_by`; `created_at`. Append.

### audit_logs
PK `id`; FK `organization_id`; `actor_user_id`; `entity`, `entity_id`; `action`;
`before?`/`after?` (mínimos, sem conteúdo jurídico integral); `origin`; `result`;
`correlation_id`; `created_at`. **Append-only**; sem update/delete pelo fluxo comum.

### commercial_metrics (anonimizado) — estratégia
Recomendação MVP: **anonimização in-place** do `atendimento` (remover PII, manter
campos comerciais anonimizados) em vez de tabela estatística separada. Alternativa
(registro estatístico agregado separado) fica `[ADIADA — JIT]`.

## Integridade e catálogos
Constraints de banco como defesa (FKs, uniques parciais, checks de enum); catálogos
como **tabelas configuráveis** (não enums de código); índices criados a partir de
consultas reais (listagens por organização/status/área/data).

## Segregação por organização
`organization_id` em toda tabela tenant-scoped; toda query filtra por organização;
autorização confirma vínculo (ADR-0017); testes de isolamento obrigatórios (Sprint 1).
