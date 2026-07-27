---
id: DOC-RELIABILITY
title: Reliability Baseline — Núcleo Operacional
status: Active
version: 2.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-25
related: [DOC-SECURITY-PRIVACY, DOC-NFR, ADR-0021, DOC-BACKLOG]
---

# Reliability Baseline — Núcleo Operacional

> **Custódia local (ADR-0021):** os dados residem no **ambiente do cliente**. **Backup e
> recuperação são responsabilidade do cliente**; a **Britus não faz backup dos dados
> operacionais**. Os objetivos abaixo são **referência para o ambiente do cliente**, não
> SLA da Britus.

## Objetivos de referência (ambiente do cliente)
- **RPO ≤ 24h** (perda máxima aceitável de dados) — referência inicial, revisável.
- **RTO ≤ 8h** (tempo máximo para restaurar operação) — referência inicial, revisável.

## Cópias e backup (responsabilidade do cliente)
Distinguir:
- **Exportação documental** (PDF/TXT) — para leitura; **não** substitui backup restaurável.
- **Cópia restaurável** — formato técnico que permite recuperar o sistema.
- **Backup externo** — mantido pelo próprio cliente, fora do ambiente operacional.

O software deverá **oferecer mecanismos** de exportação e cópia restaurável e emitir
**avisos claros e discretos** para o cliente manter cópia externa. **Não** se fixa caminho
definitivo no sistema operacional. Solução técnica definitiva de backup local: **a
decidir** (BACKLOG).

## Integridade
Operações críticas **transacionais**; constraints no banco; prevenção de registros
órfãos; `content_hash` para arquivos; versionamento otimista (`updated_at`/versão).

## Falhas (proporcional ao MVP)
Timeouts e tratamento de erros padronizado; idempotência onde fizer sentido (uploads);
tratamento de uploads incompletos; rollback transacional. **Sem** filas, circuit breaker
ou event bus no MVP (JIT).

## Continuidade
Exportação dos dados; independência de fornecedor (adaptadores substituíveis);
documentação de migração; acesso emergencial controlado.

## Critérios antes de usar dados reais (no ambiente do cliente)
Cópia restaurável testável + TLS quando houver rede + acesso administrativo protegido +
exportação + avisos de cópia externa ativos (ver Security & Privacy Baseline).
