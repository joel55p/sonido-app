import React, { useState, useEffect } from 'react';
import { UserMember } from '../types';
import { processUploadedPhoto } from '../utils/mediaAndPdf';
import {
  sanitizeGuatemalaPhone6,
  isValidPhone502,
  validateStrongPassword,
} from '../data/initialData';
import {
  getSavedSupabaseConfig,
  saveSupabaseConfig,
  SUPABASE_SETUP_SQL,
} from '../utils/cloudSync';
import {
  User,
  Camera,
  Moon,
  Sun,
  Database,
  Save,
  Check,
  CloudUpload,
  CloudDownload,
  Copy,
  AlertCircle,
} from 'lucide-react';

interface SettingsViewProps {
  currentUser: UserMember;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onUpdateMember: (updated: UserMember) => void;
  onSyncPushCloud: () => Promise<{ ok: boolean; error?: string }>;
  onSyncPullCloud: () => Promise<{ ok: boolean; error?: string }>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  darkMode,
  onToggleDarkMode,
  onUpdateMember,
  onSyncPushCloud,
  onSyncPullCloud,
}) => {
  const isDiacono = currentUser.role === 'diacono';

  // Extract 6 digits after +502
  const extractDigits = (phoneStr: string) => {
    const cleaned = (phoneStr || '').replace(/^\+502\s*/, '');
    return sanitizeGuatemalaPhone6(cleaned);
  };

  // Personal Profile State (ONLY: Nombre Completo, Correo, Teléfono +502+6 dígitos, Contraseña)
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phoneDigits, setPhoneDigits] = useState(() =>
    extractDigits(currentUser.phone)
  );
  const [password, setPassword] = useState(currentUser.password || '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setPhoneDigits(extractDigits(currentUser.phone));
    setPassword(currentUser.password || '');
  }, [currentUser]);

  // Cloud DB (Supabase) Config - Only visible to Diácono
  const initialCfg = getSavedSupabaseConfig();
  const [sbUrl, setSbUrl] = useState(initialCfg.url);
  const [sbKey, setSbKey] = useState(initialCfg.anonKey);
  const [sbEnabled, setSbEnabled] = useState(initialCfg.enabled);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  const [showSql, setShowSql] = useState(false);

  const handleMyPhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedPhoto(file);
      onUpdateMember({ ...currentUser, photoUrl: dataUrl });
    } catch {
      alert('No se pudo procesar la imagen.');
    }
  };

  const handleSaveMyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    const fullPhone = `+502${phoneDigits}`;
    if (!isValidPhone502(fullPhone)) {
      setProfileError(
        'El teléfono debe tener el formato +502 seguido de exactamente 6 números (sin texto).'
      );
      return;
    }

    const pwCheck = validateStrongPassword(password);
    if (!pwCheck.valid) {
      setProfileError(
        pwCheck.message ||
          'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.'
      );
      return;
    }

    onUpdateMember({
      ...currentUser,
      name: name.trim() || currentUser.name,
      email: email.trim() || currentUser.email,
      phone: fullPhone,
      password: password,
    });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSaveSupabase = async () => {
    saveSupabaseConfig({
      url: sbUrl.trim(),
      anonKey: sbKey.trim(),
      enabled: sbEnabled,
    });
    setCloudStatus('Configuración guardada localmente.');
  };

  return (
    <div className="space-y-6">
      {/* 1. Personal Profile & Appearance Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveMyProfile}
          className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Mi Perfil de Usuario
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase">
              Rol: {currentUser.role}
            </span>
          </div>

          {profileError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative group flex flex-col items-center">
              <img
                src={currentUser.photoUrl}
                alt={currentUser.name}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 bg-slate-900 shadow-md"
              />
              <label className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer shadow transition-colors">
                <Camera className="w-3.5 h-3.5" />
                Cambiar Mi Foto
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMyPhotoChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* ONLY 4 FIELDS: Nombre Completo, Correo Electrónico, Teléfono (+502 + 6 dígitos), Contraseña de Acceso */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Teléfono (+502 y 6 números)
                </label>
                <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden">
                  <span className="px-3 py-2 bg-slate-200 dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold text-sm border-r border-slate-300 dark:border-slate-700 select-none">
                    +502
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={phoneDigits}
                    onChange={(e) =>
                      setPhoneDigits(sanitizeGuatemalaPhone6(e.target.value))
                    }
                    placeholder="123456"
                    className="w-full px-3 py-2 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Contraseña Segura
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, Mayús, minús y número"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {profileSaved && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  Datos actualizados correctamente
                </span>
              )}
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios de Perfil
            </button>
          </div>
        </form>

        {/* Appearance / Dark Mode Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
              {darkMode ? (
                <Moon className="w-5 h-5 text-blue-400" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Apariencia y Tema
              </h2>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Alterna entre el Modo Oscuro (ideal para cabinas de audio y
              consola durante el servicio) y el Modo Claro.
            </p>

            <button
              type="button"
              onClick={onToggleDarkMode}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-between transition-all cursor-pointer"
            >
              <span className="flex items-center gap-2.5 text-sm font-bold text-slate-900 dark:text-white">
                {darkMode ? (
                  <>
                    <Moon className="w-5 h-5 text-blue-400" />
                    Modo Oscuro Activado
                  </>
                ) : (
                  <>
                    <Sun className="w-5 h-5 text-amber-500" />
                    Modo Claro Activado
                  </>
                )}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold">
                Cambiar
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Free Cloud Database Integration (ONLY VISIBLE TO DIÁCONO) */}
      {isDiacono && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Conexión de Base de Datos (Exclusivo Diácono)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configuración técnica para sincronizar la aplicación con
                  Supabase en la nube.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSql(!showSql)}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold cursor-pointer shrink-0"
            >
              {showSql ? 'Ocultar SQL de Supabase' : 'Ver SQL para Supabase'}
            </button>
          </div>

          {showSql && (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono space-y-2 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 font-bold">
                  Copia y pega este script en el SQL Editor de Supabase:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                    setCloudStatus('Script SQL copiado al portapapeles.');
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar SQL
                </button>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] text-slate-300">
                {SUPABASE_SETUP_SQL}
              </pre>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Project URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                value={sbUrl}
                onChange={(e) => setSbUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supabase Anon Public Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                value={sbKey}
                onChange={(e) => setSbKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={sbEnabled}
                onChange={(e) => setSbEnabled(e.target.checked)}
                className="rounded text-emerald-600"
              />
              Activar sincronización automática con Supabase
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveSupabase}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Guardar Credenciales
              </button>

              <button
                type="button"
                onClick={async () => {
                  handleSaveSupabase();
                  setCloudStatus('Subiendo datos a Supabase...');
                  const res = await onSyncPushCloud();
                  setCloudStatus(
                    res.ok
                      ? '¡Datos sincronizados en la nube correctamente!'
                      : `Error: ${res.error}`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                Subir a la Nube
              </button>

              <button
                type="button"
                onClick={async () => {
                  handleSaveSupabase();
                  setCloudStatus('Descargando datos desde Supabase...');
                  const res = await onSyncPullCloud();
                  setCloudStatus(
                    res.ok
                      ? '¡Datos descargados desde la nube correctamente!'
                      : `Error: ${res.error}`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                <CloudDownload className="w-4 h-4" />
                Descargar de la Nube
              </button>
            </div>
          </div>

          {cloudStatus && (
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {cloudStatus}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
