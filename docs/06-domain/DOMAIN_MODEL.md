---
id: DOC-DOMAIN-MODEL
title: Domain Model — BRITUS Platform (domínio completo)
status: Active
version: 3.0
consumer: Both
level: Produto
authority: Produto (PO) + Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-25
related: [ADR-0019, ADR-0020, ADR-0021, ADR-0022, DOC-DATA-MODEL, DOC-API-CONTRACTS, DOC-GLOSSARY, DOC-PROJECT-CHARTER, DOC-ROADMAP, DOC-BACKLOG]
---

# Domain Model — BRITUS Platform

> Documento **conceitual** (ESPEC-001). Descreve o **domínio**, não a implementação:
> sem código, SQL, endpoints, telas ou atributos físicos — estes vivem no **DATA_MODEL**
> (persistência) e nos **contratos de entrada e saída**. Modelo **local-first**
> (ADR-0021): os dados operacionais ficam no ambiente do cliente. Terminologia canônica:
> ver **GLOSSARY**. Separação **Core vs Módulos** e hierarquia **Domínio → Área →
> Especialidade → Recursos**: ADR-0020.

## Convenção terminológica
- O **GLOSSARY** é a **autoridade terminológica**.
- Conceitos de negócio aparecem prioritariamente em **português**; identificadores
  técnicos canônicos já aprovados podem permanecer em **inglês**. Na primeira ocorrência
  relevante: *termo em português* (`CanonicalName`).
- **Caso** não é sinônimo automático de **processo judicial** (conceito genérico; o
  processo é uma manifestação).
- **Cliente** não é necessariamente contratante, interessado ou participante.
- **Organização** não é sinônimo automático de escritório físico, plano, assinatura ou licença.
- Identificadores já materializados e nomes canônicos de eventos **não** são renomeados
  nem traduzidos por estilo editorial.

## 1. Visão Geral
- **Objetivo do sistema:** organizar e acelerar a operação de um escritório de advocacia
  — clientes, atendimentos (recepção comercial), casos (trabalho jurídico), documentos,
  conhecimento e (futuramente) finanças — mantendo a **identidade do escritório** em
  primeiro plano e os **dados sob custódia do cliente**.
- **Limites do domínio:** o **Core** cobre conceitos compartilhados por qualquer área
  profissional; a **Advocacia** é o primeiro **módulo de domínio**. Fora do domínio:
  contabilidade/ERP, execução processual automatizada, aconselhamento jurídico automático.
- **Responsabilidades:** preservar integridade e histórico dos dados operacionais;
  refletir o fluxo natural "atender um cliente"; permitir que módulos acrescentem
  conhecimento **sem duplicar** o Core; nunca assumir custódia central pela Britus.

## 2. Bounded Contexts
Ancorados em ADR-0020. Status: **Atual** (em construção) · **Planejado** (ROADMAP/BACKLOG).

- **Core — Identidade & Operação (Atual):** Organização, Acesso/Usuários, Clientes/Pessoas/
  Contatos, Atendimentos, Casos, Participantes, Documentos, Timeline, Auditoria, Catálogos
  (Área/Tipo). É o **kernel compartilhado**.
- **Advocacia — módulo de domínio (PREVISTO):** **primeiro módulo funcional planejado
  após a fundação do Core**. Áreas e especialidades (ex.: Família → Guarda), conhecimento,
  modelos e recursos específicos; reutiliza Cliente/Caso do Core.
- **Financeiro (Planejado):** gestão financeira por caso (valor contratado, pago, saldo,
  parcelas, recibos, cobrança editável). Ver BACKLOG.
- **Agenda / Prazos (Planejado):** compromissos e prazos vinculados a casos. Ver BACKLOG.
- **Assistente Jurídico Inteligente — copiloto (Planejado):** apoio (localizar, sugerir,
  recuperar conhecimento). Nunca decide. Ver PRODUCT_BRIEF/BACKLOG.
- **Integrações (Planejado):** entrada de contatos/leads (ex.: site). Ver BACKLOG.
- **Distribuição & Licenciamento — Plataforma/DPF (Planejado):** catálogo, versões,
  instalação, atualização e validação de licença de módulos (ADR-0022). **Não** é domínio
  operacional do produto e **não** acessa dados operacionais (ADR-0021).

> Não se criam módulos artificiais: apenas os contextos com sustentação documental
> (ADR-0020/0022, ROADMAP, BACKLOG, PRODUCT_BRIEF) estão listados.

## 3. Agregados
Para cada agregado: finalidade · responsabilidade · proprietário dos dados · ciclo de vida.

- **Organization** — finalidade: escopo organizacional do Core; responsabilidade: raiz de
  escopo dos dados; proprietário: a instalação/cliente; ciclo: criada no setup, `active`/
  `inactive`, **nunca** excluída fisicamente.
- **User (com OrganizationMembership)** — finalidade: identidade de acesso e vínculo com a
  organização + papel; responsabilidade: autenticação/autorização; proprietário: a
  organização; ciclo: convidado → ativo → suspenso → desativado.
