-- The OAuth tokens and pending authorization states are server-only.
create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_ciphertext text not null,
  access_token_ciphertext text,
  expires_at timestamptz,
  google_email text,
  updated_at timestamptz not null default now()
);
create table if not exists public.google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists google_calendar_oauth_states_expiry_idx on public.google_calendar_oauth_states(expires_at);
alter table public.google_calendar_connections enable row level security;
alter table public.google_calendar_oauth_states enable row level security;
-- No policies: anon/authenticated cannot read token or state tables, even for their own user_id.
revoke all on public.google_calendar_connections from anon, authenticated;
revoke all on public.google_calendar_oauth_states from anon, authenticated;
-- OAuth state must be single-use even if the callback is requested concurrently.
create or replace function public.consume_google_calendar_oauth_state(p_hash text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  delete from public.google_calendar_oauth_states
    where state_hash = p_hash and expires_at > now()
    returning user_id into result;
  return result;
end;
$$;
revoke all on function public.consume_google_calendar_oauth_state(text) from public, anon, authenticated;
grant execute on function public.consume_google_calendar_oauth_state(text) to service_role;
