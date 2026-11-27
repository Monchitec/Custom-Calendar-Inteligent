-- Migración: Soporte de Perfil Principal, Correo/Teléfono en perfiles y Finanzas por Perfil
-- Ejecutar en Supabase SQL Editor (es idempotente: se puede correr más de una vez sin error).

alter table public.profiles
  add column if not exists is_primary boolean not null default false,
  add column if not exists currency text not null default 'PEN',
  add column if not exists email text,
  add column if not exists email_notifications boolean not null default false,
  add column if not exists phone text;

-- Si ningún perfil está marcado como principal, marcar el primero según sort_order
update public.profiles
set is_primary = true
where id = (
  select id from public.profiles order by sort_order asc limit 1
)
and not exists (
  select 1 from public.profiles where is_primary = true
);

alter table public.bills
  add column if not exists profile_id text references public.profiles(id) on delete cascade,
  add column if not exists end_date text,
  add column if not exists amount_overrides jsonb not null default '{}'::jsonb,
  add column if not exists excluded_months jsonb not null default '[]'::jsonb;

-- Asignar los pagos/ingresos antiguos sin perfil al perfil principal
update public.bills
set profile_id = (
  select id from public.profiles order by is_primary desc, sort_order asc limit 1
)
where profile_id is null;

-- Soporte de fechas excluidas (excepciones puntuales) en eventos repetitivos
alter table public.events
  add column if not exists excluded_dates jsonb not null default '[]'::jsonb;

-- Recargar el schema cache de PostgREST para que Supabase reconozca las columnas nuevas al instante
notify pgrst, 'reload schema';
