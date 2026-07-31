# Operador Técnico Global (Criador) e Identidade Global da Plataforma

> Documento de arquitetura (MACRO PACOTE 010). Estabelece conceitos, limites e
> fundação técnica para evitar modelagem incorreta futura. **Não é um ADR**;
> a formalização como ADR é decisão do Product Owner / Arquiteto-Chefe.
> Contratos correspondentes: `@britus/contracts` → `platform.ts`, `bootstrap.ts`.

## 1. Separação arquitetural de identidades

Quatro camadas **distintas**, que não devem ser confundidas nem colapsadas:

1. **Identidade global da plataforma** (`platformIdentitySchema`, kind `creator`) — o **Criador**.
2. **Usuário operacional** (`userSchema`) — pessoa que opera uma organização.
3. **Vínculo usuário↔organização** (`organizationMembershipSchema`).
4. **Papéis organizacionais** (`userRoleSchema`: `owner` | `lawyer` | `assistant`).

**Regra:** o Criador **NÃO** é um valor de `userRole` e **NÃO** pertence a uma
organização comum. É uma identidade técnica global, fora do modelo de papéis
organizacionais. Modelá-lo como "mais um papel" seria incorreto.

## 2. O Criador (operador técnico global)

Identidade técnica global; não é advogado operacional. Terá, futuramente, poderes
**exclusivos** para operações globais (enumerados conceitualmente em `globalPowerSchema`):

- alteração de preços; administração de planos; ativação/desativação de módulos;
- parâmetros globais da plataforma; manutenção técnica emergencial; diagnósticos;
- recuperação operacional; suspensão/reativação técnica de organizações;
- gestão de recursos globais que não pertencem a um escritório específico.

Neste pacote **não** há telas, login ou autenticação do Criador — apenas os conceitos,
contratos e limites.

## 3. Limites de acesso do Criador (acesso emergencial)

O Criador **não** recebe acesso automático, permanente ou silencioso ao conteúdo
jurídico das organizações. Qualquer operação emergencial futura sobre dados de uma
organização é uma **concessão limitada e auditável** e deverá exigir:

- finalidade técnica explícita;
- justificativa;
- duração limitada;
- escopo mínimo;
- registro de início e término;
- identificação do operador;
- trilha de auditoria;
- **impossibilidade de o próprio operador apagar os registros**;
- visibilidade adequada para o responsável pela organização;
- revogação automática (por expiração) ou encerramento explícito.

Estrutura declarada em `emergencyAccessGrantSchema` (+ `emergencyAccessStatusSchema`).
**Fluxo de aplicação demonstrável (MACRO PACOTE 011, em memória):** casos de uso
`makeRequestEmergencyAccess` (exige identidade global autorizada, justificativa não vazia
e útil, escopo explícito e duração válida; concede `active` com início/expiração),
`makeEndEmergencyAccess` (encerra/revoga) e `makeCheckEmergencyAccess` (nega uso após
expiração/revogação ou fora de escopo). Cada decisão gera evento na trilha **append-only**
(`AuditLog`), cuja interface **não** expõe exclusão/atualização — o operador não pode apagar
a trilha. O **enforcement completo sobre dados reais** (leitura de documentos jurídicos)
**não** é implementado.

## 4. Preços e configurações globais

Planos, módulos e parâmetros globais são administrados **no nível da plataforma**, não
dentro de uma organização comum. Contratos: `platformPlanSchema`, `moduleToggleSchema`,
`globalParameterSchema`. **Sem** valores comerciais definitivos, **sem** preços
hardcoded, **sem** cobrança/assinatura. A fundação garante que, no futuro, **somente**
a identidade global autorizada (Criador, via `globalPowerSchema`) poderá modificá-los.

## 5. Bootstrap do primeiro operador (Ricardo)

**Ricardo** é o primeiro **usuário operacional** da primeira organização — advogado e
responsável pelo escritório —, pertencente ao **contexto organizacional** (papéis
`owner` + `lawyer`, combinação permitida via múltiplos vínculos). Ele **não** se
confunde com o Criador.

A fundação de bootstrap (`bootstrapConfigSchema` + caso de uso
`makeBootstrapFirstOrganization`) permite cadastrar a primeira organização e o primeiro
operador de forma **segura e reproduzível**:

- **idempotente por chave técnica estável** — `installationId` (NÃO o nome da organização),
  permitindo **renomear a organização** no futuro sem recriar a instalação; reexecução não
  duplica organização, usuário nem vínculos (via `BootstrapLedger`);
- **sem credenciais** — não grava senha, token ou segredo no repositório;
- **dados de implantação** — PII (e-mail) é fornecida no deploy, não versionada;
- autenticação completa **não** é implementada aqui (fluxo futuro de provisionamento).

Exemplo de configuração de implantação (valores reais preenchidos no deploy; nunca versionados):

```jsonc
{
  "installationId": "<identidade-tecnica-estavel-da-instalacao>",
  "organization": { "name": "Britus Advocacia" },
  "operator": {
    "name": "Ricardo",
    "email": "<preencher-no-deploy>",
    "roles": ["owner", "lawyer"]
  }
}
```

## 6. Autorização e auditoria (MACRO PACOTE 011)

Fundação executável que responde **quem pode fazer / o quê / em qual contexto / sob quais
condições / com qual registro** — **sem** autenticação (que responde "quem é").

- **Contexto de autorização** (`authorizationContextSchema`): identidade (organizacional
  **ou** global), memberships/papéis, organização-alvo, ação, recurso, eventual concessão
  emergencial, momento e justificativa. **Identidade global nunca se mistura a `userRole`**;
  o Criador **não** é membro automático de organização alguma.
- **Política reutilizável** (`authorize`, pura): ação **global** → só identidade global
  (owner organizacional **não** obtém poder global); ação **organizacional** → exige
  membership adequada (e `owner` para administração); Criador só acessa dados de uma
  organização sob **escopo emergencial ativo**. A regra **não** é espalhada pelas rotas.
- **Auditoria append-only** (`AuditLog`): decisões críticas — inclusive **negativas** —
  produzem evento; a interface não oferece remoção/atualização; metadados seguros (**sem**
  senha, token, segredo ou conteúdo jurídico sensível).