- **Client** — finalidade: pessoa/organização atendida (PF/PJ); responsabilidade: dados
  cadastrais reutilizáveis (Captura Única); proprietário: a organização; ciclo: criado (pode
  preceder a contratação), arquivável, não excluível quando possuir Casos.
- **Atendimento** — finalidade: recepção/triagem/oportunidade comercial (o **Lead** é um
  Atendimento em recepção — **não** há entidade "Lead" separada, distinta do **Cliente**);
  responsabilidade: medir conversão e minimizar dados de não convertidos; proprietário: a
  organização; ciclo: máquina de estados (§7), com **Registro Comercial Mínimo** e descarte
  controlado. Ao **converter em Cliente**, associa-se a um Cliente (`clientId`), registra
  `convertedAt` e passa a `status`/`result` = convertido.
- **Caso** — finalidade: trabalho jurídico contratado/assumido (genérico; processo judicial
  é uma manifestação); responsabilidade: execução e histórico; proprietário: a organização;
  ciclo: máquina de estados (§7), histórico **imutável** (arquivamento).
- **Document** — finalidade: documento vinculado a cliente/caso/atendimento; responsabilidade:
  integridade (hash) e acesso autorizado; proprietário: a organização (binário no ambiente do
  cliente); ciclo: registrado → versionado → descarte controlado.

**Registros de apoio (não agregados de negócio):** `Area`/`WorkType` (catálogos
configuráveis), `TimelineEvent` (evento de negócio, append) e `AuditLog` (técnico,
append-only).

## 4. Entidades (raiz e dependentes)
*Sem atributos aqui — atributos físicos: ver DATA_MODEL.*

- **Organization** (raiz) → dependente: vínculos de acesso (Membership).
- **User** (raiz) ↔ **OrganizationMembership** (entidade de associação usuário↔organização + papel).
- **Client** (raiz) → dependentes: contatos e endereços (value objects), documentos vinculados (referência).
- **Atendimento** (raiz) → dependentes: resumo/nota; anexos referenciam Document.
- **Caso** (raiz) → dependentes: **CaseParticipant** (participante com papel), **TimelineEvent** (eventos do caso).
- **Document** (raiz) → dependente: versões do documento.

**Decisão de modelagem — Cliente/Pessoa** `[reversível]`: usar **uma** entidade `Client`
com discriminador **tipo de pessoa (PF | PJ)**, em vez de herança `Person`/`LegalEntity`
(simplicidade antes de abstração).

## 5. Value Objects
Somente onde agregam clareza:
- **Nome/DisplayName** — identificação legível.
- **Contact** — **tipo configurável** + valor (telefone, e-mail, WhatsApp, site, rede social);
  **múltiplos**, sem lista rígida de plataformas (PRODUCT_REQUIREMENTS).
- **Address** — endereço postal.
- **CPF** (PF) / **CNPJ** (PJ) — documentos de identificação (opcionais no 1º contato).
- **ProcessNumber** — número de processo (quando houver; o Caso pode não ter).
- **FinancialClassification** — potencial financeiro (Alto/Médio/Baixo ou faixa).
- **Period** — intervalo de datas (métricas, agenda futura).
- **Estados** (OrganizationStatus, AtendimentoStatus, CaseStatus) — conjuntos controlados.
- **Money** — valor monetário `[Planejado — módulo Financeiro; fora do MVP]`.

## 6. Relacionamentos (texto estruturado)
- **Organization** contém (**composição por escopo**) Users(membership), Clients, Atendimentos, Casos e Documents.
- **User** relaciona-se a **Organization** por **associação** via Membership (com papel).
- **Client** origina/associa-se a **0..N Atendimentos**; a **conversão** de um Atendimento em **Cliente** é **explícita** e **rastreável** — define `clientId` e `convertedAt` — e uma **segunda conversão** do mesmo Atendimento é **rejeitada de forma previsível**. **Atendimento** convertido gera **1..N Casos**, que **preservam a origem** (`atendimentoId`).
- **Caso** agrega **CaseParticipants** e **TimelineEvents** (**composição** — não existem sem o Caso).
- **Document** associa-se a Client e/ou Caso e/ou Atendimento (**associação** de contexto).
- **Area/WorkType** classificam Atendimento/Caso (**associação** com catálogo).
- **Módulo (Advocacia)** **depende do Core** (usa Client/Caso), acrescentando dados próprios — **nunca** duplicando entidades do Core.

