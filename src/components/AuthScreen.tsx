import React, { useState } from 'react';
import { UserMember } from '../types';
import {
  createAvatarDataUri,
  sanitizeGuatemalaPhone6,
  isValidPhone502,
  validateStrongPassword,
} from '../data/initialData';
import { processUploadedPhoto } from '../utils/mediaAndPdf';
import {
  Headphones,
  LogIn,
  UserPlus,
  Camera,
  AlertCircle,
  CheckCircle2,
  Check,
  Lock,
} from 'lucide-react';

interface AuthScreenProps {
  members: UserMember[];
  onLogin: (member: UserMember) => void;
  onRegister: (newMember: UserMember) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  members,
  onLogin,
  onRegister,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [error, setError] = useState('');

  const pwCheck = validateStrongPassword(password);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedPhoto(file);
      setPhotoUrl(dataUrl);
    } catch {
      setError('No se pudo procesar la fotografía seleccionada.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanEmail = email.trim().toLowerCase();
    const found = members.find(
      (m) =>
        m.email.toLowerCase() === cleanEmail ||
        m.name.toLowerCase() === cleanEmail
    );
    if (!found) {
      setError(
        'No se encontró una cuenta con ese correo o usuario. Verifica tus credenciales o regístrate.'
      );
      return;
    }
    if (found.password !== password) {
      setError('Contraseña incorrecta.');
      return;
    }
    onLogin(found);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Por favor completa Nombre Completo, Correo y Contraseña.');
      return;
    }

    const fullPhone = `+502${phoneDigits}`;
    if (!isValidPhone502(fullPhone)) {
      setError(
        'El teléfono debe tener el formato +502 seguido de exactamente 6 números (sin letras ni espacios).'
      );
      return;
    }

    if (!pwCheck.valid) {
      setError(
        pwCheck.message ||
          'La contraseña no cumple con los requisitos de seguridad.'
      );
      return;
    }

    const exists = members.some(
      (m) => m.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (exists) {
      setError('Ya existe una cuenta registrada con este correo electrónico.');
      return;
    }

    // Se registra con estado 'pendiente' (Sala de espera) hasta que se le asigne rol y acceso
    const newMember: UserMember = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      role: 'pendiente',
      photoUrl:
        photoUrl || createAvatarDataUri(name.trim(), members.length + 1),
      phone: fullPhone,
      active: false,
      createdAt: new Date().toISOString(),
    };

    onRegister(newMember);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col lg:flex-row">
      {/* Left Hero Panel with Logo */}
      <div className="lg:w-1/2 bg-gradient-to-br from-slate-950 via-blue-950/60 to-slate-900 p-8 lg:p-14 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
            <Headphones className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-blue-400 font-semibold">
              Ministerios Ebenezer
            </span>
            <h1 className="text-lg font-bold tracking-tight text-white">
              Departamento de Sonido
            </h1>
          </div>
        </div>

        <div className="my-8 flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden bg-black border-2 border-blue-500/30 shadow-2xl shadow-blue-950/60 mb-6 flex items-center justify-center p-2">
            <img
              src="/logo-sonido.png"
              alt="Logo Sonido Producción de Audio Ministerios Ebenezer"
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
            Producción de Audio & Control de Privilegios
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Plataforma oficial para consultar el Cuadro de Privilegios semanal
            de Lunes a Domingo, supervisar asistencia por servicio, gestionar
            servidores con fotografía y exportar reportes a PDF.
          </p>

          <div className="mt-6 p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 italic">
            "Ahora pues, si están animados por estar en Cristo... completen mi
            alegría teniendo un mismo modo de pensar y amar, permaneciendo
            espiritualmente unidos y con un mismo propósito."
            <span className="block not-italic font-semibold text-blue-400 mt-1">
              — Filipenses 2:1-2 (VBL)
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-500 text-center lg:text-left">
          App Optimizada para PC y Teléfono Móvil • Departamento de Sonido
        </div>
      </div>

      {/* Right Login / Register Panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-slate-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-900 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Registrarse
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form
              onSubmit={handleLoginSubmit}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <div>
                <h3 className="text-lg font-bold text-white">
                  Iniciar Sesión
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ingresa con tu correo electrónico y contraseña
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Correo Electrónico
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Contraseña de Acceso
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                Iniciar Sesión
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleRegisterSubmit}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <div>
                <h3 className="text-lg font-bold text-white">
                  Solicitud de Registro
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Al registrarte pasarás a una sala de espera mientras se te
                  autoriza el acceso y se te asigna tu rol correspondiente.
                </p>
              </div>

              {/* Photo Upload */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-blue-300 cursor-pointer border border-slate-700 transition-colors">
                    <Camera className="w-3.5 h-3.5" />
                    Subir Fotografía de Perfil
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Esta foto aparecerá junto a tu nombre en el Cuadro de
                    Privilegios.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ingresa tu nombre y apellido"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teléfono (Formato: +502 y 6 números)
                </label>
                <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 focus-within:border-blue-500 overflow-hidden">
                  <span className="px-3.5 py-2.5 bg-slate-900 text-blue-400 font-bold text-sm border-r border-slate-800 select-none">
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
                    placeholder="123456 (6 dígitos numéricos)"
                    className="w-full px-3.5 py-2.5 bg-transparent text-sm text-white focus:outline-none font-mono tracking-wider"
                  />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Solo acepta números ({phoneDigits.length}/6 dígitos).
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  Contraseña Segura
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />

                {/* Password requirements checklist */}
                <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 grid grid-cols-2 gap-1.5 text-[11px]">
                  <span
                    className={`flex items-center gap-1 ${
                      pwCheck.hasMinLength
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />8 o más caracteres
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      pwCheck.hasUppercase
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />Al menos 1 mayúscula
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      pwCheck.hasLowercase
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />Al menos 1 minúscula
                  </span>
                  <span
                    className={`flex items-center gap-1 ${
                      pwCheck.hasNumber
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }`}
                  >
                    <Check className="w-3 h-3 shrink-0" />Al menos 1 número
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Enviar Registro y Solicitar Acceso
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
