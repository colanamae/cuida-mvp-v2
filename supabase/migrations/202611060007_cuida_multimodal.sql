-- Private, owner-scoped attachments. The client may never upload into another user's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cuida-private','cuida-private', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav','audio/x-wav'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "cuida_upload_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'cuida-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cuida_read_own" on storage.objects for select to authenticated
  using (bucket_id = 'cuida-private' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "cuida_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'cuida-private' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Confirmed suggestions go to a dedicated staging list instead of writing to unknown
-- existing task/event schemas. Map them to app modules after verifying those schemas.
create table if not exists public.cuida_reviewed_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_message_id uuid,
  kind text not null check (kind in ('commitment','task','reminder','note')),
  title text not null check (length(title) between 1 and 200),
  description text,
  starts_at timestamptz,
  due_at timestamptz,
  assignee text,
  created_at timestamptz not null default now()
);
create index if not exists cuida_reviewed_items_owner_idx
  on public.cuida_reviewed_items(user_id, household_id, created_at desc);
alter table public.cuida_reviewed_items enable row level security;
-- No client policies: only the Edge Function service role writes and reads these records.
revoke all on public.cuida_reviewed_items from anon, authenticated;
