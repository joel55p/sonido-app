import React, { useState } from 'react';
import {
  Announcement,
  UserMember,
  canPostAnnouncements,
  getRoleLabel,
} from '../types';
import {
  Megaphone,
  Plus,
  Pin,
  Trash2,
  Send,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

interface InformacionViewProps {
  currentUser: UserMember;
  announcements: Announcement[];
  onAddAnnouncement: (ann: Announcement) => void;
  onDeleteAnnouncement: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export const InformacionView: React.FC<InformacionViewProps> = ({
  currentUser,
  announcements,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
}) => {
  const canPost = canPostAnnouncements(currentUser.role);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<
    'Urgente' | 'Uniforme' | 'Capacitación' | 'General'
  >('General');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: title.trim(),
      category,
      content: content.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      createdAt: new Date().toISOString(),
      pinned,
    };

    onAddAnnouncement(newAnn);
    setTitle('');
    setContent('');
    setPinned(false);
    setShowForm(false);
  };

  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getCategoryStyle = (cat: Announcement['category']) => {
    switch (cat) {
      case 'Urgente':
        return 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
      case 'Uniforme':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
      case 'Capacitación':
        return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
      default:
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Muro de Información y Comunicados
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Avisos oficiales enviados por el Diácono y los Coordinadores para
              todo el Departamento de Sonido.
            </p>
          </div>
        </div>

        {canPost && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cerrar Formulario' : 'Publicar Nuevo Comunicado'}
          </button>
        )}
      </div>

      {/* Form for Coordinadores & Diácono */}
      {canPost && showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 border-2 border-blue-500/40 rounded-2xl p-6 shadow-lg space-y-4"
        >
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Enviar Información a Todo el Departamento
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Título del Comunicado
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Reunión general de sonido este sábado / Cambio de uniforme"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as Announcement['category'])
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="General">General</option>
                <option value="Urgente">Urgente</option>
                <option value="Uniforme">Uniforme</option>
                <option value="Capacitación">Capacitación</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mensaje Completo
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escribe aquí los detalles del anuncio para todos los servidores y coordinadores..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="rounded text-blue-600"
              />
              Fijar este comunicado en la parte superior
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Publicar para Todos
            </button>
          </div>
        </form>
      )}

      {/* Announcements Feed */}
      <div className="space-y-4">
        {sortedAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all ${
              ann.pinned
                ? 'border-amber-500/50 ring-1 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex flex-wrap items-center gap-2">
                {ann.pinned && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold">
                    <Pin className="w-3 h-3" />
                    FIJADO
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${getCategoryStyle(
                    ann.category
                  )}`}
                >
                  {ann.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {ann.authorRole === 'diacono' ||
                  ann.authorRole === 'ayuda_directa' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  ) : (
                    <Sliders className="w-3.5 h-3.5 text-blue-500" />
                  )}
                  {ann.authorName} ({getRoleLabel(ann.authorRole)})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {new Date(ann.createdAt).toLocaleDateString('es-GT', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>

                {canPost && (
                  <>
                    <button
                      type="button"
                      onClick={() => onTogglePin(ann.id)}
                      title={ann.pinned ? 'Quitar fijado' : 'Fijar arriba'}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-500 hover:text-amber-500 cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    {(currentUser.role === 'diacono' ||
                      currentUser.role === 'ayuda_directa' ||
                      ann.authorId === currentUser.id) && (
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        title="Eliminar comunicado"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2">
              {ann.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {ann.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
