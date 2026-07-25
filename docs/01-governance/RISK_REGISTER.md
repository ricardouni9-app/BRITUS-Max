---
id: DOC-RISK-REGISTER
title: Risk Register e Open Questions — BRITUS Platform
status: Active
version: 1.0
consumer: Both
level: Conhecimento
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [SPR-0009, DOC-SECURITY-PRIVACY, DOC-RELIABILITY]
---

# Risk Register e Open Questions

Documento vivo. Severidade: OBRIGATÓRIA / RECOMENDADA / OPCIONAL.

## Riscos
| ID | Risco | Sev. | Status | Mitigação |
|----|-------|------|--------|-----------|
| RISK-01 | Política de retenção/descarte, Registro Comercial Mínimo e registro de conflito sem validação jurídica | OBRIGATÓRIA | Aberto | Validação LGPD/OAB antes de dados reais; até lá só dados fictícios |
| RISK-02 | Vazamento entre organizações por consulta sem filtro | OBRIGATÓRIA | Aberto | `organization_id` + filtro obrigatório + testes de isolamento na Sprint 1 |
| RISK-03 | Infra gratuita inadequada para dados jurídicos reais | OBRIGATÓRIA | Aberto | Definir host/DB/storage adequados antes do piloto; segurança > gratuito |
| RISK-04 | Exclusão indevida de informação por descarte | RECOMENDADA | Aberto | Descarte só por Owner, com impedimentos, confirmação e auditoria |
| RISK-05 | Perda de dados sem restauração testada | RECOMENDADA | Aberto | Backups + teste de restauração antes de produção |
| RISK-06 | Dependência vulnerável | RECOMENDADA | Aberto | Política de dependências; CI; futuro SBOM/Renovate |
| RISK-07 | Identidade Git/licença/CODEOWNERS provisórios | OPCIONAL | Aberto | Confirmar antes de remoto/GitHub |

## Open Questions
| ID | Questão | Autoridade | Estado |
|----|---------|-----------|--------|
| OQ-01 | Titular jurídico definitivo da licença | Product Owner | Pendente |
| OQ-02 | Handle GitHub oficial (CODEOWNERS) | Product Owner | Pendente |
| OQ-03 | Utilidades (host/DB/storage) para o piloto real | Product Owner | Pendente |
| OQ-04 | Biblioteca/estratégia de autenticação | Arquiteto-Chefe | A decidir na implementação |
| OQ-05 | Limite real do resumo do Registro Comercial Mínimo | UX (reversível) | Hipótese ~500 chars |

## Hipóteses reversíveis registradas
UUIDv7; `timestamptz` UTC; anonimização in-place; descarte autorizado só por Owner
(regra inicial revisável); resumo ~500 chars (UX).
