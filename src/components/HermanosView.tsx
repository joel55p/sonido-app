import React, { useState } from 'react';
import { UserMember, Role, getRoleLabel } from '../types';
import { processUploadedPhoto } from '../utils/mediaAndPdf';
import {
  createAvatarDataUri,
  sanitizeGuatemalaPhone6,
  isValidPhone502,
  validateStrongPassword,
} from '../data/initialData';
import {
  Users,
  Search,
  Camera,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Sliders,
  User,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Award,
} from 'lucide-react';

interface HermanosViewProps {
  currentUser: UserMember;
  members: UserMember[];
  onUpdateMember: (updated: UserMember) => void;
  onAddMember: (newMember: UserMember) => void;
  onDeleteMember: (id: string) => Promise<void>;
}

export const HermanosView: React.FC<HermanosViewProps> = ({
  currentUser,
  members,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
}) => {
  // Rol 1 (diacono) y Rol 2 (ayuda_directa) tienen acceso total a todo igual que Diácono
  const hasFullDiaconoAccess =
    currentUser.role === 'diacono' || currentUser.role === 'ayuda_directa';
  const isAyudaDiacono = currentUser.role === 'ayuda_diacono';

  const [searchName, setSearchName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'todos' | 'liderazgo' | 'coordinadores' | 'servidores'
  >('todos');
  const [showAddForm, setShowAddForm] = useState(false);

  // Custom Delete Confirmation Modal State
  const [memberToDelete, setMemberToDelete] = useState<UserMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Brother form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneDigits, setNewPhoneDigits] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('servidor');
  const [formError, setFormError] = useState('');

  const handlePhotoUpload = async (
    member: UserMember,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedPhoto(file);
      onUpdateMember({ ...member, photoUrl: dataUrl });
    } catch {
      alert('No se pudo procesar la fotografía.');
    }
  };

  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!newName.trim() || !newEmail.trim() || !newPassword) {
      setFormError('Completa nombre, correo electrónico y contraseña.');
      return;
    }

    const fullPhone = `+502${newPhoneDigits}`;
    if (!isValidPhone502(fullPhone)) {
      setFormError(
        'El teléfono debe tener el formato +502 seguido de exactamente 6 números.'
      );
      return;
    }

    const pwCheck = validateStrongPassword(newPassword);
    if (!pwCheck.valid) {
      setFormError(
        pwCheck.message ||
          'La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula y número.'
      );
      return;
    }

    const exists = members.some(
      (m) => m.email.toLowerCase() === newEmail.trim().toLowerCase()
    );
    if (exists) {
      setFormError('Ya existe un hermano registrado con ese correo.');
      return;
    }

    const assignedRole: Role = hasFullDiaconoAccess
      ? newRole
      : newRole === 'coordinador' || newRole === 'servidor'
      ? newRole
      : 'servidor';

    const created: UserMember = {
      id: `m-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword,
      role: assignedRole,
      photoUrl: createAvatarDataUri(newName.trim(), members.length + 1),
      phone: fullPhone,
      active: true,
      createdAt: new Date().toISOString(),
    };

    onAddMember(created);
    setNewName('');
    setNewEmail('');
    setNewPhoneDigits('');
    setNewPassword('');
    setNewRole('servidor');
    setShowAddForm(false);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteMember(memberToDelete.id);
      setMemberToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Pending users waiting in the Waiting Room
  const pendingMembers = members.filter((m) => m.role === 'pendiente');

  // Filter approved members by name search
  const matchingMembers = members.filter(
    (m) =>
      m.role !== 'pendiente' &&
      m.name.toLowerCase().includes(searchName.trim().toLowerCase())
  );

  // Separate into 3 categories:
  // 1. Diácono y Ayudas de Diácono (diacono, ayuda_directa, ayuda_diacono)
  // 2. Coordinadores (coordinador)
  // 3. Servidores (servidor)
  const liderazgoList = matchingMembers.filter(
    (m) =>
      m.role === 'diacono' ||
      m.role === 'ayuda_directa' ||
      m.role === 'ayuda_diacono'
  );
  const coordinadoresList = matchingMembers.filter(
    (m) => m.role === 'coordinador'
  );
  const servidoresList = matchingMembers.filter((m) => m.role === 'servidor');

  // Hierarchy check:
  // - Rol 1 (diacono) and Rol 2 (ayuda_directa) can manage anyone (except themselves)
  // - Rol 3 (ayuda_diacono) can manage Coordinadores and Servidores
  const canManageTarget = (target: UserMember): boolean => {
    if (target.id === currentUser.id) return false;
    if (hasFullDiaconoAccess) {
      return true;
    }
    if (isAyudaDiacono) {
      return target.role === 'coordinador' || target.role === 'servidor';
    }
    return false;
  };

  const handleApprovePending = (member: UserMember, assignedRole: Role) => {
    if (
      !hasFullDiaconoAccess &&
      assignedRole !== 'coordinador' &&
      assignedRole !== 'servidor'
    ) {
      return;
    }
    onUpdateMember({
      ...member,
      role: assignedRole,
      active: true,
    });
  };

  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'diacono':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase">
            <ShieldCheck className="w-3 h-3" />
            Diácono
          </span>
        );
      case 'ayuda_directa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-[10px] font-extrabold uppercase">
            <Award className="w-3 h-3" />
            Ayuda Directa del Diácono
          </span>
        );
      case 'ayuda_diacono':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 text-[10px] font-extrabold uppercase">
            <ShieldCheck className="w-3 h-3" />
            Ayuda de Diácono
          </span>
        );
      case 'coordinador':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-extrabold uppercase">
            <Sliders className="w-3 h-3" />
            Coordinador
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
            <User className="w-3 h-3" />
            Servidor
          </span>
        );
    }
  };

  const renderMemberCard = (member: UserMember) => {
    const editable = canManageTarget(member);

    return (
      <div
        key={member.id}
        className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all flex flex-col justify-between gap-4 ${
          member.active
            ? 'border-slate-200 dark:border-slate-800'
            : 'border-red-500/30 bg-red-500/5 opacity-75'
        }`}
      >
        <div className="flex items-start gap-3.5">
          {/* Avatar + Photo Upload if permitted */}
          <div className="relative shrink-0">
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 bg-slate-900"
            />
            {(editable || member.id === currentUser.id) && (
              <label
                title="Cambiar fotografía para el Cuadro PDF"
                className="absolute -bottom-1 -right-1 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow"
              >
                <Camera className="w-3 h-3" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoUpload(member, e)}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {renderRoleBadge(member.role)}

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  member.active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                }`}
              >
                {member.active ? 'Activo' : 'Desasignado'}
              </span>
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {member.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {member.email}
            </p>
            <p className="text-xs font-mono text-blue-600 dark:text-blue-400 mt-0.5">
              {member.phone}
            </p>
          </div>
        </div>

        {/* Hierarchical Action Controls */}
        {editable && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            {/* Role Selector Dropdown */}
            <select
              value={member.role}
              onChange={(e) =>
                onUpdateMember({
                  ...member,
                  role: e.target.value as Role,
                })
              }
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              {hasFullDiaconoAccess && (
                <>
                  <option value="diacono">Rol 1: Diácono</option>
                  <option value="ayuda_directa">
                    Rol 2: Ayuda Directa del Diácono
                  </option>
                  <option value="ayuda_diacono">
                    Rol 3: Ayuda de Diácono
                  </option>
                </>
              )}
              <option value="coordinador">Rol 4: Coordinador</option>
              <option value="servidor">Rol 5: Servidor</option>
            </select>

            <div className="flex items-center gap-1.5">
              {/* Assign / Deassign active status */}
              <button
                type="button"
                onClick={() =>
                  onUpdateMember({ ...member, active: !member.active })
                }
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  member.active
                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                }`}
              >
                {member.active ? (
                  <>
                    <UserX className="w-3.5 h-3.5" />
                    Desasignar
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5" />
                    Asignar
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setMemberToDelete(member)}
                title="Eliminar cuenta permanentemente"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* ================= SOLICITUDES EN SALA DE ESPERA (PENDIENTES DE ACCESO) ================= */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-black">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Solicitudes en Sala de Espera ({pendingMembers.length})
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Personas que se acaban de registrar y esperan que les aceptes y
                les asignes su rol en el Departamento de Sonido.
              </p>
            </div>
          </div>
        </div>

        {pendingMembers.length === 0 ? (
          <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20 text-xs text-slate-500 dark:text-slate-400 text-center">
            No hay solicitudes pendientes en la sala de espera en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingMembers.map((pending) => (
              <div
                key={pending.id}
                className="bg-white dark:bg-slate-900 border border-amber-500/40 rounded-2xl p-4 shadow flex flex-col justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={pending.photoUrl}
                    alt={pending.name}
                    className="w-14 h-14 rounded-xl object-cover border-2 border-amber-500 bg-slate-900 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-300 text-[10px] font-extrabold uppercase mb-1">
                      Esperando Acceso
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {pending.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {pending.email}
                    </p>
                    <p className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {pending.phone}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Aceptar y asignar rol como:
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {hasFullDiaconoAccess && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleApprovePending(pending, 'ayuda_directa')
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold shadow cursor-pointer transition-all"
                        >
                          <Award className="w-3.5 h-3.5" />
                          Ayuda Directa Diácono
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleApprovePending(pending, 'ayuda_diacono')
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold shadow cursor-pointer transition-all"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Ayuda de Diácono
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleApprovePending(pending, 'coordinador')
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow cursor-pointer transition-all"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Coordinador
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprovePending(pending, 'servidor')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Servidor
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemberToDelete(pending)}
                      className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-bold cursor-pointer ml-auto"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Directorio de Hermanos con Acceso
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {hasFullDiaconoAccess
                ? `Con tu rol de ${getRoleLabel(currentUser.role)} tienes acceso total para gestionar Ayudas de Diácono, Coordinadores y Servidores.`
                : 'Como Ayuda de Diácono puedes aceptar nuevos hermanos y gestionar Coordinadores y Servidores.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError('');
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          {showAddForm ? 'Cerrar Formulario' : 'Agregar Hermano Directamente'}
        </button>
      </div>

      {/* Add New Member Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateMember}
          className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-lg space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Registrar y Dar Acceso Directo
          </h3>

          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre y Apellido"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="hermano@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono (+502 y 6 números)
              </label>
              <div className="flex items-center rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden">
                <span className="px-3 py-2.5 bg-slate-200 dark:bg-slate-950 text-blue-600 dark:text-blue-400 font-bold text-xs border-r border-slate-300 dark:border-slate-700">
                  +502
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  value={newPhoneDigits}
                  onChange={(e) =>
                    setNewPhoneDigits(sanitizeGuatemalaPhone6(e.target.value))
                  }
                  placeholder="123456"
                  className="w-full px-3 py-2.5 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contraseña Segura
              </label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Ej: Sonido2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rol Asignado
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
              >
                <option value="servidor">Rol 5: Servidor</option>
                <option value="coordinador">Rol 4: Coordinador</option>
                {hasFullDiaconoAccess && (
                  <>
                    <option value="ayuda_diacono">
                      Rol 3: Ayuda de Diácono
                    </option>
                    <option value="ayuda_directa">
                      Rol 2: Ayuda Directa del Diácono
                    </option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Guardar y Dar Acceso
            </button>
          </div>
        </form>
      )}

      {/* Filter by Name & Category Selector */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Filtrar hermanos por nombre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setCategoryFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'todos'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({matchingMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('liderazgo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'liderazgo'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Diácono y Ayudas ({liderazgoList.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('coordinadores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'coordinadores'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Coordinadores ({coordinadoresList.length})
          </button>
          <button
            type="button"
            onClick={() => setCategoryFilter('servidores')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              categoryFilter === 'servidores'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Servidores ({servidoresList.length})
          </button>
        </div>
      </div>

      {/* Category 1: DIÁCONO Y AYUDAS DE DIÁCONO */}
      {(categoryFilter === 'todos' || categoryFilter === 'liderazgo') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Categoría: Diácono y Ayudas de Diácono ({liderazgoList.length})
            </h3>
          </div>

          {liderazgoList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No hay miembros en esta categoría aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {liderazgoList.map(renderMemberCard)}
            </div>
          )}
        </div>
      )}

      {/* Category 2: COORDINADORES */}
      {(categoryFilter === 'todos' || categoryFilter === 'coordinadores') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Categoría: Coordinadores ({coordinadoresList.length})
            </h3>
          </div>

          {coordinadoresList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No hay coordinadores registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {coordinadoresList.map(renderMemberCard)}
            </div>
          )}
        </div>
      )}

      {/* Category 3: SERVIDORES */}
      {(categoryFilter === 'todos' || categoryFilter === 'servidores') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Categoría: Servidores ({servidoresList.length})
            </h3>
          </div>

          {servidoresList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No hay servidores registrados aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {servidoresList.map(renderMemberCard)}
            </div>
          )}
        </div>
      )}

      {/* ================= CUSTOM CONFIRMATION MODAL FOR DELETING ACCOUNT ================= */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-red-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Top Header */}
            <div className="bg-gradient-to-r from-red-600 to-rose-700 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-white shrink-0" />
                <h3 className="text-base font-extrabold">
                  Confirmar Eliminación de Cuenta
                </h3>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMemberToDelete(null)}
                className="p-1 rounded-lg bg-white/15 hover:bg-white/25 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Target User Card */}
              <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <img
                  src={memberToDelete.photoUrl}
                  alt={memberToDelete.name}
                  className="w-14 h-14 rounded-xl object-cover border-2 border-red-500/50 bg-slate-900 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2 py-0.5 rounded bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-extrabold uppercase">
                    Rol: {getRoleLabel(memberToDelete.role)}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                    {memberToDelete.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {memberToDelete.email}
                  </p>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
                <p>
                  ¿Estás seguro de que deseas eliminar permanentemente la cuenta
                  de{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {memberToDelete.name}
                  </strong>
                  ?
                </p>
                <ul className="list-disc list-inside text-xs text-red-600 dark:text-red-400 space-y-1 font-medium">
                  <li>
                    Se eliminará por completo de la base de datos en Supabase.
                  </li>
                  <li>
                    Dejará de existir en la aplicación y se quitará de los
                    cuadros de servicio.
                  </li>
                  <li>
                    Si tiene la aplicación abierta en su teléfono o PC, su
                    sesión se cerrará inmediatamente.
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setMemberToDelete(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-extrabold shadow-lg shadow-red-600/25 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting
                    ? 'Eliminando de Supabase...'
                    : 'Sí, Eliminar Cuenta'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
