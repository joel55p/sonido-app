import React, { useState } from 'react';
import { UserMember } from '../types';
import { processUploadedPhoto } from '../utils/mediaAndPdf';
import {
  createAvatarDataUri,
  sanitizeGuatemalaPhone6,
  isValidPhone502,
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
  ArrowUpDown,
} from 'lucide-react';

interface HermanosViewProps {
  currentUser: UserMember;
  members: UserMember[];
  onUpdateMember: (updated: UserMember) => void;
  onAddMember: (newMember: UserMember) => void;
  onDeleteMember: (id: string) => void;
}

export const HermanosView: React.FC<HermanosViewProps> = ({
  currentUser,
  members,
  onUpdateMember,
  onAddMember,
  onDeleteMember,
}) => {
  const isDiacono = currentUser.role === 'diacono';
  const isCoordinador = currentUser.role === 'coordinador';

  const [searchName, setSearchName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'todos' | 'coordinadores' | 'servidores'
  >('todos');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Brother form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhoneDigits, setNewPhoneDigits] = useState('');
  const [newRole, setNewRole] = useState<'servidor' | 'coordinador'>('servidor');
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
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Completa el nombre y correo electrónico.');
      return;
    }

    const fullPhone = `+502${newPhoneDigits}`;
    if (!isValidPhone502(fullPhone)) {
      setFormError(
        'El teléfono debe tener el formato +502 seguido de exactamente 6 números.'
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

    // Jerarquía estricta: el Coordinador solo puede asignar Servidores; el Diácono puede asignar Coordinadores o Servidores
    const assignedRole = isDiacono ? newRole : 'servidor';

    const created: UserMember = {
      id: `m-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      password: '123',
      role: assignedRole,
      photoUrl: createAvatarDataUri(newName.trim(), members.length + 1),
      phone: fullPhone,
      active: true,
    };

    onAddMember(created);
    setNewName('');
    setNewEmail('');
    setNewPhoneDigits('');
    setNewRole('servidor');
    setShowAddForm(false);
  };

  // Filter members by name search
  const matchingMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchName.trim().toLowerCase())
  );

  // Separate into categories: Coordinadores and Servidores
  const coordinadoresList = matchingMembers.filter(
    (m) => m.role === 'coordinador' || m.role === 'diacono'
  );
  const servidoresList = matchingMembers.filter((m) => m.role === 'servidor');

  // Strict hierarchy check:
  // - Diácono can manage (assign/deassign role or active status) both Coordinadores and Servidores (except himself)
  // - Coordinador can ONLY manage (assign/deassign active status or remove) Servidores
  const canManageTarget = (target: UserMember): boolean => {
    if (target.id === currentUser.id) return false;
    if (isDiacono) {
      return target.role === 'coordinador' || target.role === 'servidor';
    }
    if (isCoordinador) {
      return target.role === 'servidor';
    }
    return false;
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
              {member.role === 'diacono' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-extrabold uppercase">
                  <ShieldCheck className="w-3 h-3" />
                  Diácono
                </span>
              )}
              {member.role === 'coordinador' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-extrabold uppercase">
                  <Sliders className="w-3 h-3" />
                  Coordinador
                </span>
              )}
              {member.role === 'servidor' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase">
                  <User className="w-3 h-3" />
                  Servidor
                </span>
              )}

              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  member.active
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/15 text-red-600 dark:text-red-400'
                }`}
              >
                {member.active ? 'Asignado / Activo' : 'Desasignado'}
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
            {/* Diácono can change role between Coordinador and Servidor */}
            {isDiacono ? (
              <button
                type="button"
                onClick={() =>
                  onUpdateMember({
                    ...member,
                    role:
                      member.role === 'coordinador'
                        ? 'servidor'
                        : 'coordinador',
                  })
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 text-[11px] font-bold cursor-pointer transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {member.role === 'coordinador'
                  ? 'Pasar a Servidor'
                  : 'Asignar Coordinador'}
              </button>
            ) : (
              <span className="text-[11px] text-slate-400">
                Gestión de Servidor
              </span>
            )}

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
                onClick={() => {
                  if (
                    confirm(
                      `¿Estás seguro de dar de baja a ${member.name} del departamento?`
                    )
                  ) {
                    onDeleteMember(member.id);
                  }
                }}
                title="Eliminar registro"
                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Directorio de Hermanos de Sonido
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isDiacono
                ? 'Como DIÁCONO puedes asignar o desasignar tanto a Coordinadores como a Servidores.'
                : 'Como COORDINADOR puedes consultar todo el directorio por categoría y asignar o desasignar únicamente a Servidores.'}
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
          {showAddForm
            ? 'Cerrar Formulario'
            : isDiacono
            ? 'Asignar Nuevo Coordinador / Servidor'
            : 'Asignar Nuevo Servidor'}
        </button>
      </div>

      {/* Add New Member Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateMember}
          className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-lg space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {isDiacono
              ? 'Registrar y Asignar Nuevo Hermano (Coordinador o Servidor)'
              : 'Registrar y Asignar Nuevo Servidor'}
          </h3>

          {formError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                placeholder="hermano@sonido.com"
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
                Categoría / Rol
              </label>
              {isDiacono ? (
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as 'servidor' | 'coordinador')
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                >
                  <option value="servidor">Servidor</option>
                  <option value="coordinador">Coordinador</option>
                </select>
              ) : (
                <input
                  type="text"
                  disabled
                  value="Servidor (Asignado por Coordinador)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700 text-xs text-slate-500"
                />
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Guardar y Asignar
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

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
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

      {/* Category 1: COORDINADORES */}
      {(categoryFilter === 'todos' || categoryFilter === 'coordinadores') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Categoría: Coordinadores ({coordinadoresList.length})
            </h3>
            {!isDiacono && (
              <span className="text-[11px] text-slate-400">
                Solo el Diácono puede asignar o desasignar Coordinadores
              </span>
            )}
          </div>

          {coordinadoresList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No se encontraron coordinadores con ese nombre.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {coordinadoresList.map(renderMemberCard)}
            </div>
          )}
        </div>
      )}

      {/* Category 2: SERVIDORES */}
      {(categoryFilter === 'todos' || categoryFilter === 'servidores') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              Categoría: Servidores ({servidoresList.length})
            </h3>
            <span className="text-[11px] text-slate-400">
              {isDiacono
                ? 'Puedes ascenderlos a Coordinador o asignar/desasignar'
                : 'Puedes asignar o desasignar Servidores y actualizar su foto'}
            </span>
          </div>

          {servidoresList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs text-slate-500">
              No se encontraron servidores con ese nombre.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {servidoresList.map(renderMemberCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
