---
id: DOC-NFR
title: Non-Functional Requirements — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [DOC-SECURITY-PRIVACY, DOC-RELIABILITY, DOC-SPRINT1-CONTRACT]
---

# Non-Functional Requirements — Núcleo Operacional

Requisitos **verificáveis**. Valores marcados como *hipótese* são revisáveis.

## Segurança
- Nenhuma autorização dependerá apenas do frontend.
- Nenhuma credencial poderá estar versionada.
- Senhas com hashing forte (argon2id).
- Dados de uma organização nunca retornam a outra (teste automatizado obrigatório).

## Privacidade
- Atendimentos não convertidos mantêm apenas o Registro Comercial Mínimo.
- Descarte remove PII **e** anexos (arquivo físico), preservando só métricas anonimizadas.

## Desempenho
- Toda listagem é paginada (sem retornar coleções ilimitadas).
- Índices baseados em consultas reais (organização/status/área/data).

## Confiabilidade / Recuperação
- Operações críticas são transacionais.
- RPO ≤ 24h, RTO ≤ 8h (objetivos técnicos iniciais); restauração testável.

## Usabilidade / UX
- `Registro Comercial Mínimo`: `HIPÓTESE DE UX REVERSÍVEL` de ~500 caracteres no resumo,
  com contador visual e orientação de objetividade — **não** é constraint rígida de banco
  nesta fase; rejeição apenas em limite técnico superior justificado.

## Acessibilidade
- Interfaces essenciais operáveis por teclado; foco visível; rótulos em formulários.

## Observabilidade / Auditabilidade
- Logs estruturados com `correlation_id`; sem conteúdo jurídico/segredos.
- Ações sensíveis registram AuditLog imutável (quem/quando/org/entidade/ação).

## Manutenibilidade / Testabilidade
- Fronteiras de módulo respeitadas (sem ciclos); contratos Zod como SSoT.
- Domínio e autorização cobertos por testes (ver Sprint 1 Contract).

## Compatibilidade / Portabilidade
- Erros nunca expõem stack trace ao cliente.
- Independência de fornecedor: storage e provedores via adaptadores substituíveis.

## Escalabilidade
- Sem arquitetura distribuída prematura; caminho de evolução preservado (org-scoped).
