-- V4.2: aceite individual e explícito de responsáveis por tarefa.
-- Nenhuma tarefa anterior é considerada aceita automaticamente.
create table if not exists public.task_assignment_acceptances (
  task_id uuid not null references public.tasks(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  primary key(task_id, user_id)
);
create index if not exists task_acceptances_household_idx on public.task_assignment_acceptances(household_id);
alter table public.task_assignment_acceptances enable row level security;

create policy task_acceptances_read on public.task_assignment_acceptances
for select to authenticated using (
  exists (select 1 from public.tasks t where t.id=task_id
          and t.household_id=task_assignment_acceptances.household_id
          and public.access_level(t.household_id,t.care_profile_id))
);
create policy task_acceptances_insert on public.task_assignment_acceptances
for insert to authenticated with check (
  user_id=auth.uid() and
  exists(select 1 from public.tasks t
    where t.id=task_id and t.household_id=task_assignment_acceptances.household_id
      and user_id=any(t.assignees)
      and public.access_level(t.household_id,t.care_profile_id))
);
create policy task_acceptances_update on public.task_assignment_acceptances
for update to authenticated using(user_id=auth.uid()) with check (
  user_id=auth.uid() and
  exists(select 1 from public.tasks t
    where t.id=task_id and t.household_id=task_assignment_acceptances.household_id
      and user_id=any(t.assignees)
      and public.access_level(t.household_id,t.care_profile_id))
);
-- Aceites de pessoas retiradas da tarefa são revogados automaticamente.
create or replace function public.cleanup_task_assignment_acceptances()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.assignees is distinct from old.assignees then
    delete from public.task_assignment_acceptances a
    where a.task_id=new.id and not (a.user_id=any(new.assignees));
  end if;
  return new;
end;
$$;
drop trigger if exists task_acceptances_cleanup on public.tasks;
create trigger task_acceptances_cleanup after update of assignees on public.tasks
for each row execute function public.cleanup_task_assignment_acceptances();
