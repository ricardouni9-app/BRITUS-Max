# @britus/contracts

Contratos compartilhados (schemas **Zod** + tipos inferidos) entre `apps/web` e
`apps/api` — fonte única de verdade (SSoT) de entrada/saída, enums contratuais,
paginação e erros públicos padronizados (ADR-0018).

**Não** contém: regras de negócio, acesso ao banco, componentes de interface,
lógica de autenticação, detalhes internos de persistência.

> **Estado atual (Etapa 1):** skeleton estrutural (`export {}`). Zod será
> adicionado quando o primeiro schema real existir (Just-in-Time).
