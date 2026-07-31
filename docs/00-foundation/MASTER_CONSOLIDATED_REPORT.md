---
id: DOC-MASTER-CONSOLIDATED
title: Relatório Mestre Consolidado — BRITUS Platform
status: Active
version: 1.0
consumer: Both
level: Produto + Governança
authority: Produto (PO)
owner: Product Owner
date: 2026-07-27
updated: 2026-07-27
related:
  - DOC-PROJECT-CHARTER
  - DOC-PRODUCT-BRIEF
  - DOC-BUSINESS-MODEL
  - DOC-ROADMAP
  - DOC-RISK-REGISTER
  - ADR-0018
  - ADR-0019
  - ADR-0020
  - ADR-0021
  - ADR-0022
---

# Relatório Mestre Consolidado — BRITUS Platform

> **Finalidade.** Consolidar, em um único registro, a visão completa do projeto, as
> decisões tomadas, os limites inultrapassáveis sem autorização, o estado atual, as
> pendências, os riscos, a metodologia de trabalho (Ricardo · ChatGPT · Claude) e os
> mecanismos de segurança contra perda de contexto, decisões silenciosas, retrabalho
> ou desvio de arquitetura.
>
> **Relação com a SSoT por assunto.** Este é o **registro de governança e continuidade**
> (âncora). A **fonte única de verdade por assunto** permanece nos documentos dedicados —
> domínio em [`06-domain/DOMAIN_MODEL.md`](../06-domain/DOMAIN_MODEL.md), dados em
> [`08-database/DATA_MODEL.md`](../08-database/DATA_MODEL.md), arquitetura em
> [`07-architecture/`](../07-architecture/), decisões em [`02-decisions/`](../02-decisions/),
> segurança em [`12-security/`](../12-security/). Havendo divergência de detalhe técnico,
> o documento específico prevalece; havendo divergência de **limite ou governança**, este
> registro prevalece até deliberação do Product Owner.
>
> **Confiabilidade.** O estado técnico dos pacotes foi consolidado a partir dos relatórios
> do Claude e das auditorias desta linha de trabalho. Onde não houve inspeção direta do
> repositório, o estado é registrado como **“relatado e auditado conceitualmente”**, não
> como verificação independente do código-fonte.

---

## 1. Identidade do projeto

- **Nome estrutural:** BRITUS Platform.
- **Nome comercial inicial:** Britus — Gestão Simplificada da Advocacia (primeira
  apresentação comercial e primeira vertical operacional; **não** limita a arquitetura central).
- **Natureza do produto:** plataforma **modular** de gestão profissional e organizacional —
  **não** é exclusivamente software para advogados. A advocacia é o **primeiro** mercado,
  vertical, conjunto de módulos especializados, ambiente de validação e origem dos
  primeiros fluxos reais. O núcleo permanece capaz de atender, por módulos próprios, outras
  atividades profissionais, empresariais, associativas e institucionais.

## 2. Visão geral das conversas

### 2.1 Origem
Necessidade de uma plataforma que organize a atividade profissional de forma mais ampla que
um cadastro ou agenda. Objetivos evidenciados: centralizar atendimento; converter contatos em
clientes; organizar casos/demandas/serviços; controlar documentos; acompanhar tarefas e
prazos; registrar histórico; organizar equipes e permissões; estruturar operações financeiras;
crescer modularmente; tornar o produto comercializável; reduzir dependência de ferramentas
desconectadas; criar ativo tecnológico próprio; evitar reconstruções futuras.

A experiência do Product Owner ultrapassa a advocacia e inclui: empresas, contabilidade,
relações trabalhistas, direito empresarial, imobiliário, marcas e propriedade industrial,
INPI, Anvisa, Receita Federal, juntas comerciais, prefeituras, órgãos de classe, associações,
igrejas, consultoria industrial, cosméticos, licitações e consultoria empresarial. Por isso a
plataforma **não** deve nascer presa a um único vocabulário profissional.

