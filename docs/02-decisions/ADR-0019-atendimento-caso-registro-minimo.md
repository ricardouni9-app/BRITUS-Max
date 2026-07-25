---
id: ADR-0019
title: Domínio — separação Atendimento/Caso e Registro Comercial Mínimo
status: Accepted
version: 1.0
consumer: Both
level: Produto
authority: Produto (PO) + Arquitetura (CTO)
owner: Product Owner
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0017, DOC-DOMAIN-MODEL, DOC-SECURITY-PRIVACY]
---

# ADR-0019 — Separação Atendimento/Caso e Registro Comercial Mínimo

## Status
Accepted — 2026-07-24.

## Contexto
O fluxo comercial (recepção → triagem → conversão/não conversão) é distinto da
execução jurídica. Medir conversão e preservar oportunidades exige registrar a
recepção sem transformar todo contato em caso jurídico. Dados de não convertidos
exigem minimização (LGPD/sigilo).

## Problema
Como modelar recepção comercial e trabalho jurídico sem conflação e sem reter
dados pessoais além do necessário.

## Alternativas consideradas
- **Um único `Caso` com tipo** — mais simples, mas conflaria funil comercial com matéria jurídica e reteria dados desnecessários.
- **Separar `Atendimento` de `Caso` (escolhida)** — funil comercial explícito, conversão mensurável, minimização aplicável aos não convertidos.

## Decisão
Modelar **`Atendimento`** (recepção/triagem/oportunidade) separado de **`Caso`**
(trabalho jurídico contratado); um Atendimento gera **0..N** Casos. Atendimentos
**não convertidos** guardam apenas um **Registro Comercial Mínimo** (minimização):
suficiente para entender a procura, o resultado, o motivo, a origem, métricas e
restrições operacionais legítimas — **sem** narrativa completa, documentos, áudios,
mensagens ou conteúdo sensível. Após **30 dias da última interação relevante**, o
registro torna-se **elegível para descarte** (manual, individual, autorizado,
auditado). Métricas anonimizadas podem ser preservadas após o descarte.

## Consequências
- Conversão mensurável; oportunidades preservadas; retenção minimizada.
- Adiciona uma entidade (`Atendimento`) e uma política de retenção/descarte.
- Política de retenção/descarte e registro mínimo de conflito **dependem de validação jurídica antes de dados reais** (ver Security & Privacy Baseline).

## Histórico
- 2026-07-24 — criação (decisão conjunta PO + CTO na Sprint 0.9).
