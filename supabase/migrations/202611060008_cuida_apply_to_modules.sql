-- Cola na Mãe — confirmações explícitas da Cuida para módulos reais.
-- Aplicar após schema inicial, task categories/assignees e 20261111000100.
-- Não altera registros existentes de tasks/family_events.

-- Impede que um cliente comum forje mensagens atribuídas à assistente.
-- A Edge Function deve gravar respostas da IA com service role APÓS validar o JWT e a casa.
drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_member(household_id) and sender = 'user');

-- Mantém histórico pessoal e exige vínculo atual com a casa.
drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages for select to authenticated
using (user_id = (select auth.uid()) and public.is_member(household_id));

-- O esquema original não tinha descrição de compromisso; adicionamos campo opcional.
alter table public.family_events add column if not exists details text;

-- Duas modalidades ainda inexistentes no schema recebido.
create table if not exists public.cuida_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160),
  content text,
  created_at timestamptz not null default now()
);
create table if not exists public.cuida_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160),
  details text,
  remind_at timestamptz,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists cuida_notes_owner_idx on public.cuida_notes(user_id, household_id, created_at desc);
create index if not exists cuida_reminders_owner_idx on public.cuida_reminders(user_id, household_id, remind_at);
alter table public.cuida_notes enable row level security;
alter table public.cuida_reminders enable row level security;
-- Notas e lembretes da Cuida são pessoais; criação passa pela RPC autenticada.
create policy cuida_notes_read on public.cuida_notes for select to authenticated
using (user_id = auth.uid() and public.is_member(household_id));
create policy cuida_reminders_read on public.cuida_reminders for select to authenticated
using (user_id = auth.uid() and public.is_member(household_id));
grant select on public.cuida_notes, public.cuida_reminders to authenticated;
revoke insert, update, delete on public.cuida_notes, public.cuida_reminders from anon, authenticated;

-- Registro de idempotência. Uma proposta não poderá criar múltiplas entidades.
create table if not exists public.cuida_applied_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant_message_id uuid not null references public.chat_messages(id) on delete cascade,
  proposal_id uuid not null,
  target_table text not null check (target_table in ('tasks','family_events','cuida_notes','cuida_reminders')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique(assistant_message_id, proposal_id)
);
create index if not exists cuida_applied_owner_idx on public.cuida_applied_items(user_id, household_id);
alter table public.cuida_applied_items enable row level security;
create policy cuida_applied_read on public.cuida_applied_items for select to authenticated
using(user_id = auth.uid() and public.is_member(household_id));
grant select on public.cuida_applied_items to authenticated;
revoke insert, update, delete on public.cuida_applied_items from anon, authenticated;

