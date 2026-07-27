---
id: ADR-0021
title: Custódia local dos dados e fronteira da infraestrutura online
status: Accepted
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Arquiteto-Chefe
date: 2026-07-25
updated: 2026-07-25
related: [ADR-0016, ADR-0017, ADR-0020, ADR-0022, DOC-ARCH-OVERVIEW, DOC-SECURITY-PRIVACY, DOC-RELIABILITY, DOC-DATA-MODEL]
---

# ADR-0021 — Custódia local dos dados e fronteira da infraestrutura online

## Status
Accepted — 2026-07-25. **Supersede ADR-0016 e ADR-0017.**

## Contexto
Os dados jurídicos operacionais são sensíveis e a proposta privilegia que
permaneçam sob controle do próprio cliente, reduzindo o papel da Britus como
custodiante.

## Problema
Onde residem os dados operacionais e qual o limite da infraestrutura online da Britus.

## Decisão
- **Dados operacionais sob controle do cliente**, no seu equipamento/ambiente.
- A **Britus não mantém armazenamento central** dos dados jurídicos operacionais.
- A **infraestrutura online da Britus** limita-se conceitualmente a: distribuição do
  software, licenciamento, catálogo, downloads, atualizações, suporte e treinamento.
- O **aplicativo principal é instalável/executável no ambiente do cliente**.
- **Topologia não decidida**: desktop, web local, mobile e sincronização ficam para
  decisões arquiteturais futuras (ver BACKLOG). Isto **não** implica que toda
  funcionalidade opere sem internet — implica que a Britus não é responsável pelo
  armazenamento permanente dos dados operacionais do cliente.

## Consequências
- **Supersede ADR-0016** (aplicação hospedada, deploy único) e **ADR-0017**
  (multitenancy de servidor). `Organization` permanece como conceito do Core; o
  isolamento organizacional pode continuar **dentro** do ambiente do cliente. Não se
  afirma que toda instalação contém obrigatoriamente uma única organização; não se
  elimina nem se impõe `organization_id` nesta etapa.
- Exige revisão de **segurança/privacidade**, **confiabilidade** e **operações**:
  backup passa a ser **responsabilidade do cliente** (a Britus não faz backup dos
  dados operacionais).
- **LGPD/privacidade** (sem afirmação absoluta): o cliente **tende a ser controlador**
  dos dados no seu ambiente; a Britus atua **primariamente como fornecedora do
  software**. Fluxos online específicos (suporte, telemetria, licença, diagnóstico,
  atualização, acesso remoto) **podem** produzir tratamentos próprios, a documentar
  caso a caso. Dados jurídicos operacionais **não são enviados por padrão** à
  infraestrutura Britus.

## Histórico
- 2026-07-25 — criação (Sprint 1 — Etapa 2.5); supersede ADR-0016 e ADR-0017.
