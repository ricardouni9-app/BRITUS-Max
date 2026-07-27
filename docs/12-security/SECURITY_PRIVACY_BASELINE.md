---
id: DOC-SECURITY-PRIVACY
title: Security and Privacy Baseline — Núcleo Operacional
status: Active
version: 2.0
consumer: Both
level: Plataforma
authority: Arquitetura (CTO)
owner: Desenvolvedor Principal
date: 2026-07-24
updated: 2026-07-25
related: [ADR-0019, ADR-0021, DOC-DATA-MODEL, DOC-RELIABILITY]
---

# Security and Privacy Baseline — Núcleo Operacional

> **Aviso:** baseline **técnico**, **não** parecer jurídico. A política de retenção,
> descarte, Registro Comercial Mínimo e registro de conflito **deve ser validada
> juridicamente (LGPD, sigilo profissional, ética, OAB) antes de qualquer uso com dados
> reais**. Enquanto não validada, é **proibido** inserir dados reais de clientes.

## Custódia dos dados (ADR-0021)
Os dados operacionais residem no **ambiente do cliente**; a **Britus não os armazena** e
eles **não são enviados por padrão** à infraestrutura Britus. **Papel LGPD:** o cliente
**tende a ser controlador**; a Britus atua **primariamente como fornecedora do
software**. Fluxos online específicos (suporte, telemetria, licença, diagnóstico,
atualização, acesso remoto) **podem** gerar tratamentos próprios, **a documentar caso a
caso** — sem afirmação absoluta de que a Britus nunca será operadora.

## Princípios (obrigatórios)
Menor privilégio; deny-by-default; validação no **backend**; nenhum segredo no frontend;
**TLS quando houver tráfego de rede**; minimização de dados; arquivos acessíveis só com
autorização; logs sem conteúdo jurídico; trilha de auditoria; retenção definida; revisão
de permissões; **escopo organizacional respeitado onde houver dados a isolar** (dentro do
ambiente do cliente).

## Threat model (proporcional ao MVP)
| Ameaça | Prob. | Impacto | Mitigação MVP | Futuro |
|---|---|---|---|---|
| Acesso indevido / sessão roubada | Média | Alto | cookies httpOnly+secure, expiração, revogação | MFA |
| Falha de autorização | Média | Alto | deny-by-default, checagem no backend | revisão periódica |
| Vazamento entre escopos organizacionais | Baixa | Alto | escopo + filtro na consulta; testes quando houver isolamento (Etapa 3+) | auditoria |
| Perda de dados local (sem cópia externa) | Média | Alto | avisos discretos; exportação/cópia restaurável; backup é do cliente | ver Reliability |
| Enumeração de registros | Média | Médio | IDs não sequenciais (UUIDv7); autz por recurso | rate limiting |
| Upload malicioso / infectado | Média | Alto | validação tipo/tamanho, hash, sem execução | varredura antivírus |
| Credenciais comprometidas | Média | Alto | argon2id, proteção contra força bruta | MFA |
| Logs com dados sensíveis | Média | Médio | logs estruturados sem conteúdo jurídico | redaction |
| Exclusão acidental | Média | Alto | soft/archival onde adequado, confirmação, auditoria | recuperação |
| Uso indevido de módulos licenciados | Média | Médio | validação de licença (ADR-0022, futuro) | — |
| Dependência vulnerável | Média | Médio | política de dependências, CI | SBOM, Renovate |

## Autenticação e autorização
Sessão segura (cookies httpOnly; secure quando aplicável; proteção CSRF conforme o
modelo); proteção contra força bruta; invalidação/revogação; recuperação de acesso;
usuário ativo/suspenso/desativado; vínculo com organização (conceito do Core). **RBAC
mínimo**: `Owner`/`Lawyer`/`Assistant` (sem admin/auditor genérico). Biblioteca de
autenticação a decidir na implementação; nenhum serviço pago sem autorização.

## Documentos
Metadados no banco; binário fora do banco, **no ambiente do cliente**; acesso sempre
autorizado; `content_hash` de integridade; limite de tamanho; validação de extensão/tipo;
nome original só como metadado; nome físico não confiável. A Britus **não** recebe os
arquivos jurídicos por padrão (ADR-0021).

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
- **Cópias/backup do cliente:** expiram conforme a política do cliente; **não** há
  restauração seletiva para uso operacional comum após o descarte.

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

## Condições para dados reais (no ambiente do cliente)
Mecanismo de **cópia restaurável** disponível e testável; **TLS** quando houver rede;
acesso administrativo protegido; **exportação** possível; **avisos de cópia externa**
ativos; política de retenção **validada juridicamente**. O **backup é responsabilidade do
cliente** (ver Reliability). **Enquanto não atendidas: apenas dados fictícios.**