### 2.2 Evolução do escopo
- **Fase inicial:** fortemente centrada em advocacia.
- **Amadurecimento:** percepção de que Organização, Usuário, Cliente, Atendimento, Projeto,
  Caso, Serviço, Documento, Tarefa, Agenda, Financeiro, Comunicação, Auditoria, Permissões e
  Módulos são comuns a vários segmentos.
- **Direção consolidada:** **núcleo genérico**; **advocacia como vertical especializada**;
  crescimento por **adição de módulos e configurações**, nunca por reconstrução da base.

### 2.3 Divisão de responsabilidades entre as inteligências
- **Ricardo — Product Owner.** Objetivos, prioridades, validação, aprovação, decisões
  comerciais e jurídicas, autorização de Git, autorização de publicação, decisão final em
  conflito.
- **ChatGPT — Arquiteto-Chefe / CTO.** Arquitetura, requisitos, critérios de aceite,
  auditorias, decisões estruturais, riscos, elaboração de pacotes, coerência entre etapas,
  preservação do histórico, bloqueio de desvios. **Não** atua como desenvolvedor principal.
- **Claude — Desenvolvedor Principal.** Implementação, testes, refatoração local,
  documentação técnica, materialização dos pacotes, execução de validações, relatório
  técnico final. **Não** decide unilateralmente arquitetura, modelo de negócio, escopo
  comercial, operações Git, integrações externas, segurança global ou mudanças estruturais.

## 3. Objetivo final

### 3.1 Objetivo central
Construir uma plataforma **SaaS modular, segura, auditável, escalável e comercializável**,
capaz de atender organizações de diferentes segmentos, começando pela advocacia. A plataforma
deve permitir gerenciar, de ponta a ponta, os domínios detalhados em §3.2 (entrada e
relacionamento; clientes; casos/projetos/serviços; organização; operação; financeiro;
administração global).

### 3.2 Linha de chegada funcional
Completo funcionalmente quando integrar:
- **Entrada e relacionamento:** cadastro de interessados; recepção de contatos; classificação
  de atendimento; histórico de comunicação; qualificação; **conversão explícita em cliente**;
  rastreabilidade da origem.
- **Clientes:** PF; PJ; contatos; documentos; dados complementares; histórico; casos;
  projetos; serviços; contratos; financeiro.
- **Casos, projetos ou serviços** (cada vertical especializa o conceito operacional central):
  advocacia → Caso / Processo / Demanda jurídica; outros → Projeto / Serviço / Ordem de
  Serviço / Atendimento Técnico / Contrato / Trabalho / Procedimento.
- **Organização:** usuários; memberships; papéis; equipes; permissões; módulos; configurações;
  branding; dados institucionais; auditoria.
- **Operação:** documentos; tarefas; agenda; prazos; responsáveis; comunicações; histórico;
  status; relatórios; indicadores.
- **Financeiro:** contratos; honorários; valores; parcelas; pagamentos; despesas;
  inadimplência; receitas; relatórios.
- **Administração global:** planos; preços; módulos; parâmetros globais; diagnósticos;
  manutenção; suspensão; reativação; auditoria global; acessos emergenciais; recuperação
  operacional.

### 3.3 Linha de chegada técnica
Pronto para produção somente com: autenticação real; autorização; isolamento
multiorganizacional; persistência; migrations; auditoria persistente; proteção de segredos;
ambientes separados; backups; recuperação; observabilidade; tratamento de falhas; controle de
acesso emergencial; bloqueio de rotas técnicas; testes automatizados; deploy reproduzível;
segurança operacional; documentação coerente; controle de configuração; rastreabilidade de
alterações.

### 3.4 Linha de chegada comercial
Apto a operar como SaaS: cadastro de organizações; período de teste; contratação por
plano/módulo; preços incrementais; ativação; expiração; suspensão; reativação; meios de
pagamento; painel administrativo; termos; política de privacidade; suporte; documentação;
treinamento; vídeos institucionais por módulo; gestão comercial pelo Criador.

