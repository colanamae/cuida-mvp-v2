# Tarefas V4.1 — Etapas e filtros

## Etapas
- **A fazer**: `status = open` (compatível com registros antigos).
- **Em andamento**: `status = in_progress`.
- **Concluídas**: `status = done`.

A ação **Iniciar** move A fazer para Em andamento. Marcar como concluída move para Concluídas e registra `completed_at` e `completed_by`. **Reabrir** ou **Voltar a fazer** retorna para A fazer e limpa os campos de conclusão. Ações respeitam as políticas RLS existentes.

## Filtros
O botão **Filtrar** abre dois conjuntos combináveis:
- Responsável: Minhas tarefas, Tarefas da rede (ao menos uma pessoa diferente de você), Sem responsável ou Todas.
- Prazo: Hoje, Próximos dias (amanhã até os próximos 7 dias, horário local) ou Qualquer data.

Os filtros são aplicados às três etapas e podem ser limpos. Tarefas sem prazo não entram em filtros de data. Os cards exibem `sem data` ou `sem responsável` quando cabível.

## Migração
Executar `supabase/migrations/202611060004_task_in_progress.sql` depois das anteriores. Isso amplia a constraint do campo `status` e adiciona índice. Não apaga nem modifica tarefas existentes.

## Verificação sugerida
Criar tarefa, iniciar, concluir e reabrir; testar cada filtro e combinações; verificar aplicação com sessão Supabase e RLS. O build e os testes de integração dependem de instalar as dependências e configurar Supabase.
