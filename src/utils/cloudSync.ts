import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserMember, PrivilegeSchedule, Announcement } from '../types';

const SUPABASE_CONFIG_KEY = 'sonido_ebenezer_supabase_cfg';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: parsed.url || envUrl,
        anonKey: parsed.anonKey || envKey,
        enabled: Boolean(parsed.enabled && (parsed.url || envUrl) && (parsed.anonKey || envKey)),
      };
    }
  } catch {
    // ignore parse errors
  }

  return {
    url: envUrl,
    anonKey: envKey,
    enabled: Boolean(envUrl && envKey),
  };
}

export function saveSupabaseConfig(cfg: SupabaseConfig): void {
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(cfg));
}

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSavedSupabaseConfig();
  if (!cfg.enabled || !cfg.url || !cfg.anonKey) return null;
  try {
    return createClient(cfg.url, cfg.anonKey);
  } catch {
    return null;
  }
}

export interface AppStatePayload {
  members: UserMember[];
  schedules: PrivilegeSchedule[];
  activeScheduleId: string;
  announcements: Announcement[];
  updatedAt: string;
}

/**
 * Pushes the unified state to Supabase table `sonido_app_state` (id = 'main').
 * Using a single JSONB state row + individual rows makes free-tier usage virtually zero
 * and avoids complex migrations for a 50-person church team.
 */
export async function pushStateToCloud(payload: AppStatePayload): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no está configurado o activado.' };

  try {
    const { error } = await client
      .from('sonido_app_state')
      .upsert({ id: 'main', payload, updated_at: new Date().toISOString() }, { onConflict: 'id' });

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red' };
  }
}

export async function pullStateFromCloud(): Promise<{ ok: boolean; data?: AppStatePayload; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: 'Supabase no está configurado o activado.' };

  try {
    const { data, error } = await client
      .from('sonido_app_state')
      .select('payload')
      .eq('id', 'main')
      .single();

    if (error) return { ok: false, error: error.message };
    if (!data?.payload) return { ok: false, error: 'No hay datos guardados aún en la nube.' };
    return { ok: true, data: data.payload as AppStatePayload };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error de red' };
  }
}

export const SUPABASE_SETUP_SQL = `-- Ejecuta este script en el SQL Editor de tu proyecto gratuito en Supabase (https://supabase.com)
create table if not exists public.sonido_app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

-- Permitir lectura y escritura desde la app web de Sonido
alter table public.sonido_app_state enable row level security;

create policy "Acceso completo departamento de sonido"
  on public.sonido_app_state
  for all
  using (true)
  with check (true);
`;