### 3.5 O que **não** define conclusão
Não conclui apenas porque a API funciona, os testes passam, existe banco, existe login, há
telas, o sistema compila, existe painel ou existe cadastro de cliente. **A conclusão exige a
soma de:** conclusão **funcional** (§3.2) **+** conclusão **técnica** (§3.3) **+** conclusão
**comercial** (§3.4).

## 4. Visão de produto multissegmento

### 4.1 Advocacia — primeira vertical
Prioridade inicial de produto; recebe módulos específicos: atendimento jurídico, clientes,
casos, processos, partes, documentos, petições, modelos, procurações, prazos, agenda,
audiências, honorários, comunicações, controle processual, relatórios.

### 4.2 Núcleo **não** jurídico
- **Núcleo (genérico):** Organização, Usuário, Membership, Cliente, Atendimento, Documento,
  Tarefa, Agenda, Comunicação, Financeiro, Projeto, Serviço, Workflow, Auditoria, Módulo,
  Plano, Configuração.
- **Vertical (específico):** Processo judicial, Tribunal, Número processual, Parte contrária,
  Audiência, Petição, Prazo jurídico, Procuração, Honorário advocatício.

### 4.3 Verticais futuras possíveis (sem reconstrução)
Contabilidade; consultoria empresarial; associações; igrejas; imobiliárias; escritórios
técnicos; serviços profissionais. Cada uma reaproveita o núcleo e adiciona módulos próprios.

## 5. Modelo de identidades e autoridade

### 5.1 Ricardo
Primeiro **usuário operacional**: membro da primeira organização; profissional; advogado na
primeira vertical; papéis `owner` **e** `lawyer`; administrador da **própria** organização.
**Não** recebe automaticamente poderes globais.

### 5.2 Criador
Identidade **global** da plataforma. **Não** é usuário comum, advogado operacional, membro
automático, papel organizacional, nem owner de todas as organizações. Responsável (futuro) por
preços, planos, módulos, configurações globais, diagnósticos, manutenção, recuperação,
suspensão, reativação, gestão global e acesso emergencial.

### 5.3 Separação obrigatória (permanente)
Quatro camadas **distintas**, nunca colapsadas:
1. **Identidade global da plataforma** (o Criador).
2. **Usuário** operacional.
3. **Vínculo** usuário↔organização (membership).
4. **Papéis organizacionais** (`owner` / `lawyer` / `assistant`).

O Criador **não** é valor de `userRole`; owner organizacional **não** confere poder global.

### 5.4 Acesso emergencial
O Criador **não** tem acesso livre aos dados das organizações. Qualquer acesso emergencial
exige: identidade global válida; ação autorizada; organização-alvo; justificativa; finalidade;
escopo; duração; início; expiração; registro; auditoria; revogação; encerramento.

## 6. Limites absolutos

### 6.1 Repositórios
- **Autorizado (projeto):** `C:\Projetos\britus-platform`.
- **Separado e intocável:** `sir-app` — **não** pode ser alterado, integrado, renomeado,
  movido, copiado, refatorado, publicado ou usado como base direta **sem autorização expressa**.

### 6.2 Git
- **Proibido sem autorização do PO:** `git add`, `commit`, `push`, `pull` que altere estado,
  `merge`, `rebase`, criar/excluir branch, criar/alterar remoto, pull request, publicação,
  reset destrutivo, alteração de histórico, tag, release.
- **Permitido (consulta):** `git status`, `git diff`, `git log`, `git branch`, leitura do
  `HEAD`, inspeção do working tree.

### 6.3 Credenciais e segredos
Proibido inserir em código, testes, documentação ou Git: senhas; senha padrão; token; chave
privada; segredo; credencial SMTP; chave de pagamento; credencial bancária; código de 2FA;
dado de produção; cookie de sessão; segredo de API; credenciais pessoais.

### 6.4 Dados pessoais
Não inventar dados pessoais ausentes (e-mail, telefone, CPF, endereço, senha, dados bancários,
identidade pessoal). O sistema pode **recebê-los por configuração segura de implantação**.