## 7. Invariantes (por agregado)
- **Organization:** sempre possui nome; status ∈ {active, inactive}; nunca é excluída fisicamente.
- **User/Membership:** opera sempre sob um vínculo organização+papel; autorização confirma o vínculo; usuário suspenso/desativado não opera.
- **Client:** PF usa CPF e PJ usa CNPJ **quando informados** (opcionais no 1º contato); duplicidade gera **aviso, nunca bloqueio**; Client com Casos **não** é excluído (arquivável).
- **Atendimento:** não convertido mantém **apenas** o Registro Comercial Mínimo; torna-se elegível a descarte **30 dias após a última interação relevante**; descarte é **manual, individual e autorizado só pelo Owner**, com impedimentos verificados; métricas anonimizadas podem ser preservadas. **Conversão em Cliente é explícita** (define `clientId` + `convertedAt` + `status`/`result` = convertido) e **não é idempotência silenciosa** — a reconversão é rejeitada; a origem do Caso permanece por `atendimentoId`.
- **Caso:** pode existir **sem** número de processo; **nasce classificado** (área + tipo + potencial financeiro); histórico **jamais** é apagado (arquivamento); reabertura é auditada; preserva a origem (Atendimento) quando houver.
- **CaseParticipant:** papel **controlado**; um Caso admite **N** clientes; troca de papel com histórico; não removível indevidamente.
- **Document:** integridade por hash; nome físico **não** é identidade; acesso **sempre** autorizado; o binário **não** é enviado por padrão à Britus (ADR-0021).
- **AuditLog:** append-only; **não** guarda conteúdo jurídico integral.
- **Transversais:** escopo organizacional respeitado onde houver dados a isolar; custódia local; sem exclusão física de histórico jurídico.

## 8. Eventos de domínio previstos (alto nível — sem payload)
Classificação: **CONFIRMADO** (agregado já materializado) · **CANDIDATO** (agregado
especificado) · **FUTURO** (módulo planejado).

- `OrganizationCreated` — **CONFIRMADO**.
- `UserInvited` · `UserActivated` · `UserSuspended` · `ClientCreated` · `ClientArchived` ·
  `AtendimentoRegistered` · `AtendimentoRelevantInteractionRecorded` · `AtendimentoConverted` ·
  `AtendimentoClosedUnconverted` · `AtendimentoDiscarded` · `CaseOpened` · `CaseClosed` ·
  `CaseReopened` · `CaseArchived` · `CaseParticipantLinked` · `DocumentAttached` ·
  `DocumentVersioned` — **CANDIDATO**.
- `InvoiceIssued` · `PaymentRecorded` (Financeiro) — **FUTURO**.

> **Sem event sourcing** — eventos são conceituais e podem materializar-se como
> `TimelineEvent` (negócio) ou `AuditLog` (técnico). O genérico `CaseStatusChanged` foi
> **removido** por ser operação técnica/CRUD que duplica as transições específicas do Caso.

## 9. Dependências entre módulos
- **Core** = kernel compartilhado; **não depende** de nenhum módulo.
- **Módulos de domínio** (Advocacia; futuros) **dependem do Core** e acrescentam conhecimento/recursos próprios; **não duplicam** entidades do Core (ADR-0020).
- **Módulos não dependem diretamente entre si** — integração ocorre via Core/contratos.
- **Distribuição & Licenciamento** (ADR-0022) atua **sobre** os módulos (instalar/atualizar/validar licença), **sem** acessar dados operacionais.
- **Proibido:** Core → módulo; módulo → módulo (acoplamento direto); qualquer módulo enviar dados jurídicos operacionais à infraestrutura Britus por padrão.

## 10. Fronteiras arquiteturais
- **Domínio:** entidades, agregados, value objects, invariantes, eventos e máquinas de estado (conceitual). **Não** depende de aplicação, persistência, apresentação ou integrações.
- **Aplicação (casos de uso):** orquestração (criar cliente, converter atendimento, encerrar caso) e autorização — `[Planejado]`.
- **Persistência:** guarda e recupera os dados operacionais no ambiente do cliente; armazenamento de documentos separado — camada substituível.
- **Apresentação:** cliente de apresentação e camada de entrada/saída via **contratos** — `[Planejado]`; não expõe o domínio diretamente.
- **Integrações externas:** `[Planejado]`; fora do núcleo de domínio.
> Regra de dependência: domínio no centro; aplicação, persistência e apresentação na borda. A **materialização tecnológica atual** dessas camadas está no **ARCHITECTURE_OVERVIEW**.

## 11. Decisões em aberto
*Não decididas aqui — registradas para decisão futura (ver RISK_REGISTER/Open Questions).*

> A **validade conceitual dos estados** pertence ao domínio. Os **mecanismos físicos**
> de enforcement, persistência e atualização de timestamps são definidos pelo modelo de
> dados e pela infraestrutura de persistência.

- Modelagem do módulo **Financeiro** (Money, parcelas, recibos, cobrança) — futuro.
- Modelagem de **Agenda/Prazos** — futuro.
- Fronteira e integração do **Assistente Jurídico Inteligente** — futuro.
- **Autenticação/autorização:** biblioteca/estratégia (OQ-04), MFA, recuperação — a decidir na implementação.
- Regras de multiplicidade **Atendimento → Caso** (quando um atendimento gera mais de um caso) — validar com PO/advogado.
- Papéis de participante além dos iniciais (ex.: testemunha) — JIT.
- **Registro mínimo de conflito de interesses** e **base legal/consentimento (LGPD)** como VO/entidade — pendentes de **validação jurídica** (RISK-01).
- Governança de edição dos catálogos (Área/Tipo).
