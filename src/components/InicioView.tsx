import React from 'react';
import {
  UserMember,
  PrivilegeSchedule,
  Announcement,
} from '../types';
import {
  Calendar,
  CheckCircle2,
  Megaphone,
  Table,
  Users,
  Shirt,
  ArrowRight,
  ShieldCheck,
  Sliders,
  User,
} from 'lucide-react';

interface InicioViewProps {
  currentUser: UserMember;
  activeSchedule: PrivilegeSchedule;
  members: UserMember[];
  announcements: Announcement[];
  onNavigateToTab: (
    tab: 'inicio' | 'cuadro' | 'servicios' | 'informacion' | 'settings'
  ) => void;
  onOpenServiceDetail: (serviceId: string) => void;
}

export const InicioView: React.FC<InicioViewProps> = ({
  currentUser,
  activeSchedule,
  members,
  announcements,
  onNavigateToTab,
  onOpenServiceDetail,
}) => {
  // Find all services where the current user is assigned this week
  const myAssignedServices = React.useMemo(() => {
    const results: {
      serviceId: string;
      dayGroup: string;
      name: string;
      time: string;
      uniform: string;
      myRoleTitle: string;
    }[] = [];

    activeSchedule.services.forEach((srv) => {
      const a = srv.assignments;
      if (a.coordinadorServicio === currentUser.id) {
        results.push({
          serviceId: srv.id,
          dayGroup: srv.dayGroup,
          name: srv.name,
          time: srv.time,
          uniform: srv.uniform,
          myRoleTitle: 'Coordinador Servicio',
        });
      } else if (a.segundoCoordinador === currentUser.id) {
        results.push({
          serviceId: srv.id,
          dayGroup: srv.dayGroup,
          name: srv.name,
          time: srv.time,
          uniform: srv.uniform,
          myRoleTitle:
            srv.block === 'weekend' ? 'Coordinador 2' : 'Segundo Coordinador',
        });
      } else if (a.coordinadorNinos === currentUser.id) {
        results.push({
          serviceId: srv.id,
          dayGroup: srv.dayGroup,
          name: srv.name,
          time: srv.time,
          uniform: srv.uniform,
          myRoleTitle: 'Coordinador Niños',
        });
      } else {
        const ayudaIdx = a.ayudas.findIndex((id) => id === currentUser.id);
        if (ayudaIdx !== -1) {
          results.push({
            serviceId: srv.id,
            dayGroup: srv.dayGroup,
            name: srv.name,
            time: srv.time,
            uniform: srv.uniform,
            myRoleTitle: `Ayuda #${ayudaIdx + 1}`,
          });
        }
      }
    });

    return results;
  }, [activeSchedule, currentUser.id]);

  const roleBadge = () => {
    if (currentUser.role === 'diacono') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          ROL: DIÁCONO (Acceso Total)
        </span>
      );
    }
    if (currentUser.role === 'coordinador') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-xs font-bold">
          <Sliders className="w-4 h-4" />
          ROL: COORDINADOR (Supervisión, Cuadros y Asistencia)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
        <User className="w-4 h-4" />
        ROL: SERVIDOR DE SONIDO
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Logo */}
      <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-6 relative z-10">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-black border-2 border-blue-500/40 p-2 flex items-center justify-center shrink-0 shadow-2xl">
            <img
              src="/logo-sonido.png"
              alt="Sonido Ministerios Ebenezer"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex-1 text-center lg:text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              {roleBadge()}
              <span className="px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-xs font-semibold">
                {activeSchedule.yearTheme}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ¡Bienvenido, {currentUser.name}!
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Departamento de Sonido — Producción de Audio, Ministerios
              Ebenezer. Consulta tus privilegios de la semana del{' '}
              <strong className="text-white">{activeSchedule.dateFrom}</strong>{' '}
              al <strong className="text-white">{activeSchedule.dateTo}</strong>
              .
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={() => onNavigateToTab('cuadro')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Table className="w-4 h-4" />
                Ver Cuadro de Privilegios Completo
              </button>

              <button
                type="button"
                onClick={() => onNavigateToTab('servicios')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {currentUser.role === 'servidor'
                  ? 'Consultar Servicios por Día'
                  : 'Pasar Asistencia por Servicio'}
              </button>
            </div>
          </div>
        </div>

        {/* Verse Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-300 italic text-center lg:text-left">
          "{activeSchedule.verseText}" —{' '}
          <strong className="text-blue-400 not-italic">
            {activeSchedule.verseRef}
          </strong>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {myAssignedServices.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Mis Turnos Esta Semana
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Table className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {activeSchedule.services.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Servicios Lunes a Domingo
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {members.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Integrantes de Sonido
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {announcements.length}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Avisos e Información
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: My Assigned Services & Latest Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Turns This Week */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Mis Privilegios Asignados en la Semana
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Servicios en los que estás programado ({currentUser.name})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('cuadro')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ver cuadro completo →
            </button>
          </div>

          {myAssignedServices.length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-1">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No tienes turnos asignados con tu nombre en esta semana.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Puedes revisar el Cuadro de Privilegios completo o seleccionar
                cualquier servicio en el menú lateral.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {myAssignedServices.map((item) => (
                <div
                  key={`${item.serviceId}-${item.myRoleTitle}`}
                  onClick={() => onOpenServiceDetail(item.serviceId)}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-blue-50/60 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-bold">
                      {item.dayGroup} • {item.time}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {item.myRoleTitle}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.name}
                  </h3>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Shirt className="w-3.5 h-3.5 text-amber-600" />
                      {item.uniform}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Information / Notices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-amber-500" />
              Información Reciente
            </h2>
            <button
              type="button"
              onClick={() => onNavigateToTab('informacion')}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Ver todos →
            </button>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                onClick={() => onNavigateToTab('informacion')}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 cursor-pointer hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-1">
                  <span>{ann.category}</span>
                  <span>Por {ann.authorName}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {ann.title}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {ann.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
