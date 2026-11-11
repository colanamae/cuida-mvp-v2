-- Cuida V3: atividades apenas em tasks ou Google Calendar.
-- Esta migração NÃO requer que a V2 (cuida_confirm_items) tenha sido aplicada.
-- Mantém eventuais dados antigos em cuida_notes/cuida_reminders; não apaga registros.

-- Histórico da conversa: somente o backend de serviço pode criar mensagens da assistente.
drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_member(household_id) and sender = 'user');
drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages for select to authenticated
using (user_id = (select auth.uid()) and public.is_member(household_id));

create table if not exists public.cuida_applied_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assistant_message_id uuid not null references public.chat_messages(id) on delete cascade,
  proposal_id uuid not null,
  target_table text not null,
  target_id text not null,
  created_at timestamptz not null default now(),
  unique(assistant_message_id, proposal_id)
);
-- Compatível com a V2, que usava target_id UUID. Google usa ID textual próprio.
alter table public.cuida_applied_items alter column target_id type text using target_id::text;
alter table public.cuida_applied_items drop constraint if exists cuida_applied_items_target_table_check;
alter table public.cuida_applied_items add constraint cuida_applied_items_target_table_check
  check (target_table in ('tasks','family_events','cuida_notes','cuida_reminders','google_calendar'));
create index if not exists cuida_applied_owner_idx on public.cuida_applied_items(user_id, household_id);
alter table public.cuida_applied_items enable row level security;
drop policy if exists cuida_applied_read on public.cuida_applied_items;
create policy cuida_applied_read on public.cuida_applied_items for select to authenticated
using(user_id = (select auth.uid()) and public.is_member(household_id));
grant select on public.cuida_applied_items to authenticated;
revoke insert, update, delete on public.cuida_applied_items from public, anon, authenticated;

-- Atômico: validar proposta gerada pela Cuida, perfil, responsável e inserir tarefa.
create or replace function public.cuida_confirm_task_v3(
  p_household_id uuid, p_assistant_message_id uuid, p_item jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_proposal uuid;
  v_origin public.chat_messages%rowtype;
  v_target text;
  v_title text := btrim(coalesce(p_item->>'title',''));
  v_details text := left(coalesce(p_item->>'description',''),2000);
  v_due timestamptz;
  v_assignee uuid;
  v_profile uuid;
  v_category text;
begin
  if v_uid is null or not public.is_member(p_household_id) then
    raise exception 'Acesso à casa não autorizado';
  end if;
  if p_item->>'kind' <> 'task' or coalesce(p_item->>'id','') !~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Proposta de tarefa inválida';
  end if;
  v_proposal := (p_item->>'id')::uuid;
  if length(v_title) not between 1 and 160 then raise exception 'Título inválido'; end if;
  select * into v_origin from public.chat_messages where id = p_assistant_message_id
    and user_id = v_uid and household_id = p_household_id and sender = 'assistant'
    and metadata->>'engine' = 'openai-responses' for update;
  if not found or not exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(v_origin.metadata->'proposals') = 'array'
        then v_origin.metadata->'proposals' else '[]'::jsonb end
    ) x where x->>'id' = v_proposal::text
  ) then raise exception 'Proposta não pertence à conversa'; end if;

  select target_id into v_target from public.cuida_applied_items
    where assistant_message_id = p_assistant_message_id and proposal_id = v_proposal;
  if found then return jsonb_build_object('saved',0,'already_saved',1,'target','tasks','target_id',v_target); end if;

  if nullif(p_item->>'due_at','') is not null then v_due := (p_item->>'due_at')::timestamptz; end if;
  if nullif(p_item->>'assigned_to','') is not null then
    v_assignee := (p_item->>'assigned_to')::uuid;
    if not exists(select 1 from public.household_members
       where household_id = p_household_id and user_id = v_assignee) then
       raise exception 'Responsável não pertence à casa';
    end if;
  end if;
  if nullif(p_item->>'care_profile_id','') is not null then
    v_profile := (p_item->>'care_profile_id')::uuid;
    if not exists(select 1 from public.care_profiles
       where id=v_profile and household_id=p_household_id) then
       raise exception 'Pessoa cuidada inválida';
    end if;
  end if;
  if not public.access_level(p_household_id,v_profile) then
     raise exception 'Sem permissão para criar esta tarefa';
  end if;
  v_category := nullif(p_item->>'category','');
  if v_category is not null and v_category not in ('Saúde','Escola','Casa','Cuidados pessoais') then
    raise exception 'Categoria inválida';
  end if;

  insert into public.tasks(household_id,title,details,due_at,status,assigned_to,
      assignees,category,care_profile_id,planned_by,thought_by)
  values(p_household_id,v_title,v_details,v_due,'open',v_assignee,
      case when v_assignee is null then '{}'::uuid[] else array[v_assignee] end,
      v_category,v_profile,v_uid,v_uid)
  returning id::text into v_target;
  insert into public.cuida_applied_items(household_id,user_id,assistant_message_id,proposal_id,target_table,target_id)
  values(p_household_id,v_uid,p_assistant_message_id,v_proposal,'tasks',v_target);
  return jsonb_build_object('saved',1,'already_saved',0,'target','tasks','target_id',v_target);
end;
$$;
revoke all on function public.cuida_confirm_task_v3(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.cuida_confirm_task_v3(uuid,uuid,jsonb) to authenticated;

-- Depois de inserir no Google com ID determinístico, registrar a confirmação.
-- Se a API funcionar mas o registro local falhar, tentar de novo é seguro:
-- o mesmo ID será encontrado e verificado antes de registrar.
create or replace function public.cuida_record_google_event_v3(
  p_household_id uuid, p_assistant_message_id uuid,
  p_proposal_id uuid, p_google_event_id text, p_user_id uuid
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := p_user_id;
  v_origin public.chat_messages%rowtype;
  v_current text;
  v_expected text := 'cuida' || replace(p_proposal_id::text, '-', '');
begin
  if v_uid is null or not exists(select 1 from public.household_members
    where household_id=p_household_id and user_id=v_uid) then
    raise exception 'Casa não autorizada';
  end if;
  if p_google_event_id is distinct from v_expected then
    raise exception 'Identificador do Google inválido';
  end if;
  select * into v_origin from public.chat_messages
    where id=p_assistant_message_id and user_id=v_uid
      and household_id=p_household_id and sender='assistant'
      and metadata->>'engine'='openai-responses' for update;
  if not found or not exists (
    select 1 from jsonb_array_elements(
      case when jsonb_typeof(v_origin.metadata->'proposals')='array'
        then v_origin.metadata->'proposals' else '[]'::jsonb end
    ) x where x->>'id'=p_proposal_id::text
  ) then raise exception 'Proposta original inválida'; end if;

  select target_id into v_current from public.cuida_applied_items
    where assistant_message_id=p_assistant_message_id and proposal_id=p_proposal_id;
  if found then
    if v_current <> v_expected then raise exception 'Proposta já foi aplicada em outro destino'; end if;
    return jsonb_build_object('saved',0,'already_saved',1,'target','google_calendar','target_id',v_current);
  end if;
  insert into public.cuida_applied_items(household_id,user_id,assistant_message_id,proposal_id,target_table,target_id)
  values(p_household_id,v_uid,p_assistant_message_id,p_proposal_id,'google_calendar',v_expected);
  return jsonb_build_object('saved',1,'already_saved',0,'target','google_calendar','target_id',v_expected);
end;
$$;
revoke all on function public.cuida_record_google_event_v3(uuid,uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.cuida_record_google_event_v3(uuid,uuid,uuid,text,uuid) to service_role;
