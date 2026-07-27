---
id: DOC-PRODUCT-REQUIREMENTS
title: Product Requirements — Direção de Produto (Etapa 2.5)
status: Active
version: 1.0
consumer: Both
level: Produto
authority: Produto (PO)
owner: Desenvolvedor Principal
date: 2026-07-25
updated: 2026-07-25
related: [DOC-NFR, DOC-PROJECT-CHARTER, ADR-0020, ADR-0021, DOC-GLOSSARY]
---

# Product Requirements — Direção de Produto (Etapa 2.5)

Requisitos **verificáveis**, no mesmo estilo consolidado de `NFR.md`. Muitos apontam
capacidade planejada; itens comerciais/futuros vivem no BACKLOG.

## Identidade e personalização institucional
- A identidade do **escritório** é predominante na operação e nos documentos gerados.
- A **marca Britus** aparece em instalação, licença, atualizações, catálogo, suporte e
  informações do software; nos documentos, no máximo referência **discreta**.
- A **assinatura** de um documento é do **usuário responsável**, nunca presumida do
  titular da licença.
- Documentos preparados para receber automaticamente: assinatura do responsável, nome
  do profissional, identificação profissional, nome do escritório e dados institucionais.

## Contatos configuráveis
- Telefones, e-mails, sites, WhatsApp e redes sociais **não** são lista rígida de
  plataformas: **tipos configuráveis**, **múltiplos registros**, sem limite artificial,
  admitindo novos meios no futuro.

## Domínio
- O Core usa **Caso** como conceito **genérico**; processo judicial é uma manifestação.
- Módulos **não duplicam** entidades do Core (fronteira Core/módulo).

## Dados, exportação e backup
- **Exportação documental** (PDF/TXT) é para leitura e **não** substitui backup restaurável.
- O sistema deverá oferecer **exportação** e **cópia restaurável**.
- Dados jurídicos operacionais **não** são enviados por padrão à infraestrutura Britus.
- O sistema deverá emitir **avisos claros e discretos** para o cliente manter cópia externa.
- **Não** fixar caminho definitivo no sistema operacional para as cópias.

## Não-funcional relacionado (ver também NFR)
- A Britus **não** mantém backup dos dados operacionais em seus servidores (ADR-0021).
