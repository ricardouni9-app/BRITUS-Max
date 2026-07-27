---
id: DOC-PROJECT-CHARTER
title: Project Charter — Britus
status: Active
version: 1.0
consumer: Both
level: Produto
authority: Produto (PO)
owner: Product Owner
date: 2026-07-25
updated: 2026-07-25
related: [DOC-PRODUCT-BRIEF, DOC-BUSINESS-MODEL, DOC-ROADMAP, ADR-0020, ADR-0021]
---

# Project Charter — Britus

## Identidade
**Britus — Gestão Simplificada da Advocacia.** A Britus é a fornecedora e
desenvolvedora do software.

**Personalização institucional do cliente:** a identidade do **escritório** é
predominante na operação e nos documentos gerados (nome, assinatura, identificação
profissional, logotipo, contatos, identidade visual). A marca **Britus** está
presente em instalação, licenciamento, atualizações, catálogo, suporte e
informações do software, podendo haver referência discreta nos documentos. **A
assinatura é sempre do usuário responsável** pelo documento — nunca presumida a
partir do titular da licença. *(Não classificamos o produto de forma absoluta como
white-label.)*

## Propósito
Simplificar a gestão da advocacia — clientes, casos, documentos, conhecimento e
finanças — com o software instalado no ambiente do cliente e os dados sob controle
do próprio cliente (ADR-0021).

## Público-alvo (mercado)
Advogados autônomos, pequenos escritórios e escritórios em crescimento. Expansão
futura para outras profissões é **arquitetural** (ADR-0020), **fora do MVP**.

## Cliente-piloto
**Britus Advocacia** é o primeiro cliente-piloto e ambiente de validação
(desenvolvimento e validação interno-primeiro). A comercialização **não** se limita
à Britus Advocacia.

## Stakeholders
- **Product Owner:** Ricardo (guardião da visão).
- **Arquiteto-Chefe (CTO):** define arquitetura e padrões.
- **Desenvolvedor Principal:** implementa, audita, questiona.

## Princípios oficiais
1. Pensar como uma empresa de grande escala e executar como uma em fase inicial.
2. Gerar receita com o produto jurídico o mais cedo possível.
3. Preservar expansão futura sem ampliar indevidamente o MVP.
4. Distinguir mudanças estruturais de simples acréscimos de conhecimento.
5. Novas especialidades e modelos não devem bloquear o desenvolvimento.
6. Mudanças no Core, licenciamento, armazenamento ou modularidade exigem análise
   arquitetural prévia.
7. Evolução preferencialmente por adição compatível.
8. Nenhuma implementação começa quando há conhecimento essencial pendente capaz de
   alterar sua estrutura.
9. Conhecimento não estrutural vai ao backlog e não bloqueia a execução.
10. A documentação permanece como fonte oficial das decisões.
