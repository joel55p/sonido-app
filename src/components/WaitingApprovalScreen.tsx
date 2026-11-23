import React, { useState, useEffect } from 'react';
import { UserMember } from '../types';
import { Clock, RefreshCw, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface WaitingApprovalScreenProps {
  currentUser: UserMember;
  onRefreshStatus: () => Promise<void>;
  onLogout: () => void;
}

export const WaitingApprovalScreen: React.FC<WaitingApprovalScreenProps> = ({
  currentUser,
  onRefreshStatus,
  onLogout,
}) => {
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>(
    new Date().toLocaleTimeString('es-GT')
  );

  // Auto-poll Supabase every 6 seconds so as soon as the Diácono/Coordinador approves them,
  // the app opens automatically!
  useEffect(() => {
    const interval = setInterval(async () => {
      await onRefreshStatus();
      setLastChecked(new Date().toLocaleTimeString('es-GT'));
    }, 6000);
    return () => clearInterval(interval);
  }, [onRefreshStatus]);

  const handleManualCheck = async () => {
    setChecking(true);
    try {
      await onRefreshStatus();
      setLastChecked(new Date().toLocaleTimeString('es-GT'));
    } finally {
      setTimeout(() => setChecking(false), 500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
        {/* Official Logo */}
        <div className="w-28 h-28 mx-auto rounded-2xl bg-black border-2 border-blue-500/40 p-2 flex items-center justify-center shadow-xl">
          <img
            src="/logo-sonido.png"
            alt="Departamento de Sonido"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
          <Clock className="w-4 h-4 animate-pulse" />
          Solicitud de Acceso en Espera
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            ¡Hola, {currentUser.name}!
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Tu cuenta se ha registrado correctamente.{' '}
            <strong className="text-white">
              En un momento te estaremos dando acceso
            </strong>{' '}
            y asignando tu rol correspondiente dentro del Departamento de Sonido.
          </p>
        </div>

        {/* Registered User Card */}
        <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex items-center gap-4 text-left">
          <img
            src={currentUser.photoUrl}
            alt={currentUser.name}
            className="w-14 h-14 rounded-xl object-cover border border-blue-500/40 bg-slate-900 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-xs text-slate-400 truncate">
              {currentUser.email}
            </div>
            <div className="text-xs font-mono text-blue-400 mt-0.5">
              {currentUser.phone}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-bold">
            Pendiente
          </span>
        </div>

        {/* Info Notice */}
        <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs text-blue-200 flex items-start gap-3 text-left">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <strong>Actualización Automática:</strong> Esta pantalla verifica tu
            estado automáticamente cada pocos segundos. En cuanto te autoricen y
            asignen tu rol, ingresarás directamente a la plataforma.
            <div className="text-[11px] text-slate-400 mt-1">
              Última verificación: {lastChecked}
            </div>
          </div>
        </div>

        {!currentUser.active && currentUser.role !== 'pendiente' && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              Tu cuenta se encuentra actualmente desasignada. Consulta con tu
              Coordinador o Diácono para reactivar tu acceso.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            disabled={checking}
            onClick={handleManualCheck}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`}
            />
            {checking ? 'Verificando acceso...' : 'Verificar si ya tengo acceso'}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};
