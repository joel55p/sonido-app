import React, { useState, useEffect } from 'react';
import {
  UserMember,
  PrivilegeSchedule,
  Announcement,
  ServiceAttendance,
} from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_SCHEDULE,
  INITIAL_ANNOUNCEMENTS,
} from './data/initialData';
import {
  pushStateToCloud,
  pullStateFromCloud,
  getSavedSupabaseConfig,
} from './utils/cloudSync';
import { AuthScreen } from './components/AuthScreen';
import { InicioView } from './components/InicioView';
import { CuadroPrivilegiosView } from './components/CuadroPrivilegiosView';
import { ServiciosAttendanceView } from './components/ServiciosAttendanceView';
import { InformacionView } from './components/InformacionView';
import { HermanosView } from './components/HermanosView';
import { SettingsView } from './components/SettingsView';
import {
  Home,
  Table,
  ClipboardCheck,
  Megaphone,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const STORAGE_KEYS = {
  MEMBERS: 'sonido_ebenezer_members_v3',
  SCHEDULES: 'sonido_ebenezer_schedules_v3',
  ACTIVE_SCHED_ID: 'sonido_ebenezer_active_sched_v3',
  ANNOUNCEMENTS: 'sonido_ebenezer_announcements_v3',
  CURRENT_USER_ID: 'sonido_ebenezer_current_user_v3',
  DARK_MODE: 'sonido_ebenezer_dark_mode_v3',
};

// Ensures the core example accounts always keep their intended role
// even if someone registered with that email earlier.
function enforceExampleRoles(list: UserMember[]): UserMember[] {
  const fixedList = list.map((m) => {
    const mail = m.email.trim().toLowerCase();
    if (mail === 'diacono@sonido.com') {
      return { ...m, role: 'diacono' as const };
    }
    if (
      mail === 'coordinador@sonido.com' ||
      mail === 'coordinador2@sonido.com' ||
      mail === 'coordninos@sonido.com'
    ) {
      return { ...m, role: 'coordinador' as const };
    }
    return m;
  });

  // Also ensure none of INITIAL_MEMBERS are missing
  INITIAL_MEMBERS.forEach((seed) => {
    const exists = fixedList.some(
      (m) => m.email.toLowerCase() === seed.email.toLowerCase()
    );
    if (!exists) {
      fixedList.push(seed);
    }
  });

  return fixedList;
}

type NavTab =
  | 'inicio'
  | 'cuadro'
  | 'servicios'
  | 'hermanos'
  | 'informacion'
  | 'settings';

export function App() {
  // 1. Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, String(darkMode));
  }, [darkMode]);

  // 2. Members State (Example users with guaranteed roles)
  const [members, setMembers] = useState<UserMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (saved) {
        return enforceExampleRoles(JSON.parse(saved));
      }
    } catch {
      // fallback
    }
    return enforceExampleRoles(INITIAL_MEMBERS);
  });

  // 3. Weekly Privilege Schedules State
  const [schedules, setSchedules] = useState<PrivilegeSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [INITIAL_SCHEDULE];
  });

  const [activeScheduleId, setActiveScheduleId] = useState<string>(() => {
    return (
      localStorage.getItem(STORAGE_KEYS.ACTIVE_SCHED_ID) || INITIAL_SCHEDULE.id
    );
  });

  // 4. Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ANNOUNCEMENTS;
  });

  // 5. Logged-in User State (default to m-coordinador if previously logged in as Coordinador Ejemplo)
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    const savedV3 = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (savedV3) return savedV3;
    // Check if user was already logged in under v2
    const savedV2 = localStorage.getItem('sonido_ebenezer_current_user_v2');
    if (savedV2) {
      try {
        const rawV2Members = localStorage.getItem('sonido_ebenezer_members_v2');
        if (rawV2Members) {
          const parsed: UserMember[] = JSON.parse(rawV2Members);
          const prevUser = parsed.find((u) => u.id === savedV2);
          if (prevUser) {
            const matchedSeed = INITIAL_MEMBERS.find(
              (s) => s.email.toLowerCase() === prevUser.email.toLowerCase()
            );
            if (matchedSeed) return matchedSeed.id;
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('inicio');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    INITIAL_SCHEDULE.services[0].id
  );
  const [servicesSubmenuOpen, setServicesSubmenuOpen] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // Persist to LocalStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SCHED_ID, activeScheduleId);
  }, [activeScheduleId]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.ANNOUNCEMENTS,
      JSON.stringify(announcements)
    );
  }, [announcements]);

  useEffect(() => {
    if (currentUserId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }, [currentUserId]);

  // Auto-pull from Supabase on startup if configured
  useEffect(() => {
    const cfg = getSavedSupabaseConfig();
    if (cfg.enabled && cfg.url && cfg.anonKey) {
      pullStateFromCloud().then((res) => {
        if (res.ok && res.data) {
          setMembers(enforceExampleRoles(res.data.members));
          setSchedules(res.data.schedules);
          setActiveScheduleId(res.data.activeScheduleId);
          setAnnouncements(res.data.announcements);
        }
      });
    }
  }, []);

  const currentUser = React.useMemo(() => {
    if (!currentUserId) return null;
    return members.find((m) => m.id === currentUserId) || null;
  }, [currentUserId, members]);

  const activeSchedule = React.useMemo(() => {
    return (
      schedules.find((s) => s.id === activeScheduleId) ||
      schedules[0] ||
      INITIAL_SCHEDULE
    );
  }, [schedules, activeScheduleId]);

  // Cloud Sync helper
  const triggerAutoCloudPush = (
    nextMembers = members,
    nextSchedules = schedules,
    nextActiveId = activeScheduleId,
    nextAnnouncements = announcements
  ) => {
    const cfg = getSavedSupabaseConfig();
    if (cfg.enabled && cfg.url && cfg.anonKey) {
      pushStateToCloud({
        members: nextMembers,
        schedules: nextSchedules,
        activeScheduleId: nextActiveId,
        announcements: nextAnnouncements,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Handlers
  const handleLogin = (member: UserMember) => {
    const fixed = enforceExampleRoles(members);
    setMembers(fixed);
    const updatedTarget =
      fixed.find((m) => m.id === member.id) ||
      fixed.find((m) => m.email.toLowerCase() === member.email.toLowerCase()) ||
      member;
    setCurrentUserId(updatedTarget.id);
    setActiveTab('inicio');
  };

  const handleRegister = (newMember: UserMember) => {
    const next = enforceExampleRoles([...members, newMember]);
    setMembers(next);
    const created =
      next.find(
        (m) => m.email.toLowerCase() === newMember.email.toLowerCase()
      ) || newMember;
    setCurrentUserId(created.id);
    setActiveTab('inicio');
    triggerAutoCloudPush(next, schedules, activeScheduleId, announcements);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
  };

  const handleUpdateSchedule = (updated: PrivilegeSchedule) => {
    const next = schedules.map((s) => (s.id === updated.id ? updated : s));
    setSchedules(next);
    triggerAutoCloudPush(members, next, activeScheduleId, announcements);
  };

  const handleCreateSchedule = (newSched: PrivilegeSchedule) => {
    const next = [newSched, ...schedules];
    setSchedules(next);
    setActiveScheduleId(newSched.id);
    triggerAutoCloudPush(members, next, newSched.id, announcements);
  };

  const handleDeleteSchedule = (id: string) => {
    if (schedules.length <= 1) return;
    const next = schedules.filter((s) => s.id !== id);
    setSchedules(next);
    setActiveScheduleId(next[0].id);
    triggerAutoCloudPush(members, next, next[0].id, announcements);
  };

  const handleUpdateMemberPhoto = (memberId: string, newPhotoUrl: string) => {
    const next = members.map((m) =>
      m.id === memberId ? { ...m, photoUrl: newPhotoUrl } : m
    );
    setMembers(next);
    triggerAutoCloudPush(next, schedules, activeScheduleId, announcements);
  };

  const handleSaveServiceAttendance = (
    serviceId: string,
    att: ServiceAttendance
  ) => {
    const updatedSched: PrivilegeSchedule = {
      ...activeSchedule,
      attendance: {
        ...activeSchedule.attendance,
        [serviceId]: att,
      },
    };
    handleUpdateSchedule(updatedSched);
  };

  const handleUpdateMember = (updated: UserMember) => {
    const next = members.map((m) => (m.id === updated.id ? updated : m));
    setMembers(next);
    triggerAutoCloudPush(next, schedules, activeScheduleId, announcements);
  };

  const handleAddMember = (newMember: UserMember) => {
    const next = [...members, newMember];
    setMembers(next);
    triggerAutoCloudPush(next, schedules, activeScheduleId, announcements);
  };

  const handleDeleteMember = (id: string) => {
    const next = members.filter((m) => m.id !== id);
    setMembers(next);
    triggerAutoCloudPush(next, schedules, activeScheduleId, announcements);
  };

  const handleOpenServiceDetail = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setActiveTab('servicios');
    setMobileSidebarOpen(false);
  };

  const handleResetDemoData = () => {
    setMembers(INITIAL_MEMBERS);
    setSchedules([INITIAL_SCHEDULE]);
    setActiveScheduleId(INITIAL_SCHEDULE.id);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
  };

  if (!currentUser) {
    return (
      <AuthScreen
        members={members}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  }

  const canSeeHermanosModule =
    currentUser.role === 'coordinador' || currentUser.role === 'diacono';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ================= SIDEBAR (PC & MOBILE DRAWER) ================= */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-950 text-white border-r border-slate-800 flex flex-col transition-transform duration-200 ${
          mobileSidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand with Official Logo */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-black border border-blue-500/40 p-1 flex items-center justify-center shrink-0">
              <img
                src="/logo-sonido.png"
                alt="Sonido Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 block">
                Ministerios Ebenezer
              </span>
              <h1 className="text-sm font-black tracking-wide text-white">
                SONIDO • AUDIO
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logged-in User Summary Card in Sidebar */}
        <div className="p-3.5 m-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <img
            src={currentUser.photoUrl}
            alt={currentUser.name}
            className="w-11 h-11 rounded-xl object-cover border border-blue-500/50 bg-slate-950 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {currentUser.email}
            </div>
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                currentUser.role === 'diacono'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : currentUser.role === 'coordinador'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {/* 1. Inicio */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('inicio');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'inicio'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Inicio</span>
          </button>

          {/* 2. Cuadro de Privilegio */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cuadro');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'cuadro'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <Table className="w-4 h-4 shrink-0" />
              <span>Cuadro de Privilegio</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 text-[10px]">
              PDF
            </span>
          </button>

          {/* 3. Servicios (Expandable list of all services by name) */}
          <div className="pt-1">
            <div
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'servicios'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('servicios');
                  setServicesSubmenuOpen(true);
                }}
                className="flex items-center gap-3 flex-1 text-left cursor-pointer"
              >
                <ClipboardCheck className="w-4 h-4 shrink-0" />
                <span>
                  {currentUser.role === 'servidor'
                    ? 'Servicios de la Semana'
                    : 'Servicios y Asistencia'}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setServicesSubmenuOpen(!servicesSubmenuOpen)}
                className="p-0.5 rounded hover:bg-white/10 cursor-pointer"
              >
                {servicesSubmenuOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Sub-items for each service in the week by name */}
            {servicesSubmenuOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-slate-800 space-y-0.5 max-h-64 overflow-y-auto">
                {activeSchedule.services.map((srv) => {
                  const isCurrentService =
                    activeTab === 'servicios' && selectedServiceId === srv.id;
                  const hasAttendance = Boolean(
                    activeSchedule.attendance[srv.id]
                  );

                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => handleOpenServiceDetail(srv.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] text-left transition-colors cursor-pointer ${
                        isCurrentService
                          ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900/70'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <span className="text-[10px] font-bold text-slate-500 mr-1">
                          {srv.dayGroup.slice(0, 3)}:
                        </span>
                        <span>{srv.name}</span>
                      </div>
                      {hasAttendance && (
                        <span
                          title="Asistencia registrada"
                          className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Hermanos (Visible for Coordinador & Diácono) */}
          {canSeeHermanosModule && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('hermanos');
                setMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'hermanos'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                  : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3">
                <Users className="w-4 h-4 shrink-0" />
                <span>Hermanos</span>
              </span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-[10px]">
                {members.length}
              </span>
            </button>
          )}

          {/* 5. Información */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('informacion');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'informacion'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-3">
              <Megaphone className="w-4 h-4 shrink-0" />
              <span>Información</span>
            </span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              {announcements.length}
            </span>
          </button>

          {/* 6. Settings y Mi Perfil */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('settings');
              setMobileSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-300 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings y Mi Perfil</span>
          </button>
        </nav>

        {/* Bottom Sidebar Controls: Dark Mode & Logout */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {darkMode ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
            </span>
            <span className="text-[10px] text-blue-400 font-bold">Cambiar</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ================= MAIN CONTENT AREA ================= */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {activeTab === 'inicio' && 'Inicio • Departamento de Sonido'}
                {activeTab === 'cuadro' &&
                  'Cuadro de Privilegios Semanal (Lunes a Domingo)'}
                {activeTab === 'servicios' &&
                  'Control de Servicios y Asistencia de Hermanos'}
                {activeTab === 'hermanos' &&
                  'Hermanos Registrados • Coordinadores y Servidores'}
                {activeTab === 'informacion' &&
                  'Muro de Información y Comunicados'}
                {activeTab === 'settings' && 'Settings y Mi Perfil'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Semana activa: {activeSchedule.dateFrom} al{' '}
                {activeSchedule.dateTo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200">
              {currentUser.name} •{' '}
              <span className="uppercase text-blue-600 dark:text-blue-400">
                {currentUser.role}
              </span>
            </span>

            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Cambiar Modo Oscuro / Claro"
            >
              {darkMode ? (
                <Moon className="w-4 h-4 text-blue-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1700px] w-full mx-auto">
          {activeTab === 'inicio' && (
            <InicioView
              currentUser={currentUser}
              activeSchedule={activeSchedule}
              members={members}
              announcements={announcements}
              onNavigateToTab={setActiveTab}
              onOpenServiceDetail={handleOpenServiceDetail}
            />
          )}

          {activeTab === 'cuadro' && (
            <CuadroPrivilegiosView
              currentUser={currentUser}
              schedules={schedules}
              activeSchedule={activeSchedule}
              members={members}
              onSelectSchedule={setActiveScheduleId}
              onUpdateSchedule={handleUpdateSchedule}
              onCreateSchedule={handleCreateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onUpdateMemberPhoto={handleUpdateMemberPhoto}
              onOpenServiceDetail={handleOpenServiceDetail}
            />
          )}

          {activeTab === 'servicios' && (
            <ServiciosAttendanceView
              currentUser={currentUser}
              activeSchedule={activeSchedule}
              selectedServiceId={selectedServiceId}
              members={members}
              onSelectService={setSelectedServiceId}
              onSaveServiceAttendance={handleSaveServiceAttendance}
            />
          )}

          {activeTab === 'hermanos' && canSeeHermanosModule && (
            <HermanosView
              currentUser={currentUser}
              members={members}
              onUpdateMember={handleUpdateMember}
              onAddMember={handleAddMember}
              onDeleteMember={handleDeleteMember}
            />
          )}

          {activeTab === 'informacion' && (
            <InformacionView
              currentUser={currentUser}
              announcements={announcements}
              onAddAnnouncement={(ann) => {
                const next = [ann, ...announcements];
                setAnnouncements(next);
                triggerAutoCloudPush(
                  members,
                  schedules,
                  activeScheduleId,
                  next
                );
              }}
              onDeleteAnnouncement={(id) => {
                const next = announcements.filter((a) => a.id !== id);
                setAnnouncements(next);
                triggerAutoCloudPush(
                  members,
                  schedules,
                  activeScheduleId,
                  next
                );
              }}
              onTogglePin={(id) => {
                const next = announcements.map((a) =>
                  a.id === id ? { ...a, pinned: !a.pinned } : a
                );
                setAnnouncements(next);
                triggerAutoCloudPush(
                  members,
                  schedules,
                  activeScheduleId,
                  next
                );
              }}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              onUpdateMember={handleUpdateMember}
              onSyncPushCloud={() =>
                pushStateToCloud({
                  members,
                  schedules,
                  activeScheduleId,
                  announcements,
                  updatedAt: new Date().toISOString(),
                })
              }
              onSyncPullCloud={async () => {
                const res = await pullStateFromCloud();
                if (res.ok && res.data) {
                  setMembers(enforceExampleRoles(res.data.members));
                  setSchedules(res.data.schedules);
                  setActiveScheduleId(res.data.activeScheduleId);
                  setAnnouncements(res.data.announcements);
                }
                return { ok: res.ok, error: res.error };
              }}
              onResetDemoData={handleResetDemoData}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
