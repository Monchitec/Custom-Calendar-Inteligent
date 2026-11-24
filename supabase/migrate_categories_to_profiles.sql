-- ============================================================================
-- MIGRACIÓN SEGURA (SIN PÉRDIDA DE DATOS): categories -> profiles
-- Ejecuta este script UNA SOLA VEZ en Supabase → SQL Editor → Run
-- ============================================================================

do $$
begin
  -- 1. Renombrar tabla categories -> profiles
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'categories'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.categories rename to profiles;
  end if;

  -- 2. Renombrar columna category_id -> profile_id en events, tasks, checklists, alarms
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'events' and column_name = 'category_id'
  ) then
    alter table public.events rename column category_id to profile_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tasks' and column_name = 'category_id'
  ) then
    alter table public.tasks rename column category_id to profile_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'checklists' and column_name = 'category_id'
  ) then
    alter table public.checklists rename column category_id to profile_id;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'alarms' and column_name = 'category_id'
  ) then
    alter table public.alarms rename column category_id to profile_id;
  end if;

  -- 3. Asegurar permisos, RLS y publicación Realtime para public.profiles
  grant select, insert, update, delete on table public.profiles to anon, authenticated;
  alter table public.profiles enable row level security;
  drop policy if exists "Allow family access" on public.profiles;
  create policy "Allow family access" on public.profiles for all using (true) with check (true);

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- 4. Asegurar política DELETE para limpieza automática de imágenes en Storage
drop policy if exists "Allow delete calendar icons" on storage.objects;
create policy "Allow delete calendar icons"
  on storage.objects for delete
  using (bucket_id = 'calendar-icons');
