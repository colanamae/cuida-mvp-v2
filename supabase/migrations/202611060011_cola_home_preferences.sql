-- Preferências das seis perguntas da Home; um registro por pessoa e família.
create table if not exists public.cola_home_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null,
  answers jsonb not null default '[]'::jsonb,
  dismissed boolean not null default false,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, household_id),
  constraint cola_home_answers_array check (jsonb_typeof(answers) = 'array'),
  constraint cola_home_answers_max check (jsonb_array_length(answers) <= 6)
);

alter table public.cola_home_preferences enable row level security;

-- Protege os dados pessoais de preferências e exige vínculo à família.
create policy "Cola home - select own family preferences"
  on public.cola_home_preferences for select to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.household_members hm
    where hm.household_id = cola_home_preferences.household_id
      and hm.user_id = (select auth.uid())
  ));
create policy "Cola home - insert own family preferences"
  on public.cola_home_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.household_members hm
    where hm.household_id = cola_home_preferences.household_id
      and hm.user_id = (select auth.uid())
  ));
create policy "Cola home - update own family preferences"
  on public.cola_home_preferences for update to authenticated
  using (user_id = (select auth.uid()) and exists (
    select 1 from public.household_members hm
    where hm.household_id = cola_home_preferences.household_id
      and hm.user_id = (select auth.uid())
  ))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.household_members hm
    where hm.household_id = cola_home_preferences.household_id
      and hm.user_id = (select auth.uid())
  ));

-- A chave privada permanece em servidor. Não publicar as respostas de outras contas.
