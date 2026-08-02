# BRITUS — Relatório mestre para continuidade por IA

Atualizado em: 31 de julho de 2026  
Repositório: `ricardouni9-app/BRITUS-Max`  
Produção: `https://britus-max.onrender.com`

Apresentação institucional: inicia muda e oferece narração opcional com a voz aprovada
Elena Vinter. O arquivo `apps/api/assets/britus-intro-elena.mp3` é servido pelo próprio
BRITUS; cenas e progresso seguem o tempo real do áudio, sem `speechSynthesis`, e o término
leva ao cadastro essencial de teste sem looping.

## 1. Finalidade e regra de continuidade

A BRITUS é uma plataforma SaaS de operação e relacionamento, concebida para vários setores. A advocacia é o primeiro foco comercial por necessidade de faturamento, mas regras, nomes e novos módulos não devem tornar o núcleo exclusivamente jurídico.

Este documento permite que outra IA continue o trabalho sem refazer reconhecimento amplo. A regra operacional é: auditar o delta, reutilizar estruturas existentes e trabalhar por exceção. Nenhum segredo, senha ou chave está registrado aqui.

## 2. Estado executivo comprovado

- Monorepo TypeScript, Node.js 24+, pnpm 11, API Fastify e PostgreSQL.
- Código publicado no GitHub, branch `main`, até o commit `3375b0b`.
- Serviço público no Render e banco PostgreSQL no Neon, região São Paulo.
- Migrações `0000` a `0006` incorporadas ao código; as quatro colunas da `0006` foram aplicadas ao Neon em produção.
- Compilação e lint aprovados no delta mais recente.
- Testes afetados mais recentes: 23 aprovados.
- Suíte integral PostgreSQL executada anteriormente: 163 de 163 testes aprovados.
- Verificação de produção em 31/07/2026: `/`, `/health` e `/public/platform-contact` retornaram 200; rota `__dev` retornou 404.
- A apresentação promocional chega ao formulário final, não entra em looping e sincroniza troca de cena com o fim da narração.

O fluxo de teste é automático no código. O GO financeiro em produção depende da configuração segura das credenciais do Mercado Pago e de um pagamento real de homologação; as lacunas remanescentes estão na seção 11.

## 3. Estrutura do monorepo

- `apps/api`: servidor HTTP, composição da aplicação, autenticação, interface pública e rotas de negócio.
- `packages/contracts`: contratos públicos, validações e tipos compartilhados.
- `packages/application`: casos de uso, portas e regras de aplicação, inclusive cobrança.
- `packages/domain`: entidades e regras puras do domínio.
- `packages/db`: schemas Drizzle, adaptadores PostgreSQL e migrações.
- `docs`: decisões, arquitetura, segurança, operações, negócio e roteiro.

O desenho preserva separação entre HTTP, aplicação, domínio e persistência. Mudanças devem respeitar essa direção: interfaces externas chamam casos de uso; regras não devem depender do Fastify ou do PostgreSQL.

## 4. Fluxo funcional atual

### 4.1 Entrada pública

`GET /` entrega a página comercial. Ela contém apresentação em cenas, áudio opcional iniciado mudo e formulário com o título “Faça um teste preenchendo os dados abaixo”. Não existe limite estrutural fixo de cenas.

Quando o áudio está ativo, a cena avança no evento de conclusão da fala, evitando corte da narração. Nas legendas, cada frase é exibida em nova linha. Para a fala sintetizada, “BRITUS” é enviado como “Brítus”, mantendo a marca visual inalterada.

### 4.2 Interesse em teste

`POST /public/trial` recebe somente nome, e-mail e senha. Em uma única operação cria usuário, organização provisória, credencial Argon2id, vínculo de proprietário, assinatura, módulos integrais e sessão autenticada. O término é fixado exatamente 48 horas após o início. Não solicita telefone, autorização de contato nem atendimento humano.

O servidor consulta a assinatura em cada acesso operacional. Depois das 48 horas, o uso é bloqueado e a interface apresenta plano, módulos e checkout. O usuário também pode escolher “Contratar agora” antes do encerramento.

### 4.3 Contato público

`GET /public/platform-contact` fornece telefone, WhatsApp, e-mail e site a partir do cadastro da identidade do Criador. A página pública consome esse endpoint e mostra somente campos preenchidos.

