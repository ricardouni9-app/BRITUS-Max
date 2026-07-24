---
id: ADR-0003
title: Runtime oficial do projeto
status: Accepted
consumer: Both
level: Plataforma
owner: Arquiteto-Chefe (CTO)
date: 2026-07-24
updated: 2026-07-24
---

# ADR-0003 — Runtime oficial do projeto

## Status
**Accepted (revisado em 2026-07-24).** Esta ADR revisa formalmente sua própria
decisão original; o histórico é preservado (ver seção Histórico).

## Contexto
A BRITUS Platform é greenfield. Na Etapa 5 (fundação), o projeto ainda **não**
possui dependências instaladas nem código funcional. O runtime precisa ser fixado
para garantir reprodutibilidade entre ambientes. Durante a Etapa 5 foi
identificada uma divergência: o ambiente local executa **Node.js 24**, enquanto a
decisão original fixava **Node.js 22 LTS**.

## Problema
Iniciar o projeto amarrado a uma linha LTS anterior (22) enquanto o ambiente já
opera na LTS mais atual (24), sem código/dependências que justifiquem manter a 22.

## Alternativas consideradas
- **Node.js 22 LTS** (decisão original): exigiria instalar a 22 num ambiente que
  já roda 24; inicia o projeto numa LTS anterior.
- **Node.js 24 LTS** (escolhida): linha LTS mais atual; alinhada ao ambiente;
  custo de mudança mínimo por ser greenfield e sem dependências.

## Decisão
Adotar **Node.js 24 LTS** como runtime oficial, usando a **major como contrato**
(`.nvmrc = 24`; `engines.node = ">=24"`), sem acoplamento a um patch específico.

## Consequências
- `.nvmrc`, `engines`, workflow de CI e documentação passam a referenciar Node 24.
- Colaboradores devem usar Node 24 (declarado em `.nvmrc`/`engines`; CI fixa 24).
- Evita débito de iniciar já numa LTS anterior.

## Histórico
- **Decisão original:** Node.js 22 LTS — status **Superseded** (revisada nesta ADR em 2026-07-24).
- **Decisão revisada:** Node.js 24 LTS — status **Accepted** — 2026-07-24.
- Origem da revisão: divergência ambiente (Node 24) × decisão (Node 22) detectada na Etapa 5.
