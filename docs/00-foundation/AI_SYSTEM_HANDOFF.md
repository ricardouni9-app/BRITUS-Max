# BRITUS — Relatório mestre para continuidade por IA

Atualizado em: 31 de julho de 2026  
Repositório: `ricardouni9-app/BRITUS-Max`  
Produção: `https://britus-max.onrender.com`

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

Isso representa **GO técnico para demonstração e comercialização assistida**. Ainda não representa GO para aquisição, pagamento, ativação e renovação totalmente autônomos; as lacunas estão na seção 11.

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

`POST /public/trial-interest` registra um interessado em `commercial_leads`. Há consentimento explícito, campo-isca contra robôs e limite de cinco requisições por minuto por IP.

Estado importante: esse cadastro registra o interesse, mas ainda **não cria automaticamente organização, usuário, credencial, assinatura de teste e sessão**. Portanto, a liberação integral e automática do teste solicitada pelo Product Owner permanece pendente.

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

1. Transformar o interesse em teste em provisionamento transacional: criar organização, usuário, credencial inicial segura, assinatura `trial`, direitos integrais temporários e sessão/link de primeiro acesso.
2. Definir duração do teste, política de duplicidade, aceite jurídico, proteção contra abuso e recuperação de acesso.
3. Criar página de cadastro completo para contratação e conversão do mesmo tenant, sem duplicar dados.
4. Integrar provedor de pagamento real e validar assinatura de webhook, idempotência, estados pendente/pago/falhou/estornado e reconciliação.
5. Integrar Brevo para boas-vindas, acesso, aviso dois dias antes do vencimento, cobrança, renovação e encerramento.
6. Implementar rotina agendada idempotente para expiração, aviso e suspensão/reabertura de direitos.
7. Implementar painel do Criador para contatos públicos, clientes, testes, assinaturas e recuperação emergencial auditada.
8. Definir planos, preço, duração de teste, textos legais, domínio, remetente e WhatsApp oficiais.

Sem esses itens, não afirmar que o ciclo comercial é autônomo.

## 12. Sequência recomendada de implementação

1. Fechar contratos e estados do ciclo `lead -> trial -> active -> past_due -> suspended -> cancelled`.
2. Criar serviço transacional de provisionamento de teste e seus testes de concorrência/idempotência.
3. Criar primeiro acesso e recuperação segura.
4. Criar cadastro completo e conversão de trial.
5. Conectar pagamento e webhooks.
6. Conectar Brevo e agendamentos de ciclo de vida.
7. Criar painel e acesso emergencial do Criador.
8. Executar suíte integral PostgreSQL, smoke de produção e ensaio ponta a ponta com pagamento de teste.
9. Só então portar o mesmo fluxo automático para o SIR.

## 13. Critério final de aceite comercial

O GO para SaaS autônomo exige prova reproduzível de que um visitante consegue, sem atividade humana: assistir à apresentação, cadastrar-se, receber acesso temporário integral, obter orientação pelos contatos atuais do Criador, contratar, pagar, ter o acesso ativado, receber aviso dois dias antes do fim, renovar ou ser encerrado corretamente. Também exige que o Criador consiga recuperar rapidamente um cliente sem quebrar isolamento, segurança ou auditoria.

Até essa prova existir, a classificação correta é: **comercialização assistida disponível; automação integral em construção**.
