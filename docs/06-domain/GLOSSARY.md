---
id: DOC-GLOSSARY
title: Glossário / Linguagem Ubíqua — Britus
status: Active
version: 1.0
consumer: Both
level: Produto
authority: Produto (PO)
owner: Desenvolvedor Principal
date: 2026-07-25
updated: 2026-07-25
related: [DOC-DOMAIN-MODEL, ADR-0019, ADR-0020]
---

# Glossário / Linguagem Ubíqua

- **Domínio** — ramo profissional (ex.: Advocacia). Nível mais alto da hierarquia.
- **Área** — recorte dentro de um domínio (ex.: Família).
- **Especialidade** — recorte dentro de uma área (ex.: Guarda).
- **Recursos do módulo** — fluxos, modelos, documentos, relatórios e conhecimentos
  específicos de uma especialidade.
- **Core** — conjunto de conceitos universais compartilhados (organizações, usuários,
  pessoas, contatos, atendimentos, casos, documentos, etc.), independente de um ramo.
- **Módulo (acoplável)** — extensão que adiciona conhecimento/comportamento de uma
  área/especialidade **sem duplicar** entidades do Core.
- **Atendimento** — recepção/triagem/oportunidade comercial; pode ou não gerar Caso.
- **Registro Comercial Mínimo** — dados mínimos mantidos de um Atendimento (esp. não
  convertido), sob minimização (ADR-0019).
- **Caso** — trabalho jurídico contratado/assumido. Conceito **genérico**; **processo
  judicial** é uma **possível manifestação** de um Caso, não seu único significado.
- **Participante** — pessoa/organização vinculada a um Caso com um papel controlado.
- **Organization** — conceito do Core para contexto organizacional; na arquitetura
  local (ADR-0021) o isolamento ocorre dentro do ambiente do cliente.
- **Personalização institucional do cliente** — predomínio da identidade do escritório
  na operação e nos documentos (vs. marca Britus, presente no software/licença).
- **Licença / Catálogo / Módulo licenciável** — conceitos de distribuição (ADR-0022).
- **Exportação documental** — PDF/TXT para leitura; **não** é backup restaurável.
- **Cópia restaurável** — formato técnico que permite recuperação do sistema.
- **Backup externo** — cópia mantida pelo próprio cliente fora do ambiente operacional.