### 6.5 Infraestrutura
Não implementar sem pacote e autorização específicos: PostgreSQL, Drizzle, Docker, Kubernetes,
Redis, filas, storage externo, serviços pagos, gateways, pagamentos, observabilidade externa,
migrations destrutivas, infraestrutura de produção.

### 6.6 Comercial
Não decidir unilateralmente: preços, planos, cobrança, período de teste, descontos, comissão,
Mercado Pago, suspensão por inadimplência, política comercial, limites de uso, módulos
cobrados, regras de cancelamento.

### 6.7 Segurança
Não implementar de forma improvisada: login, sessão, JWT, 2FA, recuperação de senha,
impersonação, autenticação por header, acesso global, bypass de permissão.

## 7. Limites de alteração sem perguntar

### 7.1 Permitido sem consulta prévia
Mudanças **locais** que não alterem negócio, arquitetura, segurança, domínio, comportamento
externo, contratos públicos (de forma incompatível), que não criem custo, não dependam de
serviço externo e não envolvam Git de escrita. Exemplos: renomear variável local; extrair
função; criar helper; reorganizar imports; remover duplicação; melhorar tipagem; dividir
arquivo grande; teste adicional; ajustar mock; melhorar mensagem de erro; corrigir lint e
typecheck; clareza interna; composição local. **Refatoração segura** (comportamento igual,
testes equivalentes, sem alterar contrato/domínio/segurança). **Correções evidentes** (erro de
compilação/lint, import incorreto, teste quebrado por causa conhecida, inconsistência interna
óbvia, duplicação acidental, nome incoerente sem impacto público).

### 7.2 Exige pergunta obrigatória
- **Arquitetura:** novo package; trocar stack/framework; reorganizar o monorepo; fundir/separar
  camadas; novo padrão estrutural; abandonar ADR vigente.
- **Domínio:** criar/remover/fundir entidade; alterar significado; adicionar estado relevante;
  mudar regra de conversão; mudar relacionamento; alterar unicidade/identidade; excluir histórico.
- **Segurança:** alterar permissões; criar poder; ampliar escopo do Criador; permitir acesso a
  dados; mudar acesso emergencial; alterar política de auditoria; implementar autenticação;
  criar sessão; criar segredo; aceitar identidade via cliente; criar bypass.
- **Produto:** criar/remover módulo; alterar fluxo principal; mudar nomes comerciais/público-alvo;
  tornar funcionalidade obrigatória; mudar experiência central.
- **Comercial:** preço, plano, limite, cobrança, teste, suspensão, pagamento, integração financeira.
- **Infraestrutura:** banco, Docker, deploy, serviço externo, fila, cache, storage, e-mail,
  pagamento, observabilidade.
- **Git:** toda operação de escrita.

### 7.3 Permitido com decisão provisória reversível
Havendo dúvida média sem risco de continuidade, pode-se decidir provisoriamente **desde que**:
registrar a dúvida; justificar; isolar a implementação; usar interface/port/configuração;
evitar hardcode; criar teste; documentar ponto de substituição; não impedir mudança futura.
Exemplos: nome interno provisório; adapter em memória; implementação simples substituível; enum
provisório não comercial; interface de extensão; composição técnica local.

### 7.4 Limite do “bom senso técnico”
Não autoriza alterar negócio, autoridade, segurança, arquitetura, dados, Git, preços ou produto.
**Na dúvida entre local e estrutural, prevalece a obrigação de perguntar.**

## 8. Protocolo de dúvidas

- **Regra permanente:** havendo dúvida relevante, **perguntar antes de assumir**.
- **Obrigatório perguntar** quando houver impacto em: negócio, arquitetura, segurança, domínio,
  dados, preço, cobrança, usuário, permissões, infraestrutura, publicação, Git, experiência
  central, operação jurídica, integração externa.
- **Não é necessário perguntar** para: ajuste de import; lint; melhoria de teste; refatoração
  local; nome interno sem impacto; helper; tipagem; eliminação de duplicação; documentação de
  comportamento já aprovado.
- **Formato da dúvida** (§9.4): `dúvida · decisão proposta · motivo · impacto · alternativa ·
  ponto de substituição · momento de revisão`.
