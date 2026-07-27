---
id: ADR-0020
title: Core universal e módulos acopláveis
status: Accepted
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-25
updated: 2026-07-25
related: [ADR-0017, ADR-0021, ADR-0022, DOC-DOMAIN-MODEL, DOC-ARCH-OVERVIEW]
---

# ADR-0020 — Core universal e módulos acopláveis

## Status
Accepted — 2026-07-25.

## Contexto
A plataforma deve suportar múltiplas áreas de atuação profissional ao longo do
tempo, começando pela **Advocacia**, sem reescrita a cada nova área/especialidade.

## Problema
Como estruturar conceitos compartilhados e conhecimento específico de cada ramo
sem duplicação nem acoplamento indevido.

## Decisão
Adotar um **Core universal** com conceitos compartilhados (organizações, usuários,
permissões, pessoas, contatos, atendimentos, casos, participantes, documentos,
agenda, cobranças, configurações, módulos, licenças, versões, exportações,
auditoria — **lista conceitual; não autoriza criação de entidades**) e **módulos
acopláveis** que adicionam conhecimento e comportamento específicos.

Hierarquia conceitual: **Domínio → Área → Especialidade → Recursos do módulo**
(ex.: Advocacia → Família → Guarda → recursos, fluxos, modelos e conhecimentos).

Regras:
- Módulos **não duplicam** entidades universais do Core — reutilizam pessoa/caso/etc.,
  acrescentando apenas o que é próprio da área.
- **Advocacia** é o domínio inicial; expansão para outras profissões é **arquitetural**
  e **fora do MVP**.
- Distinguir **mudança estrutural** (Core, fronteiras, licenciamento, modularidade —
  exige análise arquitetural prévia) de **acréscimo de conhecimento** (nova área,
  especialidade, modelo — não bloqueia a execução).

## Consequências
- Evolução preferencialmente por **adição compatível**.
- Base conceitual para o modelo comercial por módulos (ADR-0022).
- O Core usa o conceito **genérico de Caso**; processo judicial é uma possível
  manifestação jurídica de um Caso (ver ADR-0019 e DOMAIN_MODEL).

## Histórico
- 2026-07-25 — criação (Sprint 1 — Etapa 2.5).
