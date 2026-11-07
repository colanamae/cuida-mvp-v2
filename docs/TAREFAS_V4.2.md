# Tarefas V4.2 — cartões e aceite

- Cards compactos com checkbox, título, pessoa responsável, data, status e categoria.
- Pílula **Aguardando** por pessoa ainda não confirmada.
- A pessoa autenticada aceita explicitamente uma tarefa atribuída a ela via **Aceitar tarefa**.
- O aceite é individual e persistido em `task_assignment_acceptances` com RLS.
- Aceites anteriores não são presumidos; todos começam pendentes, inclusive tarefas legadas.
- A remoção de um responsável invalida seu aceite anterior.
- O aceite não dispara notificações externas.
- Aplicar `supabase/migrations/202611060005_task_assignment_acceptances.sql` após as migrações V4.0 e V4.1.

**Limitação:** o aceite depende de login da pessoa indicada na mesma rede; não há envio automático de convite ou push. Após migração, testar com duas contas e permissões RLS antes de produção.