- **Durante um pacote:** se a dúvida **bloqueia** o objetivo → interromper apenas a parte
  afetada, continuar as independentes, registrar bloqueio, não inventar decisão. Se **não
  bloqueia** → implementar de forma reversível, documentar, deixar rastro, indicar validação futura.

## 9. Portas de saída e rastros

- **Porta de saída:** toda decisão provisória deve ser substituível — preferir interface, port,
  adapter, estratégia, configuração, feature flag controlada, injeção de dependência, abstração,
  contrato versionável. Evitar lógica espalhada, hardcode, acoplamento direto, dependência
  irreversível, exclusão destrutiva, regra escondida.
- **Rastro obrigatório:** toda decisão relevante deixa ao menos um rastro — teste, ADR, decisão,
  documentação, comentário qualificado, pendência, relatório, contrato, log de auditoria.
- **TODO qualificado:** evitar `// TODO: arrumar depois`; preferir
  `// TODO(owner): <o quê> — motivo: <por quê> — substituição: <onde> — revisão: <quando/ref>`.
- **Conteúdo mínimo do rastro:** dúvida; decisão; motivo; impacto; alternativa; ponto de
  substituição; momento de revisão.

## 10. Arquitetura do projeto

### 10.1 Formato geral (monorepo — estado atual relatado)
```
britus-platform/
├── apps/
│   └── api/                 # Fastify — HTTP, validação, composição, mapeamento de erro
├── packages/
│   ├── contracts/           # schemas Zod, DTOs, tipos, erros, formatos compartilhados
│   ├── application/         # casos de uso, políticas, autorização, auditoria, bootstrap, ports
│   └── db/                  # fundação de persistência (não ativada — sem banco/Docker)
└── docs/                    # documentação como código (SSoT por assunto)
```
> Domínio pode ser extraído para package próprio quando a complexidade justificar.
> Infraestrutura (banco, e-mail, storage, filas, pagamento, observabilidade, repositórios,
> migrations) é **futura** e exige pacote próprio.

### 10.2 Aplicações
- **API:** HTTP, validação de entrada, adaptação, resposta, composição, mapeamento de erro —
  **sem** regra de negócio.
- **Aplicação web (futura):** interface organizacional (clientes, atendimentos, casos, projetos,
  tarefas, agenda, documentos, financeiro, equipe, relatórios).
- **Painel global (futuro):** Criador (preços, planos, módulos, configurações globais, auditoria
  global, manutenção, acessos emergenciais, diagnósticos).

### 10.3 Packages
- **Contracts:** schemas, DTOs, tipos, erros, formatos compartilhados.
- **Application:** casos de uso, políticas, autorização, auditoria, bootstrap, acesso emergencial,
  ports, coordenação.
- **Domínio:** extração futura conforme a complexidade.
- **Infraestrutura:** futura (banco, e-mail, storage, filas, pagamento, observabilidade,
  repositórios, migrations).

## 11. Padrão de fluxo
```
HTTP → validação → contexto de autorização → caso de uso → auditoria → resposta
```
A **API não decide regra de negócio**. A **rota não decide autoridade**. A **infraestrutura não
define domínio**.

## 12. Estado técnico consolidado
*(Relatado e auditado conceitualmente — ver nota de confiabilidade no topo.)*

### 12.1 Pacotes anteriores (fundações)
Monorepo; documentação; contratos; API; configuração; health; Application; `Result`;
`ApplicationError`; erros compartilhados; criação de cliente; Atendimento; Caso; stores em
memória; rotas; testes; integração API × contratos.

### 12.2 Macro Pacote 009
Atendimento, Cliente, Caso; fluxo inicial; criação; armazenamento em memória; testes. **Ressalva
auditada:** a conversão Atendimento → Cliente ainda não era explícita.

### 12.3 Macro Pacote 010
Conversão explícita Atendimento → Cliente; `clientId`; `convertedAt`; status de conversão;
prevenção de reconversão; duplicidade documental; preservação da origem do Caso; identidade
global do Criador; contratos de plataforma; bootstrap inicial; Ricardo como `owner`+`lawyer`;
documentação do Criador; fundação de acesso emergencial; separação config global × organizacional.
**Ressalvas:** bootstrap por nome era frágil; domínio precisava sincronização; poderes conceituais
ainda não eram autorização efetiva.

