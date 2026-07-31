# BRITUS — Comercialização Assistida (Piloto)

Produto: **BRITUS · Gestão Jurídica** — gestão de clientes, atendimentos e casos para escritórios de advocacia (primeira vertical). Cobrança e onboarding **manuais/assistidos** nesta versão.

## Fluxo de demonstração
1. Subir em modo comercial (memory p/ demo, ou postgres p/ dados reais) — ver OPERATIONS.
2. Abrir a URL → tela de login profissional.
3. Login → cadastro de cliente → atendimento → caso, com confirmação visual.
4. Encerrar sessão e reentrar (postgres) → dados persistem.

## Onboarding do primeiro cliente (assistido)
1. Provisionar banco + migrações (OPERATIONS).
2. Criar a organização + operador owner via `bootstrap` (guardar o `organizationId` impresso).
3. Entregar credenciais ao cliente por canal seguro (não versionar/e-mail em claro sensível).
4. Sessão inicial acompanhada: validar login, cadastro de cliente/atendimento/caso.

## Ativação manual (billing)
Cobrança manual rastreável nesta versão:
1. Registrar contrato/valor/período fora do sistema (planilha/controle interno).
2. Confirmar pagamento (PIX/boleto/nota) — emissão fiscal é responsabilidade do PO/contador.
3. Liberar acesso (operador ativo). Suspensão = desativar acesso do operador.
> MercadoPago, automação de cobrança, SMTP e onboarding self-service: **preservados e suspensos** (pós-comercialização). Retomar após validar o piloto.

## Suporte inicial
Canal único (e-mail/WhatsApp do PO), horário comercial, best-effort. Registrar incidentes e dúvidas para backlog. SLA formal = evolução futura.

## Encerramento de acesso
Desativar/rotacionar credencial do operador; revogar sessões (logout força expiração; sessão expira em `SESSION_TTL_SECONDS`). Exclusão/anonimização de dados sob solicitação = ver PRIVACY_TECH.

## Limites conhecidos desta versão
- Sem catálogo de áreas/tipos: casos usam área padrão (campo fixo). — Pós.
- Sem listagens/histórico na UI (confirmação é in-sessão); leitura histórica via banco/relatório. — Pós.
- Tarefas/prazos/dashboard e billing existem no backend (Drizzle) mas não expostos na UI comercial. — Pós imediato.
- Multiusuário por organização suportado no modelo; gestão de convites via UI = Pós.

## Checklist de entrega ao cliente
1. Ambiente no ar com HTTPS + `/health`=200.
2. Organização + operador criados; credenciais entregues com segurança.
3. Demonstração do fluxo completo realizada.
4. Backup diário ativo + restauração testada.
5. Canal de suporte informado.
6. Termos de uso e Política de Privacidade aceitos (decisão jurídica do PO — ver PRIVACY_TECH).

## Checklist de aceite (cliente)
- Consegue entrar, cadastrar cliente, registrar atendimento, abrir caso e reencontrar os dados após reentrar. — SIM/NÃO
- Entende o modelo de cobrança e suporte manuais. — SIM/NÃO
- Recebeu e aceitou Termos + Privacidade. — SIM/NÃO
