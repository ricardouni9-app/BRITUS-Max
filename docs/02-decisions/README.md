---
id: DOC-ADR-INDEX
title: Índice de Architecture Decision Records
status: Active
consumer: Both
updated: 2026-07-24
---

# Architecture Decision Records (ADR)

Formato **MADR**. IDs sequenciais e **imutáveis**. Decisões nunca são apagadas:
ao serem revisadas, o histórico é preservado e o `status` é atualizado
(`Proposed → Accepted → Superseded/Deprecated`).

## Nota de numeração
As decisões **ADR-0001 … ADR-0015** foram estabelecidas no diálogo estratégico de
fundação e serão **materializadas em arquivo sob demanda** (Just-in-Time). A
ADR-0003 foi materializada por ter exigido **revisão formal**; **ADR-0016 a
ADR-0019** foram materializadas na **Sprint 0.9** (arquitetura executável);
**ADR-0020 a ADR-0022** foram materializadas na **Etapa 2.5** (Core/módulos,
custódia local, licenciamento), que **superseded ADR-0016 e ADR-0017**.

## Índice
| ID | Título | Status |
|----|--------|--------|
| ADR-0003 | Runtime oficial do projeto | Accepted (revisado) |
| ADR-0016 | Estilo arquitetural — monólito modular com deploy único | Superseded (por ADR-0021) |
| ADR-0017 | Multitenancy — Organization desde o primeiro modelo | Superseded (por ADR-0020, ADR-0021) |
| ADR-0018 | Estilo de API — REST com contratos Zod compartilhados | Active (complementado — Etapa 2.5) |
| ADR-0019 | Domínio — separação Atendimento/Caso e Registro Comercial Mínimo | Accepted |
| ADR-0020 | Core universal e módulos acopláveis | Accepted |
| ADR-0021 | Custódia local dos dados e fronteira da infraestrutura online | Accepted |
| ADR-0022 | Licenciamento, distribuição e atualização de módulos | Accepted |