### 12.4 Macro Pacote 011
Contexto de autorização; políticas organizacionais e globais; `FORBIDDEN`; guard reutilizável;
auditoria append-only em contrato; audit log em memória; acesso emergencial (concessão, revogação,
expiração, escopos, justificativa); bootstrap com `installationId`; ledger de bootstrap; rota
técnica de demonstração; mapeamento HTTP 403; sincronização de `DOMAIN_MODEL.md` e `DATA_MODEL.md`;
testes adicionais; validação consolidada. **Ressalvas:** `uuidv7` na Application deve ser
futuramente abstraído; append-only ainda não é garantia física; contexto de autorização ainda é
fornecido por mecanismo de teste; rota `__dev` precisa de bloqueio rígido; justificativa mínima por
tamanho é controle básico.

## 13. Concluído conceitualmente
Papéis de governança; separação Ricardo × Criador; primeira vertical jurídica; visão
multissegmento; núcleo genérico; Atendimento como entrada; Cliente como entidade distinta;
conversão explícita; Caso ligado à origem; autorização separada de autenticação; políticas
organizacionais e globais; acesso emergencial limitado; auditoria conceitual append-only;
bootstrap com chave técnica; repositório separado; limites de Git; protocolo de eficiência;
protocolo de dúvidas; documentação como sistema.

## 14. Pendências reais (por área)
- **14.1 Persistência:** PostgreSQL; Drizzle; migrations; repositórios reais; transações;
  integridade; índices; isolamento; constraints; histórico persistente.
- **14.2 Autenticação:** login; senha segura; sessão; JWT ou equivalente; refresh; recuperação;
  2FA; bloqueio; proteção de conta; identidade confiável.
- **14.3 Autorização de produção:** derivação do contexto; carregamento de memberships e poderes;
  verificação por organização; integração com todas as rotas; proteção contra IDOR; políticas por
  recurso.
- **14.4 Auditoria real:** persistência; imutabilidade; retenção; integridade; busca; correlação;
  proteção contra alteração; auditoria do Criador; trilha de acesso emergencial.
- **14.5 Aplicação web:** design; componentes; navegação; formulários; dashboards; responsividade;
  acessibilidade; feedback; fluxos.
- **14.6 Documentos:** upload; storage; classificação; permissões; versionamento; associação;
  histórico; modelos; geração; assinatura; retenção.
- **14.7 Tarefas e agenda:** responsáveis; prazos; recorrência; lembretes; status; calendário;
  audiências; compromissos; notificações.
- **14.8 Financeiro:** contratos; honorários; parcelas; pagamentos; despesas; inadimplência;
  relatórios; conciliação; recibos.
- **14.9 SaaS:** organizações; planos; módulos; preços; contratação; teste; expiração; pagamento;
  Mercado Pago; suspensão; reativação; upgrade; downgrade.
- **14.10 Criador:** painel global; autenticação forte; 2FA; poderes reais; diagnósticos; planos;
  módulos; preços; configurações; acesso emergencial; auditoria; recuperação.
- **14.11 Operação:** deploy; ambientes; domínio; CI/CD; backups; monitoramento; logs; alertas;
  incidentes; recuperação; documentação operacional.

## 15. Checklist rígido por pacote
- **Técnica:** lint; typecheck; testes direcionados; testes completos; build; `git diff --check`.
- **Arquitetural:** regra de negócio fora das rotas; domínio preservado; contratos coerentes;
  Application coerente; adapters isolados; sem acoplamento indevido.
- **Segurança:** sem segredos/senha/token; sem acesso global implícito; sem bypass; sem rota
  técnica exposta; Criador fora de `userRole`; isolamento preservado.
- **Escopo:** sem banco/Docker/cobrança/autenticação improvisada não autorizados; sem alteração do
  `sir-app`.
