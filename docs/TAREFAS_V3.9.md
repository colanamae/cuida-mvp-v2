# Tarefas — painel Nova tarefa V3.9

## Interface

O botão Nova tarefa abre um painel inferior no celular e um diálogo sobreposto no desktop. Campos: título obrigatório, atalhos Hoje/Amanhã/Essa semana, data/hora opcional, Quem pensa, Quem faz (opcional), Pra quem (perfil ou Casa) e descrição opcional. O botão **Salvar tarefa** salva no Supabase, mas **não envia mensagem por WhatsApp, push ou e-mail**.

Os atalhos definem 18h como horário inicial, editável no controle Data e horário. O botão Sem data remove o prazo. Para cada pessoa da rede, exibe-se a inicial e a cor cadastrada.

## Modelo de dados

Execute a migração `supabase/migrations/202611060002_task_thought_by.sql`. Ela cria `tasks.thought_by`: a pessoa que pensou a tarefa. `tasks.planned_by` continua sendo o autor real do registro, com auditoria preservada. Um gatilho verifica que `thought_by` é membro da casa.

O campo `assigned_to` indica quem faz; `care_profile_id` é o destinatário do cuidado; `null` indica Casa. Há edição pelo menu do cartão, conclusão pelo checkbox e exclusão com confirmação.

## Limitações e testes recomendados

- Criar tarefa sem prazo e sem responsável; verificar textos "sem data"/"sem responsável".
- Selecionar Quem pensa diferente do autor, salvar e reabrir.
- Confirmar validação de permissões com contas de membros de escopos diferentes.
- Confirmar se `planned_by` não pode ser falsificado por requisições diretas (a política original de INSERT exige `auth.uid()`).
- Testar atalhos de datas perto de virada do dia e em diferentes fusos.
- Notificações de atribuição e envio automático não foram implementadas nesta revisão.
