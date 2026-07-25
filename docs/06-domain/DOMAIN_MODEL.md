---
id: DOC-DOMAIN-MODEL
title: Domain Model — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Produto
authority: Produto (PO) + Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0017, ADR-0019, DOC-DATA-MODEL, DOC-API-CONTRACTS]
---

# Domain Model — Núcleo Operacional

> Capacidade planejada; ainda não implementada. Toda entidade pertence a uma
> `Organization` (isolamento — ADR-0017).

## Linguagem ubíqua (essencial)
- **Atendimento** — recepção/triagem/oportunidade comercial; pode ou não virar Caso.
- **Caso** — trabalho jurídico contratado/assumido (judicial, administrativo, consultivo ou extrajudicial). Pode existir sem número de processo.
- **Registro Comercial Mínimo** — conjunto mínimo de dados de um Atendimento (especialmente não convertido), sob minimização.
- **Participante** — pessoa/organização vinculada a um Caso com um **papel** controlado.

## Decisão de modelagem — Cliente/Pessoa
**`DECISÃO TÉCNICA (Claude, reversível):`** usar **uma entidade `Client`** com
discriminador **`person_type` (PF | PJ)** e campos específicos por tipo, em vez de
herança `Person`/`LegalEntity`. Justificativa: simplicidade antes de abstração;
evita herança complexa sem necessidade real. Reavaliar só se surgir requisito concreto.

## Entidades

### Organization
Tenant. Britus = primeira organização. Atributos: `id`, `name`, `status`, timestamps.
Invariante: raiz de isolamento — todo dado operacional referencia uma organização.

### User / OrganizationMembership
`User`: identidade de acesso (`id`, `name`, `email`, `status` ativo/suspenso/desativado).
`OrganizationMembership`: vínculo usuário↔organização + **role** (`Owner`|`Lawyer`|`Assistant`).
Autorização confirma o vínculo (ADR-0017). MFA e recuperação = capacidade planejada.

### Client
`id`, `organization_id`, `person_type` (PF|PJ), `display_name`, documento condicional
(`cpf` para PF, `cnpj` para PJ — opcionais no 1º contato), contatos e endereços associados.
Regra de duplicidade: ver Data Model (aviso, nunca bloqueio). Cliente pode existir
antes da contratação. Não excluível quando possuir Casos; arquivável.

### Contact / Address
Value-objects reutilizáveis (Captura Única): telefone/e-mail/canal; logradouro/cidade/UF/CEP.
Vinculados a Client e/ou participantes. Nunca redigitados quando já existentes.

### Atendimento
`id`, `organization_id`, `client_id?` (pode preceder o cliente formal), `channel_origin`,
`area_id?`, `work_type_id?`, `status`, `result`, `non_conversion_reason?`,
`assigned_user_id`, `summary` (curto — ver UX), `conflict_flag`, `first_contact_at`,
`last_relevant_interaction_at`, `discard_eligible_at`, `discarded_at?`, `discarded_by?`.
**Máquina de estados:** `Novo → Em triagem → Qualificado → (Convertido | Não convertido) → Elegível para descarte → Descartado`.
`Convertido` gera 1..N Casos e preserva a origem. **Registro Comercial Mínimo** = o
subconjunto mínimo mantido para não convertidos (minimização — ver Security & Privacy).

### Caso
`id`, `organization_id`, `atendimento_id?` (origem rastreável), `area_id`, `work_type_id`,
`status`, `financial_classification` (Alto|Médio|Baixo ou faixa), `process_number?`,
`title`, timestamps, `archived_at?`.
**Máquina de estados (reduzida):** `Triagem → Ativo → Aguardando(motivo) → Encerrado → Arquivado`, + `Cancelado`. Reabertura `Encerrado→Ativo` é auditada. Histórico nunca é apagado.

### CaseParticipant
Uma **única** relação com papel controlado (evita tabela por papel):
`id`, `organization_id`, `case_id`, `party_ref` (Client/Contact), `role`
(`cliente|parte_contraria|representante|responsavel_financeiro|terceiro|advogado_externo`),
`is_primary?`. Permite N clientes por Caso; uma pessoa em N Casos; troca de papel controlada e com histórico. `testemunha` adiado (JIT).

### Area (catálogo) / WorkType (catálogo)
Configuráveis (ativar/desativar/ordenar); **não** enum rígido no código; não excluíveis
com histórico vinculado. Áreas iniciais e tipos: ver PRODUCT_BRIEF/decisões do PO.

### Document
Metadados no banco; binário no storage (fora do banco). `id`, `organization_id`,
vínculo com `client_id?`/`case_id?`/`atendimento_id?`, `category`, `original_name`
(metadado), `physical_key` (não confiável como identidade), `content_hash`, `size`,
`mime`, `version`, `confidentiality`, timestamps. Acesso sempre mediado por autorização.

### TimelineEvent (negócio) vs AuditLog (técnico)
**TimelineEvent** (visível ao usuário): caso criado, documento incluído, status alterado,
nota registrada, contato realizado, encerramento, reabertura. Append (não é fluxo de exclusão).
**AuditLog** (técnico, não editável): `user`, `organization`, `entity`, `action`, `timestamp`,
valores antes/depois quando adequado, origem, resultado, correlação. **Não** guarda conteúdo
jurídico integral. Append-only em nível de aplicação (sem event sourcing).

### Encerramento
Não é entidade separada: atributos de desfecho em `Atendimento` (`result`,
`non_conversion_reason`) e em `Caso` (`status=Encerrado` + motivo). Preserva histórico.

### Métricas anonimizadas
Derivadas/preservadas sem PII (período, canal, área, tipo, resultado, conflito sem detalhe).
Ver estratégia no Data Model e Security & Privacy.

## Invariantes transversais
- Todo registro operacional tem `organization_id`; consultas sempre filtram por organização.
- Nada de exclusão física de histórico jurídico; usa-se arquivamento.
- Duplicidade gera aviso, nunca bloqueio no 1º contato.