- **Git:** branch; HEAD; staged; unstaged; operações realizadas; arquivos afetados.
- **Documental:** contratos; domínio; dados; arquitetura; README; ADR; changelog quando aplicável.

## 16. Protocolo de eficiência
Durante a implementação: testes direcionados; leitura só quando necessária; evitar suíte completa
após cada alteração; não repetir auditoria sem causa; não repetir Git várias vezes; não narrar
ação trivial. **Ao final:** uma única rodada completa; repetir apenas se houver correção relevante
posterior.

## 17. Balanço dos relatórios anteriores
- **1º relatório** — forte em objetivo, limites, arquitetura, protocolo de dúvidas, Criador, estado
  e separação concluído/pendente; **limitação:** excessivamente centrado na advocacia.
- **2º relatório** — corrigiu o foco (advocacia = primeira vertical; núcleo genérico; verticais
  futuras; crescimento modular); **limitações:** mais conceitual, perdeu detalhes de
  segurança/governança, subdocumentou o estado técnico e os limites de alteração.
- **Síntese adotada** — preserva o rigor/governança/limites do 1º e a visão multissegmento do 2º, e
  acrescenta: limites de alteração sem perguntar; classificação de dúvidas; portas de saída;
  rastros; balanço dos pacotes; riscos; distinção conclusão conceitual × técnica; linha de chegada
  real; checklist rígido; pendências por área.

## 18. Princípios inegociáveis
1. A advocacia é a **primeira vertical**, não o limite do produto.
2. O núcleo deve ser **genérico**.
3. O projeto cresce por **módulos**.
4. O `sir-app` é **intocável** sem autorização.
5. **Git de escrita** exige autorização.
6. **Claude implementa**, não redefine o produto.
7. **ChatGPT arquiteta e audita**, não é desenvolvedor principal.
8. **Ricardo decide** negócio, prioridade e publicação.
9. **Criador não é** usuário organizacional.
10. **Owner não é** administrador global.
11. **Criador não possui** acesso irrestrito.
12. Acesso emergencial é **temporário, limitado e auditado**.
13. Autorização **não** fica espalhada nas rotas.
14. Autenticação **não** é improvisada.
15. Segredos **não** são versionados.
16. Toda mudança de domínio **atualiza** documentação.
17. Toda dúvida relevante é **perguntada**.
18. Toda decisão provisória é **reversível**.
19. Toda decisão relevante **deixa rastro**.
20. Nada é declarado concluído quando está apenas **modelado**.
21. Infraestrutura exige **pacote próprio**.
22. Preço e cobrança exigem **decisão do PO**.
23. Segurança e isolamento **prevalecem** sobre velocidade.
24. Documentação **faz parte** do sistema.
25. A plataforma permanece **compreensível e sustentável** ao longo dos anos.

## 19. Regra final de continuidade
Toda futura conversa, pacote ou auditoria deve iniciar respeitando este registro e a
[ordem de leitura da documentação](../README.md#ordem-de-leitura-recomendada), e obedecer:

> **Quando houver dúvida relevante, perguntar.** Quando for seguro prosseguir sem resposta,
> adotar solução **isolada, reversível, documentada e testada**. **Nunca** transformar uma
> suposição silenciosa em regra permanente. **Nunca** ultrapassar limite de segurança,
> arquitetura, negócio ou Git sob justificativa de conveniência técnica.

## 20. Declaração de segurança do projeto
Este documento representa o registro consolidado da BRITUS Platform até o estado relatado após o
**MACRO PACOTE 011**, contendo visão, linha de chegada, papéis, arquitetura, limites, estado,
entregas, pendências, riscos, protocolo de dúvidas, critérios de alteração, regras de segurança e
princípios permanentes.

Qualquer decisão futura que **contradiga** este registro deverá: (1) ser explicitamente
identificada; (2) apresentar justificativa; (3) avaliar impacto; (4) ser aprovada pelo Product
Owner; (5) atualizar os documentos correspondentes; (6) deixar rastro histórico; (7) preservar a
possibilidade de auditoria.
