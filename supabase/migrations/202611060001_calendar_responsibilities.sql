-- Responsabilidades de eventos Google: notas de organização pessoais e NÃO convites do Google.
-- O ID do evento pertence à conexão Google particular da usuária.
create table if not exists public.calendar_responsibilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  google_event_id text not null check(length(google_event_id) between 1 and 512),
  responsible_member_id uuid references public.household_members(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(user_id,household_id,google_event_id)
);
create index if not exists calendar_resp_user_household_idx on public.calendar_responsibilities(user_id,household_id);
alter table public.calendar_responsibilities enable row level security;
create policy calendar_resp_select on public.calendar_responsibilities for select to authenticated using(user_id=auth.uid() and public.is_member(household_id));
create policy calendar_resp_insert on public.calendar_responsibilities for insert to authenticated with check(
  user_id=auth.uid() and public.is_member(household_id) and
  (responsible_member_id is null or exists(select 1 from public.household_members m where m.id=responsible_member_id and m.household_id=calendar_responsibilities.household_id))
);
create policy calendar_resp_update on public.calendar_responsibilities for update to authenticated using(user_id=auth.uid() and public.is_member(household_id)) with check(
  user_id=auth.uid() and public.is_member(household_id) and
  (responsible_member_id is null or exists(select 1 from public.household_members m where m.id=responsible_member_id and m.household_id=calendar_responsibilities.household_id))
);
create policy calendar_resp_delete on public.calendar_responsibilities for delete to authenticated using(user_id=auth.uid() and public.is_member(household_id));