-- Função transacional: valida assinatura da mensagem de origem, acesso à casa/perfil,
-- responsável real da rede e campos obrigatórios. Toda falha faz rollback integral.
create or replace function public.cuida_confirm_items(
  p_household_id uuid,
  p_assistant_message_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_message public.chat_messages%rowtype;
  v_item jsonb;
  v_original jsonb;
  v_id uuid;
  v_kind text;
  v_title text;
  v_description text;
  v_profile uuid;
  v_assignee uuid;
  v_starts timestamptz;
  v_due timestamptz;
  v_target uuid;
  v_table text;
  v_saved integer := 0;
  v_skipped integer := 0;
  v_count integer;
begin
  if v_uid is null then raise exception 'Faça login para continuar'; end if;
  if not public.is_member(p_household_id) then raise exception 'Sem acesso à casa'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'Selecione os itens para salvar';
  end if;
  v_count := jsonb_array_length(p_items);
  if v_count < 1 or v_count > 12 then raise exception 'Selecione de 1 a 12 itens'; end if;

  select * into v_message from public.chat_messages
   where id = p_assistant_message_id and user_id = v_uid
     and household_id = p_household_id and sender = 'assistant'
     and metadata->>'engine' = 'openai-responses' for update;
  if not found then raise exception 'Resposta da Cuida não encontrada'; end if;
  if jsonb_typeof(v_message.metadata->'proposals') is distinct from 'array' then
    raise exception 'Essa resposta não contém propostas';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object' then raise exception 'Item inválido'; end if;
    if coalesce(v_item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      raise exception 'Identificador da proposta inválido';
    end if;
    v_id := (v_item->>'id')::uuid;
    select value into v_original
      from jsonb_array_elements(v_message.metadata->'proposals')
      where value->>'id' = v_id::text limit 1;
    if v_original is null then raise exception 'Proposta não pertence à resposta da Cuida'; end if;
    if exists(select 1 from public.cuida_applied_items
              where assistant_message_id = p_assistant_message_id and proposal_id = v_id) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_kind := v_item->>'kind';
    v_title := btrim(coalesce(v_item->>'title',''));
    v_description := left(coalesce(v_item->>'description',''),2000);
    if v_kind not in ('commitment','task','reminder','note') or v_kind is null then
      raise exception 'Tipo de item inválido';
    end if;
    if length(v_title) not between 1 and 160 then
      raise exception 'Título precisa ter entre 1 e 160 caracteres';
    end if;

    v_profile := null;
    if nullif(v_item->>'care_profile_id','') is not null then
      v_profile := (v_item->>'care_profile_id')::uuid;
      if not exists(select 1 from public.care_profiles
                    where id=v_profile and household_id=p_household_id) then
        raise exception 'Pessoa cuidada não pertence à casa';
      end if;
    end if;

    v_assignee := null;
    if nullif(v_item->>'assigned_to','') is not null then
      v_assignee := (v_item->>'assigned_to')::uuid;
      if not exists(select 1 from public.household_members
                    where household_id=p_household_id and user_id=v_assignee) then
        raise exception 'Responsável não pertence à rede familiar';
      end if;
    end if;

    -- O acesso restrito a um perfil não autoriza registros de toda a casa.
    if v_kind in ('commitment','task') and not public.access_level(p_household_id,v_profile) then
      raise exception 'Selecione uma pessoa cuidada à qual você tem acesso';
    end if;

    v_starts := null;
    v_due := null;
    if nullif(v_item->>'starts_at','') is not null then
      v_starts := (v_item->>'starts_at')::timestamptz;
    end if;
    if nullif(v_item->>'due_at','') is not null then
      v_due := (v_item->>'due_at')::timestamptz;
    end if;

    if v_kind = 'task' then
      insert into public.tasks(household_id,title,details,due_at,status,assigned_to,
                              assignees,care_profile_id,planned_by,thought_by)
      values (p_household_id,v_title,v_description,v_due,'open',v_assignee,
              case when v_assignee is null then '{}'::uuid[] else array[v_assignee] end,
              v_profile,v_uid,v_uid) returning id into v_target;
      v_table := 'tasks';
    elsif v_kind = 'commitment' then
      if v_starts is null then raise exception 'Defina a data do compromisso'; end if;
      insert into public.family_events(household_id,title,starts_at,details,assigned_to,care_profile_id,created_by)
      values (p_household_id,v_title,v_starts,nullif(v_description,''),v_assignee,v_profile,v_uid)
      returning id into v_target;
      v_table := 'family_events';
    elsif v_kind = 'reminder' then
      insert into public.cuida_reminders(household_id,user_id,title,details,remind_at)
      values (p_household_id,v_uid,v_title,v_description,v_due)
      returning id into v_target;
      v_table := 'cuida_reminders';
    else
      insert into public.cuida_notes(household_id,user_id,title,content)
      values (p_household_id,v_uid,v_title,v_description)
      returning id into v_target;
      v_table := 'cuida_notes';
    end if;
    insert into public.cuida_applied_items(household_id,user_id,assistant_message_id,proposal_id,target_table,target_id)
    values(p_household_id,v_uid,p_assistant_message_id,v_id,v_table,v_target);
    v_saved := v_saved + 1;
  end loop;
  return jsonb_build_object('saved',v_saved,'already_saved',v_skipped);
end;
$$;
revoke all on function public.cuida_confirm_items(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.cuida_confirm_items(uuid,uuid,jsonb) to authenticated;
