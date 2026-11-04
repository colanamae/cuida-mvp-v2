# Contrato de integração futuro — Cuida, WhatsApp e Dots

A solução ainda **não** implementa o agente ou o WhatsApp. O aplicativo usa respostas de regras locais para consultar tarefas e compromissos.

## Arquitetura alvo

1. WhatsApp Business API → webhook HTTPS assinado em Supabase Edge Function `whatsapp-webhook`.
2. Validar assinatura e idempotência (`provider_event_id`) antes de processar. Enfileirar eventos para processamento assíncrono, com retentativas limitadas.
3. Mapear telefone verificado para `auth.users.id`, casa e escopo de permissão. Não inferir identidade somente a partir do número sem processo de vínculo.
4. Adaptador de ferramentas do agente Dots/LLM chama Edge Function `care-actions`, autorizada por JWT OAuth ou token de aplicação de escopo mínimo. Não expor Supabase service role para cliente, LLM ou WhatsApp.
5. Camada de aplicação valida ações, papéis, pessoa cuidada e consentimentos antes da mutação; consultas podem usar RLS; comandos de escrita devem repetir verificações no servidor.
6. Escrever log de auditoria com correlation_id, ator, operação, alvo, timestamp e resultado. Proteger conteúdo de saúde e mensagens com classificação de dados sensíveis, retenção limitada e consentimento específico.

## Ferramentas sugeridas (não implementadas)

`list_tasks(household_id, care_profile_id?)`, `create_task(title,due_at,assigned_to,care_profile_id)`, `list_events(range)`, `propose_assignment(task_id,user_id)`, `confirm_assignment(proposal_id)`, `read_member_schedule(member_id,range)`, `send_invitation(...)`, `get_wellbeing_summary()` (somente proprietário/consentimento inequívoco).

Não permita ao modelo escolher arbitrariamente `user_id`, `household_id` ou `role`: derivar das credenciais autenticadas, não dos argumentos enviados pelo agente. Usar confirmação humana explícita antes de chamar outro membro, enviar mensagem ou alterar agenda de terceiros. Rotacionar segredos do provedor e definir limites de requisição.

## Futuras migrações

`external_identities(user_id,provider,provider_subject,verified_at)`, `provider_events(provider,event_id,status,received_at)`, `agent_action_requests(actor_id,target_id,proposed_change,status,expires_at)`, `notification_preferences(user_id,channel,time,enabled)`, `outbox_messages(id,target,channel,status,attempts)`.
