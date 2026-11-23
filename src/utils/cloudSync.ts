import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserMember, PrivilegeSchedule, Announcement } from '../types';

const SUPABASE_CONFIG_KEY = 'sonido_ebenezer_supabase_cfg_v3';

// Credenciales oficiales del proyecto Supabase Sonido-Ebenezer
const PROJECT_SUPABASE_URL = 'https://krpljcbuaqvduhchllda.supabase.co';
const PROJECT_SUPABASE_KEY = 'sb_publishable_cDxk2jWdTNHVAsXWivpNBw_fMP3ossQ';

function normalizeSupabaseUrl(rawUrl: string): string {
  return rawUrl
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

export function getSavedSupabaseConfig(): SupabaseConfig {
  const envUrl = normalizeSupabaseUrl(
    import.meta.env.VITE_SUPABASE_URL || PROJECT_SUPABASE_URL
  );
  const envKey = (
    import.meta.env.VITE_SUPABASE_ANON_KEY || PROJECT_SUPABASE_KEY
  ).trim();

  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const finalUrl = normalizeSupabaseUrl(parsed.url || envUrl);
      const finalKey = (parsed.anonKey || envKey).trim();
      return {
        url: finalUrl,
        anonKey: finalKey,
        enabled: Boolean(finalUrl && finalKey),
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
  localStorage.setItem(
    SUPABASE_CONFIG_KEY,
    JSON.stringify({
      ...cfg,
      url: normalizeSupabaseUrl(cfg.url),
    })
  );
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
 */
export async function pushStateToCloud(
  payload: AppStatePayload
): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      error:
        'Falta configurar la URL y Publishable Key de Supabase en la aplicación.',
    };
  }

  try {
    const { error } = await client
      .from('sonido_app_state')
      .upsert(
        { id: 'main', payload, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de red',
    };
  }
}

export async function pullStateFromCloud(): Promise<{
  ok: boolean;
  data?: AppStatePayload;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      error:
        'Falta configurar la URL y Publishable Key de Supabase en la aplicación.',
    };
  }

  try {
    const { data, error } = await client
      .from('sonido_app_state')
      .select('payload')
      .eq('id', 'main')
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data?.payload) {
      return { ok: false, error: 'Aún no hay fila main en sonido_app_state.' };
    }
    return { ok: true, data: data.payload as AppStatePayload };
  } catch (err: unknown) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de red',
    };
  }
}

export const SUPABASE_SETUP_SQL = `-- Ejecuta este script en el SQL Editor de tu proyecto gratuito en Supabase (https://supabase.com)
create table if not exists public.sonido_app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

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
`;
