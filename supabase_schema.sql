-- Script SQL para Supabase (Departamento de Sonido - Ministerios Ebenezer)
-- Pega este código en el apartado "SQL Editor" de tu proyecto en Supabase y dale a "Run"

create table if not exists public.sonido_app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- Otorgar permisos de lectura y escritura a la API pública (anon y authenticated)
grant usage on schema public to anon, authenticated;
grant all on table public.sonido_app_state to anon, authenticated, service_role;

alter table public.sonido_app_state enable row level security;

drop policy if exists "Acceso completo departamento de sonido" on public.sonido_app_state;

create policy "Acceso completo departamento de sonido"
  on public.sonido_app_state
  for all
  to anon, authenticated
  using (true)
  with check (true);
