-- Script SQL para Supabase (Departamento de Sonido - Ministerios Ebenezer)
-- Pega este código en el apartado "SQL Editor" de tu proyecto en Supabase y dale a "Run"

create table if not exists public.sonido_app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table public.sonido_app_state enable row level security;

create policy "Acceso completo departamento de sonido"
  on public.sonido_app_state
  for all
  using (true)
  with check (true);