Regra permanente: contato público nunca deve ser fixado no código. Telefone, WhatsApp, e-mail e site devem vir do cadastro do Criador, pois podem mudar.

Estado importante: as colunas e a leitura pública existem, porém falta a tela/rota administrativa para o Criador atualizar esses dados. Enquanto não houver identidade de Criador preenchida, o endpoint devolve campos nulos.

### 4.4 Uso autenticado

Rotas principais existentes:

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/session`;
- `POST /auth/active-organization`;
- clientes, atendimentos e conversão de atendimento em caso;
- tarefas por caso, conclusão de tarefa e dashboard;
- catálogo, teste, assinatura, direitos de uso e webhook de cobrança.

O usuário de administração inicial existe em produção. Sua senha não deve ser registrada em documentação nem transmitida entre IAs.

## 5. Persistência e modelo de dados

As migrações estão em `packages/db/migrations`.

- `0000` a `0004`: fundação do produto e evolução do modelo operacional/comercial.
- `0005_commercial_leads.sql`: captação pública de interessados em teste.
- `0006_creator_contact.sql`: `email`, `phone`, `whatsapp` e `website` em `platform_identities`.

Principais tabelas materializadas:

- identidade e acesso: `platform_identities`, `users`, `credentials`, `sessions`;
- multiempresa: `organizations`, `organization_memberships`;
- operação: `clients`, `atendimentos`, `cases`, `case_tasks`;
- comercial: `commercial_leads`;
- SaaS/cobrança: `product_modules`, `subscriptions`, `subscription_items`, `payment_transactions`, `webhook_events`, `payment_customer_references`.

O banco de produção é Neon PostgreSQL. Migrações normais usam `pnpm --filter @britus/db db:migrate` com `DATABASE_URL`. Em 31/07/2026 o executor `drizzle-kit` encontrou uma falha local de memória antes de abrir conexão; a alteração idempotente da `0006` foi então aplicada diretamente com o driver `pg` e confirmada sem erro. Não repetir a migração manual salvo conflito técnico.

## 6. Segurança e isolamento

- Senhas usam Argon2id.
- Sessões são persistidas e a organização ativa é determinada pelo servidor.
- Escritas autenticadas aplicam proteção CSRF.
- O cliente não pode escolher livremente a organização para escapar do tenant ativo.
- Testes cobrem autorização e isolamento entre organizações.
- Rotas `__dev` e `__test` dependem do modo de execução; em produção a rota `__dev` verificada retornou 404.
- Webhooks de cobrança possuem abstrações de provedor, idempotência e testes, mas provedor real ainda não está operacional na BRITUS.

O futuro acesso emergencial do Criador deve ser separado do login cotidiano, possuir expiração curta, trilha de auditoria, revogação, limitação de tentativas e nunca permitir leitura de senha existente. Recuperação deve redefinir credencial, não revelar segredo.

## 7. Infraestrutura externa

- GitHub: repositório privado/público conforme configuração da conta, remoto `ricardouni9-app/BRITUS-Max`.
- Render: serviço `britus-max`, plano gratuito no momento.
- Neon: projeto `britus-production`, branch de produção, PostgreSQL em São Paulo.
- Brevo: conta ativa e remetente atualmente verificado; integração de envio ainda não foi implementada na BRITUS.

Limites operacionais atuais:

- Render gratuito pode adormecer e causar demora no primeiro acesso.
- Remetente baseado em Gmail apresenta limitação de identidade comercial; antes de escala, configurar domínio próprio e autenticação DNS.
- Nunca colocar chaves do Neon, Render, Brevo ou pagamento no repositório.

## 8. Comandos de verificação

Na raiz do repositório:

```text
pnpm install
pnpm build
pnpm lint
pnpm test
```

Migração, com `DATABASE_URL` definida apenas no ambiente seguro:

```text
pnpm --filter @britus/db db:migrate
```

Portas mínimas de produção:

- `/health` deve retornar 200 e estado `ok`;
- `/` deve conter a apresentação e o formulário final;
- `/public/platform-contact` deve retornar 200 mesmo sem contato cadastrado;
- `/__dev/...` deve retornar 404;
- login válido deve criar sessão e login inválido não deve vazar detalhes.

## 9. Referência reutilizável do SIR

O projeto SIR está em `C:\PEN\PROJETOS APP\sir-app\Inteligencia-Relacionamento-Sistema` e deve ser alterado somente depois de fechar o fluxo da BRITUS.

### Limite obrigatório entre os produtos

SIR e BRITUS-Max são sistemas operacionalmente independentes. Cada um deve possuir seu próprio ciclo de compilação, CI, implantação, banco, usuários, pagamentos, e-mails, configuração e disponibilidade. Falha, bloqueio ou validação de um nunca pode impedir a execução ou a implantação do outro.

O compartilhamento permitido é somente interno e explícito: cópia aprovada de um componente ou biblioteca comum versionada, com dependência declarada e versão fixada. Não são permitidas dependências ocultas entre repositórios, chamadas obrigatórias entre ambientes de produção nem reutilização de segredos.

A notificação de CI analisada em 31/07/2026 pertence exclusivamente ao repositório `BRITUS-Max`. Sua causa foi a verificação global de formatação sobre 110 arquivos legados; não houve evidência de execução ou dependência do SIR. O workflow foi ajustado para verificar formatação apenas no delta, preservando rigor sobre mudanças novas sem reformatar o legado inteiro.

Estruturas já identificadas para reutilização conceitual:

- `artifacts/api-server/src/routes/webhook-mercadopago.ts`: verificação de assinatura que falha fechada e processamento idempotente de pagamento;
- `artifacts/sir-frontend/src/pages/creator.tsx`: painel do Criador, gestão de testes/pagamentos e token emergencial com geração, status e revogação;
- `artifacts/sir-video`: apresentação em cenas com controles de áudio.

Não copiar cegamente. Portar regras para as camadas e contratos da BRITUS, mantendo multiempresa, auditoria e testes.

## 10. Decisões obrigatórias de produto

- BRITUS é multissetorial; advocacia é segmento inicial, não fronteira arquitetural.
- Apresentação inicia muda, narração é opcional e deve parecer humana.
- Cena e narração permanecem coordenadas.
- Cada ponto final inicia nova linha na legenda.
- Ao terminar a apresentação, o visitante vê o convite para teste.
- Cadastro simples serve ao teste; cadastro completo serve à contratação.
- Contatos exibidos vêm exclusivamente do Criador.
- Teste, aviso, pagamento, ativação, renovação e encerramento devem convergir para automação completa.
- Atendimento humano é exceção e usa acesso emergencial seguro do Criador.

## 11. Lacunas para GO de SaaS automático

Prioridade crítica:

1. Configurar `MP_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e `PUBLIC_BASE_URL` no Render e executar pagamento real de homologação.
2. Integrar Brevo para boas-vindas, aviso de encerramento, cobrança, renovação e encerramento.
3. Implementar rotina agendada idempotente para avisos; o bloqueio por expiração já ocorre em tempo de requisição.
4. Implementar painel do Criador para clientes, testes, assinaturas e recuperação emergencial auditada.
5. Confirmar preços, textos legais, domínio e remetente oficiais.

Sem esses itens, não afirmar que o ciclo comercial é autônomo.

## 12. Sequência recomendada de implementação

1. Aplicar a migração `0007_organization_profile` e publicar o delta.
2. Configurar Mercado Pago no Render e executar o ensaio completo de pagamento/webhook/ativação.
3. Conectar Brevo e agendamentos de ciclo de vida.
4. Criar painel e acesso emergencial do Criador.
5. Executar suíte integral PostgreSQL e smoke de produção.
6. Só então portar o mesmo fluxo automático para o SIR.

## 13. Critério final de aceite comercial

O GO para SaaS autônomo exige prova reproduzível de que um visitante consegue, sem atividade humana: assistir à apresentação, cadastrar-se, receber acesso temporário integral, obter orientação pelos contatos atuais do Criador, contratar, pagar, ter o acesso ativado, receber aviso dois dias antes do fim, renovar ou ser encerrado corretamente. Também exige que o Criador consiga recuperar rapidamente um cliente sem quebrar isolamento, segurança ou auditoria.

Até a homologação financeira com credenciais reais existir, a classificação correta é: **teste automático implementado; pagamento automático implementado e aguardando configuração/homologação externa**.
