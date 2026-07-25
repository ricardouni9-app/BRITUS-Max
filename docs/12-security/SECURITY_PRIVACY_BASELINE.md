---
id: DOC-SECURITY-PRIVACY
title: Security and Privacy Baseline — Núcleo Operacional
status: Active
version: 1.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-24
related: [ADR-0017, ADR-0019, DOC-DATA-MODEL, DOC-RELIABILITY]
---

# Security and Privacy Baseline — Núcleo Operacional

> **Aviso:** este é um baseline **técnico**. **Não** constitui parecer jurídico.
> A política de retenção, descarte, Registro Comercial Mínimo e registro de
> conflito **deve ser validada juridicamente (LGPD, sigilo profissional, ética,
> OAB) antes de qualquer uso com dados reais.** Enquanto não validada, é
> **proibido** inserir dados reais de clientes.

## Princípios (obrigatórios)
Menor privilégio; deny-by-default; validação no servidor; nenhum segredo no
frontend; TLS em trânsito; minimização de dados; isolamento por organização
garantido; arquivos servidos só com autorização; logs sem conteúdo jurídico;
backups protegidos; trilha de auditoria; retenção definida; revisão de permissões.

## Threat model (proporcional ao MVP)
| Ameaça | Prob. | Impacto | Mitigação MVP | Futuro |
|---|---|---|---|---|
| Acesso indevido / sessão roubada | Média | Alto | cookies httpOnly+secure, expiração, revogação | MFA |
| Falha de autorização | Média | Alto | deny-by-default, checagem org↔recurso no servidor | revisão periódica |
| Isolamento entre organizações | Baixa | Crítico | `organization_id` + filtro obrigatório + **testes de isolamento** | auditoria contínua |
| Enumeração de registros | Média | Médio | IDs não sequenciais (UUIDv7), autz por recurso | rate limiting |
| Upload malicioso / infectado | Média | Alto | validação tipo/tamanho, hash, sem execução | varredura antivírus |
| Vazamento de dados/backup | Baixa | Alto | criptografia em repouso (utilidade), acesso restrito | gestão de chaves |
| Credenciais comprometidas | Média | Alto | argon2id, proteção contra força bruta | MFA, detecção |
| Logs com dados sensíveis | Média | Médio | logs estruturados sem conteúdo jurídico | redaction |
| Exclusão acidental | Média | Alto | soft/archival onde adequado, confirmação, auditoria | recuperação |
| Dependência vulnerável | Média | Médio | política de dependências, CI | SBOM, Renovate |

## Autenticação e autorização
Sessão segura (cookies httpOnly; secure em produção; proteção CSRF conforme o
modelo); proteção contra força bruta; invalidação/revogação de sessão; recuperação
de acesso; usuário ativo/suspenso/desativado; vínculo com organização. **RBAC
mínimo**: `Owner`/`Lawyer`/`Assistant` (sem admin/auditor genérico). Fornecedor/
biblioteca de autenticação a decidir e documentar na implementação; nenhum serviço
pago sem autorização.

## Documentos
Metadados no banco; binário fora do banco; acesso sempre autorizado; `content_hash`
de integridade; limite de tamanho; validação de extensão/tipo; nome original só
como metadado; nome físico não confiável. **Não** armazenar arquivos jurídicos reais
localmente em produção (FS local apenas em dev, por adaptador substituível).

## Privacidade e minimização (LGPD — nível arquitetural)
- Coletar apenas o necessário; base legal/consentimento como campo quando aplicável.
- **Registro Comercial Mínimo** para Atendimentos (esp. não convertidos): entender a
  procura, resultado, motivo de não conversão, origem, métricas, restrições legítimas —
  **sem** narrativa completa, documentos, áudios, mensagens ou conteúdo sensível.

### Regra dos 30 dias (retenção/descarte)
- Contagem a partir da **última interação relevante** (não da criação).
- **Interação relevante** = mensagem recebida/enviada com conteúdo operacional; ligação
  registrada; reunião; envio/solicitação de informação; decisão de acompanhamento.
  **A mera visualização interna NÃO reinicia o prazo.**
- Aos 30 dias → estado **`Elegível para descarte`** (sem exclusão automática; sem rotina programada).
- **Descarte é manual e individual**; **somente `Owner`** autoriza o descarte definitivo;
  `Lawyer`/`Assistant` podem, no máximo, **solicitar/sinalizar** (regra inicial revisável).
- **Impedimentos:** convertido em Caso; Caso ativo vinculado; marcado para acompanhamento;
  pendência operacional; obrigação legal de retenção; conflito de interesses; investigação/
  procedimento interno; determinação jurídica; sem permissão.
- **Efeito do descarte:** remover/anonimizar PII e resumo narrativo; **eliminar anexos**
  sem retenção (arquivo físico **e** metadados — remover só metadado é falha); **preservar
  métricas anonimizadas**; **auditar** a operação sem copiar o conteúdo eliminado.
- **Backups:** expiram conforme política técnica; **não** há restauração seletiva para uso
  operacional comum após o descarte.

### Métricas após o descarte
Preservar apenas anonimizado/agregado (período, canal, área, tipo, resultado, motivo,
conflito sem detalhe). **Nunca** preservar nome/CPF/CNPJ/e-mail/telefone/endereço/texto
identificável/documentos/áudio/mensagens/nomes de partes/nº de processo/fatos reidentificáveis.
Estratégia recomendada: anonimização in-place (ver Data Model).

### Registro mínimo de conflito de interesses
**Capacidade técnica** de preservar identificadores mínimos, com finalidade específica e
acesso restrito, separado do conteúdo integral/métrica/dado operacional. **Não** é
afirmação de obrigatoriedade nem permissão jurídica — **sujeito a validação jurídica**;
**proibido com dados reais antes dela**.

## Condições para dados reais (todas obrigatórias)
Backup habilitado; restauração documentada; HTTPS ativo; acesso administrativo protegido;
exportação possível; termos/limites do fornecedor avaliados; política de retenção validada
juridicamente. **Enquanto não atendidas: apenas dados fictícios.**
