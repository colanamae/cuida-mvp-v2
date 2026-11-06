-- V4.0 - Categorias opcionais e múltiplas pessoas responsáveis por tarefa.
-- Mantém assigned_to como coluna de compatibilidade com versões anteriores.
alter table public.tasks
  add column if not exists category text,
  add column if not exists assignees uuid[] not null default '{}'::uuid[];

alter table public.tasks drop constraint if exists tasks_category_check;
alter table public.tasks add constraint tasks_category_check
  check (category is null or category in ('Saúde', 'Escola', 'Casa', 'Cuidados pessoais'));

-- Migração dos responsáveis existentes, sem perder registros anteriores.
update public.tasks
set assignees = array[assigned_to]
where assigned_to is not null and cardinality(assignees) = 0;

-- Validar todos os responsáveis, impedir duplicações e manter a coluna legada sincronizada.
create or replace function public.normalize_task_assignees()
returns trigger language plpgsql security invoker set search_path=public as $$
declare uid uuid;
begin
  if new.assignees is null then new.assignees := '{}'::uuid[]; end if;

  -- Operações de clientes legados continuam atribuindo somente assigned_to.
  if tg_op='UPDATE' and new.assignees is not distinct from old.assignees
      and new.assigned_to is distinct from old.assigned_to then
    new.assignees := case when new.assigned_to is null then '{}'::uuid[] else array[new.assigned_to] end;
  elsif tg_op='INSERT' and cardinality(new.assignees)=0 and new.assigned_to is not null then
    new.assignees := array[new.assigned_to];
  end if;

  if array_position(new.assignees, null) is not null then
    raise exception 'A lista de responsáveis não pode conter valores vazios';
  end if;
  if cardinality(new.assignees)>50 then
    raise exception 'Limite de 50 responsáveis por tarefa';
  end if;
  if (select count(distinct x) from unnest(new.assignees) x) <> cardinality(new.assignees) then
    raise exception 'Responsáveis duplicados';
  end if;
  foreach uid in array new.assignees loop
    if not exists (
      select 1 from public.household_members m
      where m.household_id=new.household_id and m.user_id=uid
    ) then
      raise exception 'Pessoa responsável não pertence à rede familiar';
    end if;
  end loop;
  new.assigned_to := new.assignees[1];
  return new;
end;
$$;

drop trigger if exists task_assignees_guard on public.tasks;
create trigger task_assignees_guard before insert or update on public.tasks
for each row execute function public.normalize_task_assignees();

create index if not exists tasks_assignees_gin_idx on public.tasks using gin(assignees);
