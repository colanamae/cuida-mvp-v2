-- O autor do registro (planned_by) permanece imutável para auditoria.
-- thought_by representa quem pensou a tarefa, selecionável entre membros da casa.
alter table public.tasks add column if not exists thought_by uuid references auth.users(id);
update public.tasks set thought_by=planned_by where thought_by is null;

create or replace function public.validate_task_thought_by()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.thought_by is not null and not exists (
    select 1 from public.household_members m
    where m.household_id=new.household_id and m.user_id=new.thought_by
  ) then
    raise exception 'Quem pensa precisa fazer parte da rede familiar';
  end if;
  if tg_op='UPDATE' and new.planned_by is distinct from old.planned_by then
    raise exception 'A autoria da tarefa não pode ser alterada';
  end if;
  return new;
end;
$$;
drop trigger if exists task_thought_by_guard on public.tasks;
create trigger task_thought_by_guard before insert or update on public.tasks
for each row execute function public.validate_task_thought_by();
