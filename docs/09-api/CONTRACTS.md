---
id: DOC-API-CONTRACTS
title: API Contracts — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0018, DOC-DOMAIN-MODEL, DOC-DATA-MODEL]
---

# API Contracts — Núcleo Operacional

> **REST + contratos Zod** (ADR-0018). Este documento descreve **contratos**, não
> implementa endpoints. Todos os contratos serão materializados em
> `packages/contracts` na Sprint 1.

## Convenções transversais
- **Autorização:** deny-by-default no servidor; toda operação confirma vínculo
  usuário↔organização↔recurso; **nenhum** dado de uma organização retorna a outra.
- **Isolamento:** organização derivada da sessão do usuário — **nunca** de parâmetro do cliente.
- **Validação:** integral no servidor via schema Zod (mesma fonte do frontend).
- **Erro padrão:** `{ error: { code, message, details? } }`; sem stack trace; mensagens não vazam dados sensíveis.
- **Paginação padrão:** `?page&pageSize` → `{ items, page, pageSize, total }`; listagens sempre paginadas.
- **Efeitos:** operações multi-passo são **transacionais**; efeitos colaterais listados por operação.
- **Eventos:** cada operação declara o `TimelineEvent` (negócio) e/ou `AuditLog` (técnico) que gera.

## Recursos e operações

### Clients
| Operação | Entrada | Saída | Autz | Efeitos (timeline/audit) |
|---|---|---|---|---|
| criar | dados mínimos do cliente | Client | Owner/Lawyer/Assistant | audit: CLIENT_CREATED |
| listar/buscar | filtros+paginação | página de Client | qualquer membro | — |
| visualizar | id | Client | membro | — |
| atualizar | id+campos | Client | Owner/Lawyer | audit: CLIENT_UPDATED |
| arquivar | id | Client | Owner/Lawyer | audit: CLIENT_ARCHIVED |
| verificar duplicidade | cpf/cnpj/email/telefone | avisos (não bloqueio) | membro | — |

### Atendimentos
| Operação | Notas |
|---|---|
| criar | pode preceder Client; captura canal/área/tipo aparente; `Registro Comercial Mínimo` |
| listar/buscar/visualizar | filtros por status/período/origem |
| atualizar | mantém minimização; registra `last_relevant_interaction_at` |
| registrar interação relevante | atualiza `last_relevant_interaction_at`; **visualização não conta** |
| encerrar | `result` (convertido/não contratado/incompatível/conflito/sem retorno/encaminhado/outro) |
| converter em Caso | cria 1..N Casos; preserva origem; audit: ATENDIMENTO_CONVERTED |
| marcar elegível/solicitar descarte | Lawyer/Assistant **solicitam**; ver descarte |
| descartar | **somente Owner**; valida impedimentos; anonimiza/remove PII+anexos; preserva métrica; audit: ATENDIMENTO_DISCARDED |

### Cases
| Operação | Notas |
|---|---|
| criar | origem rastreável (atendimento) ou criação direta excepcional autorizada |
| listar/buscar/visualizar | filtros por status/área/tipo |
| atualizar | campos do caso |
| alterar status | máquina de estados; timeline: STATUS_CHANGED |
| vincular/desvincular participante | papel controlado; desvínculo quando permitido |
| encerrar/reabrir | reabertura auditada; timeline correspondente |
| arquivar | sem exclusão de histórico |

### Documents
| Operação | Notas |
|---|---|
| registrar metadados | vínculo org/cliente/caso/atendimento |
| anexar arquivo | valida tipo/tamanho; calcula `content_hash`; storage fora do banco |
| listar/visualizar/baixar | **sempre** mediado por autorização |
| alterar classificação | audit |
| nova versão | versionamento quando necessário |
| arquivar/excluir | conforme política de retenção/descarte |

### Timeline
Listar eventos (filtro por tipo/período); registrar nota (evento de negócio).

### Dashboard
Obter indicadores (filtro por período/área/status). Fonte e fórmulas: ver NFR/README do dashboard (Sprint 1). Sem PII em métricas anonimizadas.

## Fora deste contrato (JIT)
Billing, planos, pagamentos, medição de uso, API pública versionada, endpoints de IA/automação.
