---
id: DOC-BUSINESS-MODEL
title: Modelo Comercial — Britus
status: Active
version: 1.0
consumer: Both
level: Negócio
authority: Produto (PO)
owner: Product Owner
date: 2026-07-25
updated: 2026-07-25
related: [DOC-PROJECT-CHARTER, ADR-0020, ADR-0022, DOC-ROADMAP, DOC-BACKLOG]
---

# Modelo Comercial — Britus

## Direção
Software de gestão jurídica **instalável no ambiente do cliente** (ADR-0021),
vendido a advogados autônomos e pequenos/médios escritórios.

## Licenciamento por módulos (ADR-0022)
O cliente poderá adquirir **módulos separadamente**. O sistema central deverá
**futuramente** permitir: visualizar módulos disponíveis/licenciados; baixar,
instalar e atualizar módulos autorizados; identificar versões; verificar
compatibilidade e dependências; adquirir novos módulos. **Nada disso é implementado
agora** (ver BACKLOG).

## Fronteira da infraestrutura online da Britus
Distribuição, licença, catálogo, downloads, atualizações, suporte e treinamento —
**não** armazenamento de dados operacionais do cliente (ADR-0021).

## Gestão financeira dos casos (futuro — não MVP)
Recurso/módulo futuro: valor contratado, valor pago, saldo, parcelas, vencimentos,
histórico de recebimentos, situação financeira, avisos de vencimento, mensagens
**editáveis** de cobrança e geração de recibos, com identificação do caso e do
cliente. Mensagens poderão usar saudação, nome do cliente, número do processo
(quando existir), valor da parcela, saldo e dados do escritório. **Envio automático
não autorizado**; inicialmente apenas **geração, edição e cópia** da mensagem para
WhatsApp/e-mail. Ver BACKLOG.

## Fora deste documento
Tecnologia, fornecedor, criptografia, marketplace, preços e política comercial
definitiva **não** são decididos aqui.
