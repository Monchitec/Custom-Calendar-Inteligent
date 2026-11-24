-- ============================================================================
-- ESQUEMA NORMALIZADO EN SUPABASE — MI CALENDARIO PERSONAL / FAMILIAR
-- 8 tablas independientes para edición simultánea sin conflictos (hasta 10+ usuarios)
-- Copia y pega este archivo completo en Supabase → SQL Editor → Run
-- ============================================================================

-- Limpieza opcional de la tabla única anterior (si existía)
drop table if exists public.calendar_workspaces;

-- 1. PERFILES PERSONALIZABLES
create table if not exists public.profiles (
  id text primary key,
  name text not null,
  icon text not null default 'sparkles',
  color_slot text not null default 'cat-1',
  visible boolean not null default true,
  custom_image text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. EVENTOS Y CITAS
create table if not exists public.events (
  id text primary key,
  title text not null,
  date text not null,
  start_time text,
  end_time text,
  all_day boolean not null default false,
  profile_id text not null,
  visual_icon text,
  location text,
  notes text,
  recurrence text not null default 'none',
  reminder_minutes integer,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_date on public.events (date);

-- 3. TAREAS / PENDIENTES
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  completed boolean not null default false,
  profile_id text not null,
  visual_icon text,
  due_date text,
  due_time text,
  priority text not null default 'medium',
  notes text,
  show_on_calendar boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_due_date on public.tasks (due_date);

-- 4. CHECKLISTS / RUTINAS
create table if not exists public.checklists (
  id text primary key,
  title text not null,
  description text,
  profile_id text not null,
  reset_schedule text not null default 'daily',
  last_reset_key text,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 5. PAGOS RECURRENTES DEL HOGAR
create table if not exists public.bills (
  id text primary key,
  name text not null,
  provider text,
  visual_icon text,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'PEN',
  due_day integer not null default 1,
  start_date text not null,
  frequency text not null default 'monthly',
  auto_pay boolean not null default false,
  reminder_days_before integer not null default 3,
  notes text,
  paid_occurrences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 6. ALARMAS PROGRAMADAS
create table if not exists public.alarms (
  id text primary key,
  label text not null,
  time text not null,
  days jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sound text not null default 'chime',
  profile_id text,
  snooze_minutes integer not null default 5,
  created_at timestamptz not null default now()
);

-- 7. NOTIFICACIONES
create table if not exists public.notifications (
  id text primary key,
  title text not null,
  body text not null,
  timestamp timestamptz not null default now(),
  read boolean not null default false,
  kind text not null default 'system',
  link text
);
create index if not exists idx_notifications_ts on public.notifications (timestamp desc);

-- 8. CONFIGURACIÓN GLOBAL (Tema + Preferencias de recordatorios)
create table if not exists public.app_settings (
  id text primary key,
  theme jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  show_bills_on_calendar boolean not null default true,
  show_tasks_on_calendar boolean not null default true,
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- PERMISOS (GRANT) Y ROW LEVEL SECURITY (RLS)
-- ============================================================================
grant usage on schema public to anon, authenticated;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles',
    'events',
    'tasks',
    'checklists',
    'bills',
    'alarms',
    'notifications',
    'app_settings'
  ]
  loop
    execute format('grant select, insert, update, delete on table public.%I to anon, authenticated;', tbl);
    execute format('alter table public.%I enable row level security;', tbl);
    execute format('drop policy if exists "Allow family access" on public.%I;', tbl);
    execute format('create policy "Allow family access" on public.%I for all using (true) with check (true);', tbl);

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', tbl);
    end if;
  end loop;
end $$;

-- ============================================================================
-- STORAGE BUCKET PARA IMÁGENES PERSONALIZADAS
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('calendar-icons', 'calendar-icons', true)
on conflict (id) do nothing;

drop policy if exists "Public read calendar icons" on storage.objects;
create policy "Public read calendar icons"
  on storage.objects for select
  using (bucket_id = 'calendar-icons');

drop policy if exists "Allow upload calendar icons" on storage.objects;
create policy "Allow upload calendar icons"
  on storage.objects for insert
  with check (bucket_id = 'calendar-icons');

drop policy if exists "Allow update calendar icons" on storage.objects;
create policy "Allow update calendar icons"
  on storage.objects for update
  using (bucket_id = 'calendar-icons');

drop policy if exists "Allow delete calendar icons" on storage.objects;
create policy "Allow delete calendar icons"
  on storage.objects for delete
  using (bucket_id = 'calendar-icons');
