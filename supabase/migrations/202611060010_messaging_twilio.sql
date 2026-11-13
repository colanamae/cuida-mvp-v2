-- Cola na Mãe · Twilio transport layer. Apply AFTER existing household/tasks schema.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.messaging_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'twilio' check(provider in ('twilio','meta','astracalls')),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  phone text not null check(phone ~ '^\+[0-9]{8,15}$'),
  opted_in_at timestamptz not null default now(),
  opted_out_at timestamptz,
  last_inbound_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider,phone), unique(provider,user_id,household_id)
);
create table if not exists public.messaging_link_tokens (
  token_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messaging_links_expiry_idx on public.messaging_link_tokens(expires_at);
create table if not exists public.messaging_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null check(provider in ('twilio','meta','astracalls')),
  external_id text not null,
  sender_phone text not null,
  recipient_phone text not null,
  text text not null default '',
  media_url text,
  media_type text,
  status text not null default 'pending' check(status in ('pending','processing','done','failed')),
  attempts integer not null default 0,
  processing_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique(provider,external_id)
);
create index if not exists messaging_inbox_pending_idx on public.messaging_inbox(status,created_at);
create table if not exists public.messaging_pending_reviews (
  id uuid primary key default gen_random_uuid(),
  inbox_id uuid not null unique references public.messaging_inbox(id) on delete cascade,
  account_id uuid not null references public.messaging_accounts(id) on delete cascade,
  items jsonb not null check(jsonb_typeof(items)='array'),
  status text not null default 'waiting' check(status in ('waiting','saved','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists messaging_review_account_idx on public.messaging_pending_reviews(account_id,status,created_at desc);
create table if not exists public.messaging_applied (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.messaging_pending_reviews(id) on delete cascade,
  item_index integer not null,
  target text not null check(target in ('tasks','google_calendar')),
  external_id text not null,
  created_at timestamptz not null default now(),
  unique(review_id,item_index)
);
create table if not exists public.messaging_outbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'twilio',
  account_id uuid not null references public.messaging_accounts(id) on delete cascade,
  kind text not null check(kind in ('reply','task_due','calendar_due','assignment')),
  dedupe_key text not null unique,
  text text not null default '',
  template_sid text,
  variables jsonb,
  available_at timestamptz not null default now(),
  status text not null default 'pending' check(status in ('pending','sending','sent','failed','cancelled')),
  attempts integer not null default 0,
  processing_at timestamptz,
  external_sid text,
  provider_status text,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists messaging_outbox_due_idx on public.messaging_outbox(status,available_at);

alter table public.messaging_accounts enable row level security;
alter table public.messaging_link_tokens enable row level security;
alter table public.messaging_inbox enable row level security;
alter table public.messaging_pending_reviews enable row level security;
alter table public.messaging_applied enable row level security;
alter table public.messaging_outbox enable row level security;
revoke all on public.messaging_link_tokens, public.messaging_inbox, public.messaging_pending_reviews,
  public.messaging_applied, public.messaging_outbox from anon, authenticated;
revoke insert, update, delete on public.messaging_accounts from anon, authenticated;
grant select on public.messaging_accounts to authenticated;
create policy messaging_accounts_read on public.messaging_accounts for select to authenticated
 using(user_id=(select auth.uid()) and public.is_member(household_id));

-- Tokens longos gerados em SQL; nunca confiar somente no número de telefone.
create or replace function public.request_whatsapp_link(p_household_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid(); v_token text;
begin
  if v_uid is null or not exists (
    select 1 from public.household_members m where m.household_id=p_household_id and m.user_id=v_uid and m.scope='household'
  ) then raise exception 'Somente membros com acesso à casa toda podem vincular WhatsApp neste MVP'; end if;
  delete from public.messaging_link_tokens where user_id=v_uid;
  v_token:=encode(extensions.gen_random_bytes(16),'hex');
  insert into public.messaging_link_tokens(token_hash,user_id,household_id,expires_at)
    values(encode(extensions.digest(v_token,'sha256'),'hex'),v_uid,p_household_id,now()+interval '10 minutes');
  return v_token;
end; $$;
revoke all on function public.request_whatsapp_link(uuid) from public,anon;
grant execute on function public.request_whatsapp_link(uuid) to authenticated;

create or replace function public.complete_whatsapp_link(p_token text,p_phone text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_rec public.messaging_link_tokens%rowtype; v_id uuid;
begin
  if p_token !~ '^[a-f0-9]{32}$' or p_phone !~ '^\+[0-9]{8,15}$' then return null; end if;
  select * into v_rec from public.messaging_link_tokens
    where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and used_at is null and expires_at>now()
    for update;
  if not found then return null; end if;
  -- Não permitir se um telefone estiver vinculado a outra conta.
  if exists(select 1 from public.messaging_accounts where provider='twilio' and phone=p_phone and user_id<>v_rec.user_id)
    then raise exception 'Número já vinculado a outra conta'; end if;
  delete from public.messaging_accounts where provider='twilio' and user_id=v_rec.user_id and household_id=v_rec.household_id;
  insert into public.messaging_accounts(provider,user_id,household_id,phone)
    values('twilio',v_rec.user_id,v_rec.household_id,p_phone) returning id into v_id;
  update public.messaging_link_tokens set used_at=now() where token_hash=v_rec.token_hash;
  return v_id;
end; $$;
revoke all on function public.complete_whatsapp_link(text,text) from public,anon,authenticated;
grant execute on function public.complete_whatsapp_link(text,text) to service_role;

create or replace function public.claim_messaging_inbox(p_limit int default 5)
returns setof public.messaging_inbox language plpgsql security definer set search_path='' as $$
begin
  return query update public.messaging_inbox i set status='processing', attempts=attempts+1, processing_at=now()
  where i.id in (select q.id from public.messaging_inbox q
    where q.status='pending' or (q.status='processing' and q.processing_at<now()-interval '5 minutes')
    order by q.created_at for update skip locked limit least(greatest(p_limit,1),10)) returning i.*;
end; $$;
create or replace function public.claim_messaging_outbox(p_limit int default 10)
returns setof public.messaging_outbox language plpgsql security definer set search_path='' as $$
begin
  return query update public.messaging_outbox o set status='sending', attempts=attempts+1, processing_at=now()
  where o.id in (select q.id from public.messaging_outbox q
    where (q.status='pending' and q.available_at<=now())
       or (q.status='sending' and q.processing_at<now()-interval '5 minutes')
    order by q.available_at for update skip locked limit least(greatest(p_limit,1),20)) returning o.*;
end; $$;
revoke all on function public.claim_messaging_inbox(int),public.claim_messaging_outbox(int) from public,anon,authenticated;
grant execute on function public.claim_messaging_inbox(int),public.claim_messaging_outbox(int) to service_role;

-- Desvinculação voluntária por usuário autenticado.
create or replace function public.unlink_whatsapp(p_household_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.messaging_accounts where user_id=auth.uid() and household_id=p_household_id;
end; $$;
revoke all on function public.unlink_whatsapp(uuid) from public,anon;
grant execute on function public.unlink_whatsapp(uuid) to authenticated;
