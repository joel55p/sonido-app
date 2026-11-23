import React, { useState, useEffect } from 'react';
import {
  PrivilegeSchedule,
  ServiceColumn,
  UserMember,
  AttendanceStatus,
  ServiceAttendance,
  MemberAttendanceRecord,
  canTakeServiceAttendance,
} from '../types';
import { exportServiceAttendanceReportToPdf } from '../utils/mediaAndPdf';
import {
  CheckCircle2,
  XCircle,
  Clock,
  FileWarning,
  MessageSquare,
  Save,
  Shirt,
  Calendar,
  Users,
  ShieldAlert,
  Check,
  ChevronRight,
  FileDown,
} from 'lucide-react';

interface ServiciosAttendanceViewProps {
  currentUser: UserMember;
  activeSchedule: PrivilegeSchedule;
  selectedServiceId: string;
  members: UserMember[];
  onSelectService: (serviceId: string) => void;
  onSaveServiceAttendance: (
    serviceId: string,
    attendance: ServiceAttendance
  ) => void;
}

interface AssignedSlot {
  slotKey: string;
  roleTitle: string;
  member: UserMember;
}

export const ServiciosAttendanceView: React.FC<
  ServiciosAttendanceViewProps
> = ({
  currentUser,
  activeSchedule,
  selectedServiceId,
  members,
  onSelectService,
  onSaveServiceAttendance,
}) => {
  const canTakeAttendance = canTakeServiceAttendance(currentUser.role);

  const currentService: ServiceColumn =
    activeSchedule.services.find((s) => s.id === selectedServiceId) ||
    activeSchedule.services[0];

  const memberMap = React.useMemo(() => {
    const map = new Map<string, UserMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  // Build ordered list of assigned brothers/sisters in this service
  const assignedList: AssignedSlot[] = React.useMemo(() => {
    const list: AssignedSlot[] = [];
    const {
      coordinadorServicio,
      segundoCoordinador,
      coordinadorNinos,
      ayudas,
    } = currentService.assignments;

    if (coordinadorServicio && memberMap.get(coordinadorServicio)) {
      list.push({
        slotKey: `coord1-${coordinadorServicio}`,
        roleTitle: 'Coordinador Servicio',
        member: memberMap.get(coordinadorServicio)!,
      });
    }
    if (segundoCoordinador && memberMap.get(segundoCoordinador)) {
      list.push({
        slotKey: `coord2-${segundoCoordinador}`,
        roleTitle:
          currentService.block === 'weekend'
            ? 'Coordinador 2'
            : 'Segundo Coordinador',
        member: memberMap.get(segundoCoordinador)!,
      });
    }
    if (coordinadorNinos && memberMap.get(coordinadorNinos)) {
      list.push({
        slotKey: `ninos-${coordinadorNinos}`,
        roleTitle: 'Coordinador Niños',
        member: memberMap.get(coordinadorNinos)!,
      });
    }
    ayudas.forEach((id, idx) => {
      if (id && memberMap.get(id)) {
        list.push({
          slotKey: `ayuda-${idx + 1}-${id}`,
          roleTitle: `Ayuda #${idx + 1}`,
          member: memberMap.get(id)!,
        });
      }
    });

    return list;
  }, [currentService, memberMap]);

  // Local state for attendance records and general comment
  const [records, setRecords] = useState<
    Record<string, MemberAttendanceRecord>
  >({});
  const [generalComment, setGeneralComment] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const existing = activeSchedule.attendance[currentService.id];
    if (existing) {
      setRecords(existing.records || {});
      setGeneralComment(existing.generalComment || '');
    } else {
      setRecords({});
      setGeneralComment('');
    }
    setSavedNotice(false);
  }, [currentService.id, activeSchedule.attendance]);

  const handleStatusChange = (
    slotKey: string,
    memberId: string,
    roleTitle: string,
    status: AttendanceStatus
  ) => {
    if (!canTakeAttendance) return;
    setRecords((prev) => {
      const curr = prev[slotKey] || {
        memberId,
        roleInService: roleTitle,
        status: 'pendiente',
        comment: '',
      };
      const updated = {
        ...prev,
        [slotKey]: { ...curr, status },
      };
      onSaveServiceAttendance(currentService.id, {
        serviceId: currentService.id,
        generalComment,
        updatedBy: currentUser.name,
        updatedAt: new Date().toISOString(),
        records: updated,
      });
      return updated;
    });
  };

  const handleMemberCommentChange = (
    slotKey: string,
    memberId: string,
    roleTitle: string,
    comment: string
  ) => {
    if (!canTakeAttendance) return;
    setRecords((prev) => {
      const curr = prev[slotKey] || {
        memberId,
        roleInService: roleTitle,
        status: 'pendiente' as AttendanceStatus,
        comment: '',
      };
      return {
        ...prev,
        [slotKey]: { ...curr, comment },
      };
    });
  };

  const handleExplicitSave = () => {
    if (!canTakeAttendance) return;
    onSaveServiceAttendance(currentService.id, {
      serviceId: currentService.id,
      generalComment,
      updatedBy: currentUser.name,
      updatedAt: new Date().toISOString(),
      records,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExportServicePdf = () => {
    // First ensure latest state is saved if Coordinator/Diácono
    const latestAttendance: ServiceAttendance = {
      serviceId: currentService.id,
      generalComment,
      updatedBy:
        activeSchedule.attendance[currentService.id]?.updatedBy ||
        currentUser.name,
      updatedAt: new Date().toISOString(),
      records,
    };

    if (canTakeAttendance) {
      onSaveServiceAttendance(currentService.id, latestAttendance);
    }

    exportServiceAttendanceReportToPdf({
      service: currentService,
      weekRange: `${activeSchedule.dateFrom} al ${activeSchedule.dateTo}`,
      assignedSlots: assignedList,
      attendance: latestAttendance,
      exportedBy: currentUser.name,
    });
  };

  // Summary counts for this service
  const summary = React.useMemo(() => {
    let asistio = 0;
    let noAsistio = 0;
    let excusa = 0;
    let tarde = 0;
    assignedList.forEach((slot) => {
      const st = records[slot.slotKey]?.status;
      if (st === 'asistio') asistio++;
      if (st === 'no_asistio') noAsistio++;
      if (st === 'excusa') excusa++;
      if (st === 'tarde') tarde++;
    });
    return { asistio, noAsistio, excusa, tarde };
  }, [assignedList, records]);

  return (
    <div className="space-y-6">
      {/* Horizontal Quick Selector of all Services of the Week */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Servicios de la Semana ({activeSchedule.dateFrom} al{' '}
              {activeSchedule.dateTo})
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Selecciona un servicio
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {activeSchedule.services.map((srv) => {
            const isSelected = srv.id === currentService.id;
            const hasSavedAttendance = Boolean(
              activeSchedule.attendance[srv.id]
            );
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => onSelectService(srv.id)}
                className={`px-3.5 py-2 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25'
                    : 'bg-slate-50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      isSelected
                        ? 'text-blue-100'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {srv.dayGroup} • {srv.time}
                  </span>
                  {hasSavedAttendance && (
                    <span
                      title="Asistencia registrada"
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                      }`}
                    />
                  )}
                </div>
                <div className="text-xs font-bold mt-0.5 whitespace-nowrap">
                  {srv.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Service Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold">
            <span>{currentService.dayGroup}</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>{currentService.time}</span>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight">
            {currentService.name}
          </h2>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-600/90 text-white text-xs font-bold shadow">
              <Shirt className="w-4 h-4" />
              Uniforme: {currentService.uniform}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 text-slate-200 text-xs font-semibold border border-slate-700">
              <Users className="w-4 h-4 text-blue-400" />
              {assignedList.length} hermanos asignados
            </div>

            {canTakeAttendance && (
              <button
                type="button"
                onClick={handleExportServicePdf}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Exportar Reporte de este Servicio a PDF
              </button>
            )}
          </div>
        </div>

        {/* Attendance Summary counters (Visible for Coordinador & Diácono) */}
        {canTakeAttendance ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
            <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <div className="text-lg font-black text-emerald-400">
                {summary.asistio}
              </div>
              <div className="text-[11px] text-emerald-200 font-semibold">
                Asistieron
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
              <div className="text-lg font-black text-amber-400">
                {summary.tarde}
              </div>
              <div className="text-[11px] text-amber-200 font-semibold">
                Llegó Tarde
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
              <div className="text-lg font-black text-blue-400">
                {summary.excusa}
              </div>
              <div className="text-[11px] text-blue-200 font-semibold">
                Con Excusa
              </div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
              <div className="text-lg font-black text-red-400">
                {summary.noAsistio}
              </div>
              <div className="text-[11px] text-red-200 font-semibold">
                No Asistió
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 max-w-xs text-xs text-slate-300">
            <strong className="text-blue-400 block mb-1">
              Vista de Servidor
            </strong>
            Aquí puedes consultar todos los hermanos que sirven en este turno y
            el uniforme correspondiente.
          </div>
        )}
      </div>

      {/* Assigned Members List & Attendance Controls */}
      {assignedList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center space-y-2">
          <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-white">
            No hay servidores asignados aún a este servicio
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {canTakeAttendance
              ? 'Puedes asignar a los hermanos para este servicio desde el apartado "Cuadro de Privilegios" activando el botón Editar Cuadro.'
              : 'Los coordinadores aún no han publicado asignaciones para este servicio.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignedList.map((slot) => {
            const rec = records[slot.slotKey] || {
              memberId: slot.member.id,
              roleInService: slot.roleTitle,
              status: 'pendiente' as AttendanceStatus,
              comment: '',
            };
            const isMe = slot.member.id === currentUser.id;

            return (
              <div
                key={slot.slotKey}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-sm transition-all ${
                  isMe
                    ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Member Info with Photo */}
                  <div className="flex items-center gap-3.5">
                    <img
                      src={slot.member.photoUrl}
                      alt={slot.member.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-700 bg-slate-900 shrink-0"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[11px] font-bold">
                          {slot.roleTitle}
                        </span>
                        {isMe && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                            Tu Turno
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {slot.member.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Tel: {slot.member.phone}
                      </p>
                    </div>
                  </div>

                  {/* Interactive Attendance Labels (Only for Coordinador / Diácono) */}
                  {canTakeAttendance && (
                    <div className="flex flex-col sm:flex-row lg:items-center gap-3 flex-1 lg:max-w-2xl justify-end">
                      {/* Status label buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              slot.slotKey,
                              slot.member.id,
                              slot.roleTitle,
                              'asistio'
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rec.status === 'asistio'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Sí Asistió
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              slot.slotKey,
                              slot.member.id,
                              slot.roleTitle,
                              'no_asistio'
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rec.status === 'no_asistio'
                              ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-600/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-red-400'
                          }`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          No Asistió
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              slot.slotKey,
                              slot.member.id,
                              slot.roleTitle,
                              'excusa'
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rec.status === 'excusa'
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
                          }`}
                        >
                          <FileWarning className="w-3.5 h-3.5" />
                          Puso Excusa
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(
                              slot.slotKey,
                              slot.member.id,
                              slot.roleTitle,
                              'tarde'
                            )
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            rec.status === 'tarde'
                              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/25'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Llegó Tarde
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Specific Free-text Comment per Brother (Coordinador & Diácono) */}
                {canTakeAttendance && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={rec.comment}
                      onChange={(e) =>
                        handleMemberCommentChange(
                          slot.slotKey,
                          slot.member.id,
                          slot.roleTitle,
                          e.target.value
                        )
                      }
                      onBlur={handleExplicitSave}
                      placeholder={`Comentario específico sobre ${slot.member.name} (ej. llegó 10 min tarde, motivo de excusa, apoyo en servicio...)`}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* General Service Comment, Save & Export Service PDF Buttons (For Coordinador & Diácono) */}
      {canTakeAttendance && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                Comentario General del Servicio ({currentService.dayGroup} -{' '}
                {currentService.name})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Anota observaciones generales del servicio, estado del equipo de
                audio, incidencias o novedades.
              </p>
            </div>

            {activeSchedule.attendance[currentService.id]?.updatedBy && (
              <span className="text-[11px] text-slate-400">
                Último registro por:{' '}
                <strong className="text-slate-600 dark:text-slate-300">
                  {activeSchedule.attendance[currentService.id].updatedBy}
                </strong>
              </span>
            )}
          </div>

          <textarea
            rows={3}
            value={generalComment}
            onChange={(e) => setGeneralComment(e.target.value)}
            placeholder="Escribe aquí el comentario general de cómo estuvo el servicio, novedades técnicas o de asistencia..."
            className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              {savedNotice && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  Control de asistencia y comentarios guardados correctamente
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleExplicitSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Guardar Asistencia y Comentarios
              </button>

              <button
                type="button"
                onClick={handleExportServicePdf}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                Exportar Reporte de este Servicio a PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
