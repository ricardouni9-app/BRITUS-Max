---
id: DOC-RELIABILITY
title: Reliability Baseline — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [DOC-SECURITY-PRIVACY, DOC-NFR]
---

# Reliability Baseline — Núcleo Operacional

> Objetivos **técnicos iniciais** para uso interno — **não** são SLA comercial
> contratado. Serão revisados antes da comercialização SaaS.

## Objetivos iniciais
- **RPO ≤ 24h** (perda máxima aceitável de dados).
- **RTO ≤ 8h** (tempo máximo para restaurar operação).

## Backups
O que: banco (PostgreSQL) **e** arquivos (storage). Frequência: diária quando houver
dados reais. Retenção: definida com a utilidade escolhida. Criptografia: em repouso.
Local: separado do ambiente primário. **Teste de restauração** periódico e documentado.
Responsabilidade: definida antes do piloto.

## Recuperação
Procedimento documentado (passo a passo); responsáveis nomeados; teste periódico;
RPO/RTO acima como meta.

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

## Critérios antes de produção com dados reais
Backup habilitado + restauração testada + HTTPS + acesso admin protegido + exportação +
avaliação dos termos do fornecedor (ver Security & Privacy Baseline).
