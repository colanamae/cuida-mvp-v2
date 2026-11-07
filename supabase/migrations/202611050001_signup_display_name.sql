-- Exibir o nome informado no cadastro ao criar uma casa ou aceitar convite.
-- O aceite dos documentos é armazenado como user_metadata no Supabase Auth;
-- para auditoria jurídica imutável, implementar registro seguro no backend em versão posterior.
create or replace function public.create_household(p_name text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare hid uuid; uid uuid; display_name text;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Autenticação obrigatória'; end if;
  if length(trim(p_name)) < 1 or length(p_name) > 80 then raise exception 'Nome inválido'; end if;
  select coalesce(nullif(trim(raw_user_meta_data->>'display_name'), ''), nullif(split_part(email,'@',1),''), 'Responsável')
    into display_name from auth.users where id=uid;
  insert into public.households(name,created_by) values(trim(p_name),uid) returning id into hid;
  insert into public.household_members(household_id,user_id,display_name,role,scope,color)
    values(hid,uid,left(display_name,100),'admin','household','#FEB7B7');
  return hid;
end $$;

create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path=''
as $$
declare inv public.invitations%rowtype; uid uuid; user_email text; display_name text;
begin
  uid := auth.uid();
  if uid is null then raise exception 'Entre na sua conta antes'; end if;
  select lower(email),coalesce(nullif(trim(raw_user_meta_data->>'display_name'),''),nullif(split_part(email,'@',1),''),'Responsável')
    into user_email,display_name from auth.users where id=uid and email_confirmed_at is not null;
  if user_email is null then raise exception 'Confirme seu e-mail para aceitar convites'; end if;
  select * into inv from public.invitations where token=p_token::uuid for update;
  if not found or inv.accepted_at is not null or inv.expires_at<now() or inv.email<>user_email then
    raise exception 'Convite inválido, vencido ou de outro e-mail';
  end if;
  insert into public.household_members(household_id,user_id,display_name,role,scope,care_profile_id)
    values(inv.household_id,uid,left(display_name,100),'caregiver',inv.scope,inv.care_profile_id)
    on conflict(household_id,user_id) do nothing;
  update public.invitations set accepted_at=now() where id=inv.id;
  return inv.household_id;
end $$;

revoke all on function public.create_household(text) from public;
grant execute on function public.create_household(text) to authenticated;
revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
