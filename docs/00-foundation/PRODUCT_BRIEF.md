---
id: DOC-PRODUCT-BRIEF
title: Product Brief — Britus — Gestão Simplificada da Advocacia
status: Approved
version: 2.0
consumer: Both
level: Produto
authority: Produto (PO)
owner: Product Owner (Ricardo)
date: 2026-07-24
updated: 2026-07-25
related: [DOC-PROJECT-CHARTER, DOC-BUSINESS-MODEL, DOC-ROADMAP, ADR-0020, ADR-0021, ADR-0022]
---

# Product Brief — Britus — Gestão Simplificada da Advocacia

*Produto 001 · v2.0 (reconciliado na Etapa 2.5)*

## 1. Identidade e público
**Britus — Gestão Simplificada da Advocacia.** Software de gestão jurídica
**instalável no ambiente do cliente**, com os **dados sob custódia do próprio
cliente** (ADR-0021).
- **Mercado:** advogados autônomos, pequenos escritórios e escritórios em crescimento.
- **Cliente-piloto / validação inicial:** a **Britus Advocacia** (interno-primeiro para
  desenvolver e validar). A comercialização **não** se limita a ela.
- Produto inicial **exclusivamente para a Advocacia**; expansão para outras profissões é
  **arquitetural** (ADR-0020), **fora do MVP**.

## 2. Missão
Simplificar a gestão da advocacia — clientes, casos, documentos, conhecimento e
finanças — aumentando produtividade, organização e capacidade comercial do escritório,
validando na prática antes de ampliar mercado.

## 3. Problema
A operação jurídica depende de processos manuais e conhecimento disperso: gestão de
clientes, casos e documentos consome tempo, reduz velocidade comercial e não escala.

## 4. Proposta de valor
Ferramenta que **acelera a advocacia** — centraliza clientes, casos, documentos e
conhecimento (com Assistente Jurídico Inteligente e automações, futuros) — mantendo os
**dados no ambiente do cliente** e a **identidade do escritório em primeiro plano**
(personalização institucional; assinatura do usuário responsável).

## 5. Modelo comercial (resumo — ver BUSINESS_MODEL)
Software instalável; **módulos licenciáveis** adquiridos separadamente (ADR-0022). A
infraestrutura online da Britus serve **distribuição, licença, catálogo, download,
atualização, suporte e treinamento** — **não** armazena dados operacionais. **SaaS
operacional com dados jurídicos hospedados pela Britus não integra o roadmap atual.**

## 6. Objetivo financeiro
Contribuir para: aumentar faturamento do escritório; reduzir custos operacionais;
reduzir tempo de execução; aumentar capacidade de atendimento; gerar receita futura via
licenciamento de módulos.

## 7. Limites — o que o Produto 001 NÃO faz (MVP)
- Não substitui o advogado — o Assistente Jurídico Inteligente atua **sob supervisão**.
- Fora do MVP: gestão financeira por caso, cobrança, catálogo/aquisição/atualização de
  módulos, envio automático de mensagens, vídeos/treinamento (ver BACKLOG).
- Comunicação externa **compatível com o Estatuto da OAB e o Código de Ética**; nunca
  promessa de resultado ou captação irregular.

## 8. KPIs do Produto (negócio — primeiros 90 dias)
Tempo para organizar um novo cliente; localizar um documento; iniciar um novo processo;
nº de tarefas automatizadas; horas economizadas por semana; receita adicional atribuída.

## 9. Critérios de sucesso (MVP)
- O escritório-piloto **usa a plataforma diariamente** na operação real.
- **Redução mensurável de tempo** nas atividades acima.
- Passa no **teste do advogado** (6 perguntas em 10 minutos).

## 10. MVP — princípio e escopo
Princípio (toda funcionalidade responde "sim" às três): resolve um problema real?
economiza tempo ou aumenta receita? será usada imediatamente após a implantação?

Escopo (fluxo "atender um cliente"): Cliente → Atendimento → Caso *(área + potencial
financeiro)* → Documentos → Timeline → Encerramento *(conversão)* → Dashboard.
Camadas seguintes: Base de Conhecimento → Assistente Jurídico Inteligente → Automações.

## 11. Princípios permanentes
- **Captura Única:** nada digitado duas vezes; sempre reutilizar.
- **Assistente = copiloto**, nunca decide; a decisão jurídica é humana.
- **Personalização institucional do cliente**: identidade do escritório predominante;
  assinatura sempre do **usuário responsável**.
- *"Cada tela deve economizar tempo. Cada fluxo deve gerar valor."*
