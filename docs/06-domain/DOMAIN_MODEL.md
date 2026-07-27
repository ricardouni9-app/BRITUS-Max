---
id: DOC-DOMAIN-MODEL
title: Domain Model — Núcleo Operacional
status: Active
version: 2.0
consumer: Both
level: Produto
authority: Produto (PO) + Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-25
related: [ADR-0019, ADR-0020, ADR-0021, DOC-DATA-MODEL, DOC-API-CONTRACTS]
---

# Domain Model — Núcleo Operacional

> Capacidade planejada; ainda não implementada. Modelo **local-first** (ADR-0021):
> `Organization` é conceito do **Core** e o escopo organizacional ocorre **dentro do
> ambiente do cliente** — não se afirma uma única organização por instalação.

> **Revisão — Etapa 2.5 (2026-07-25):** introduz-se a hierarquia **Domínio → Área →
> Especialidade → Recursos** (ADR-0020) e a distinção **Core vs Módulo** (módulos não
> duplicam entidades do Core). O **Caso** é conceito **genérico**; processo judicial é
> uma manifestação. `Organization` permanece conceito do Core (ADR-0021): não se afirma
> uma única organização por instalação nem se impõe/elimina `organization_id` agora.
> Ver GLOSSARY e ADR-0020.

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
Conceito de **escopo organizacional do Core** (ADR-0020). A Britus Advocacia é o
escritório-piloto. Atributos: `id`, `name`, `status`, timestamps. A materialização do
escopo (`organization_id`) é decidida na modelagem (Etapa 3+); uma instalação **não** é
obrigatoriamente mono-organização (ADR-0021).

### User / OrganizationMembership
`User`: identidade de acesso (`id`, `name`, `email`, `status` ativo/suspenso/desativado).
`OrganizationMembership`: vínculo usuário↔organização + **role** (`Owner`|`Lawyer`|`Assistant`).
Autorização confirma o vínculo (ADR-0021). MFA e recuperação = capacidade planejada.

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
- Onde houver escopo organizacional, as consultas o respeitam; a materialização de
  `organization_id` é decidida na Etapa 3+ (ADR-0020/0021).
- Nada de exclusão física de histórico jurídico; usa-se arquivamento.
- Duplicidade gera aviso, nunca bloqueio no 1º contato.
