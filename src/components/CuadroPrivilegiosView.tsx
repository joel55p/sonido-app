import React, { useRef, useState } from 'react';
import {
  PrivilegeSchedule,
  ServiceColumn,
  UserMember,
} from '../types';
import {
  exportScheduleElementToPdf,
  processUploadedPhoto,
} from '../utils/mediaAndPdf';
import {
  Download,
  Edit3,
  Check,
  Plus,
  Copy,
  Camera,
  Sparkles,
  Printer,
  Calendar,
  UserCheck,
  X,
  Trash2,
  Search,
} from 'lucide-react';

interface CuadroPrivilegiosViewProps {
  currentUser: UserMember;
  schedules: PrivilegeSchedule[];
  activeSchedule: PrivilegeSchedule;
  members: UserMember[];
  onSelectSchedule: (id: string) => void;
  onUpdateSchedule: (updated: PrivilegeSchedule) => void;
  onCreateSchedule: (newSched: PrivilegeSchedule) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateMemberPhoto: (memberId: string, newPhotoUrl: string) => void;
  onOpenServiceDetail: (serviceId: string) => void;
}

interface EditingCellTarget {
  serviceId: string;
  serviceName: string;
  dayGroup: string;
  slotType:
    | 'coordinadorServicio'
    | 'segundoCoordinador'
    | 'coordinadorNinos'
    | 'ayuda';
  ayudaIndex?: number;
  label: string;
  currentMemberId: string | null;
}

export const CuadroPrivilegiosView: React.FC<CuadroPrivilegiosViewProps> = ({
  currentUser,
  schedules,
  activeSchedule,
  members,
  onSelectSchedule,
  onUpdateSchedule,
  onCreateSchedule,
  onDeleteSchedule,
  onUpdateMemberPhoto,
  onOpenServiceDetail,
}) => {
  const canEdit =
    currentUser.role === 'diacono' || currentUser.role === 'coordinador';
  const isDiacono = currentUser.role === 'diacono';

  const [isEditMode, setIsEditMode] = useState(false);
  const [highlightMyTurns, setHighlightMyTurns] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCellTarget | null>(
    null
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [showNewWeekModal, setShowNewWeekModal] = useState(false);
  const [newDateFrom, setNewDateFrom] = useState('lunes 30/noviembre/2026');
  const [newDateTo, setNewDateTo] = useState('domingo 06/diciembre/2026');
  const [duplicateCurrent, setDuplicateCurrent] = useState(true);

  const printableRef = useRef<HTMLDivElement>(null);

  const memberMap = React.useMemo(() => {
    const map = new Map<string, UserMember>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const weekdayServices = activeSchedule.services.filter(
    (s) => s.block === 'weekday'
  );
  const weekendServices = activeSchedule.services.filter(
    (s) => s.block === 'weekend'
  );

  // Group headers for top row (e.g. Lunes colspan 1, Martes colspan 3...)
  const getDayGroups = (servicesList: ServiceColumn[]) => {
    const groups: { day: string; count: number }[] = [];
    servicesList.forEach((srv) => {
      const last = groups[groups.length - 1];
      if (last && last.day === srv.dayGroup) {
        last.count += 1;
      } else {
        groups.push({ day: srv.dayGroup, count: 1 });
      }
    });
    return groups;
  };

  const handleExportPdf = async () => {
    if (!printableRef.current) return;
    setIsExporting(true);
    try {
      const safeName = `Cuadro_Privilegios_Sonido_${activeSchedule.dateFrom.replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )}.pdf`;
      await exportScheduleElementToPdf(printableRef.current, safeName);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      window.print();
    } finally {
      setIsExporting(false);
    }
  };

  const handleAssignMember = (memberId: string | null) => {
    if (!editingCell) return;
    const updatedServices = activeSchedule.services.map((srv) => {
      if (srv.id !== editingCell.serviceId) return srv;
      const nextAssign = {
        ...srv.assignments,
        ayudas: [...srv.assignments.ayudas],
      };
      if (editingCell.slotType === 'coordinadorServicio') {
        nextAssign.coordinadorServicio = memberId;
      } else if (editingCell.slotType === 'segundoCoordinador') {
        nextAssign.segundoCoordinador = memberId;
      } else if (editingCell.slotType === 'coordinadorNinos') {
        nextAssign.coordinadorNinos = memberId;
      } else if (
        editingCell.slotType === 'ayuda' &&
        typeof editingCell.ayudaIndex === 'number'
      ) {
        nextAssign.ayudas[editingCell.ayudaIndex] = memberId;
      }
      return { ...srv, assignments: nextAssign };
    });

    onUpdateSchedule({
      ...activeSchedule,
      services: updatedServices,
    });
    setEditingCell((prev) =>
      prev ? { ...prev, currentMemberId: memberId } : null
    );
  };

  const handleQuickPhotoUpload = async (
    memberId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await processUploadedPhoto(file);
      onUpdateMemberPhoto(memberId, dataUrl);
    } catch {
      alert('No se pudo procesar la imagen.');
    }
  };

  const handleServiceFieldChange = (
    serviceId: string,
    field: 'name' | 'time' | 'uniform',
    value: string
  ) => {
    const updatedServices = activeSchedule.services.map((s) =>
      s.id === serviceId ? { ...s, [field]: value } : s
    );
    onUpdateSchedule({ ...activeSchedule, services: updatedServices });
  };

  const handleCreateNewSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const clonedServices: ServiceColumn[] = activeSchedule.services.map((s) => ({
      ...s,
      assignments: duplicateCurrent
        ? {
            coordinadorServicio: s.assignments.coordinadorServicio,
            segundoCoordinador: s.assignments.segundoCoordinador,
            coordinadorNinos: s.assignments.coordinadorNinos,
            ayudas: [...s.assignments.ayudas],
          }
        : {
            coordinadorServicio: null,
            segundoCoordinador: null,
            coordinadorNinos: null,
            ayudas: [null, null, null, null, null, null],
          },
    }));

    const newSched: PrivilegeSchedule = {
      id: `sched-${Date.now()}`,
      title: 'Cuadro de Privilegios',
      dateFrom: newDateFrom.trim(),
      dateTo: newDateTo.trim(),
      verseText: activeSchedule.verseText,
      verseRef: activeSchedule.verseRef,
      yearTheme: activeSchedule.yearTheme,
      createdAt: new Date().toISOString(),
      isActive: true,
      services: clonedServices,
      attendance: {},
    };

    onCreateSchedule(newSched);
    setShowNewWeekModal(false);
  };

  // Renders an individual member cell with Name on the left and Photo on the right, matching the PDF
  const renderMemberCell = (
    srv: ServiceColumn,
    slotType:
      | 'coordinadorServicio'
      | 'segundoCoordinador'
      | 'coordinadorNinos'
      | 'ayuda',
    label: string,
    memberId: string | null,
    ayudaIndex?: number
  ) => {
    const member = memberId ? memberMap.get(memberId) : null;
    const isCurrentUser = member && member.id === currentUser.id;
    const highlight = highlightMyTurns && isCurrentUser;

    return (
      <td
        key={`${srv.id}-${slotType}-${ayudaIndex ?? ''}`}
        onClick={() => {
          if (isEditMode && canEdit) {
            setEditingCell({
              serviceId: srv.id,
              serviceName: srv.name,
              dayGroup: srv.dayGroup,
              slotType,
              ayudaIndex,
              label,
              currentMemberId: memberId,
            });
            setMemberSearch('');
          }
        }}
        className={`border border-slate-700 p-0 h-[38px] align-middle transition-colors relative ${
          isEditMode && canEdit
            ? 'cursor-pointer hover:bg-blue-100/80 group'
            : ''
        } ${
          highlight
            ? 'bg-emerald-200 ring-2 ring-inset ring-emerald-600'
            : 'bg-white'
        }`}
      >
        {member ? (
          <div className="flex items-center justify-between w-full h-[38px] px-1.5 gap-1">
            <span className="text-[10.5px] leading-[1.15] font-bold text-slate-900 text-center flex-1 break-words">
              {member.name}
            </span>
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-[32px] h-[36px] object-cover rounded-[2px] border border-slate-300 shrink-0 bg-slate-900"
            />
          </div>
        ) : (
          <div className="w-full h-[38px] flex items-center justify-center">
            {isEditMode && canEdit && (
              <span className="text-[10px] text-blue-600 font-medium opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                <Plus className="w-3 h-3" /> Asignar
              </span>
            )}
          </div>
        )}
      </td>
    );
  };

  const renderScheduleBlock = (
    servicesList: ServiceColumn[],
    secondCoordLabel: string
  ) => {
    const dayGroups = getDayGroups(servicesList);

    return (
      <table className="w-full border-collapse table-fixed text-slate-900 bg-white">
        <colgroup>
          <col className="w-[26px]" />
          <col className="w-[95px]" />
          {servicesList.map((s) => (
            <col key={s.id} />
          ))}
        </colgroup>
        <thead>
          {/* Row 1: Day Group Headers */}
          <tr className="bg-[#1b365d] text-white text-[10.5px] font-bold">
            <th
              colSpan={2}
              className="border border-slate-600 bg-white text-slate-900 py-0.5"
            ></th>
            {dayGroups.map((g, idx) => (
              <th
                key={`${g.day}-${idx}`}
                colSpan={g.count}
                className="border border-slate-500 py-0.5 px-1 text-center tracking-wide uppercase"
              >
                {g.day}
              </th>
            ))}
          </tr>

          {/* Row 2: Service Names */}
          <tr className="bg-[#1b365d] text-white text-[10px] font-bold">
            <th
              colSpan={2}
              className="border border-slate-600 bg-white text-slate-900 py-0.5"
            ></th>
            {servicesList.map((srv) => (
              <th
                key={srv.id}
                className="border border-slate-500 py-1 px-1 text-center leading-tight"
              >
                {isEditMode && canEdit ? (
                  <input
                    type="text"
                    value={srv.name}
                    onChange={(e) =>
                      handleServiceFieldChange(srv.id, 'name', e.target.value)
                    }
                    className="w-full bg-slate-900/70 text-white text-center text-[10px] px-1 py-0.5 rounded border border-blue-400"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenServiceDetail(srv.id)}
                    title="Ver asistencia y detalle de este servicio"
                    className="hover:underline cursor-pointer"
                  >
                    {srv.name}
                  </button>
                )}
              </th>
            ))}
          </tr>

          {/* Row 3: No. | Privilegio | Service Times */}
          <tr className="bg-[#1b365d] text-white text-[10px] font-bold">
            <th className="border border-slate-500 py-0.5 px-0.5 text-center">
              No.
            </th>
            <th className="border border-slate-500 py-0.5 px-1 text-center">
              Privilegio
            </th>
            {servicesList.map((srv) => (
              <th
                key={srv.id}
                className="border border-slate-500 py-0.5 px-1 text-center font-semibold"
              >
                {isEditMode && canEdit ? (
                  <input
                    type="text"
                    value={srv.time}
                    onChange={(e) =>
                      handleServiceFieldChange(srv.id, 'time', e.target.value)
                    }
                    className="w-full bg-slate-900/70 text-white text-center text-[10px] px-1 py-0.5 rounded border border-blue-400"
                  />
                ) : (
                  srv.time
                )}
              </th>
            ))}
          </tr>

          {/* Row 4: Uniforme (Orange terracotta row matching the PDF) */}
          <tr className="bg-[#c25900] text-white text-[10px] font-bold">
            <th
              colSpan={2}
              className="border border-slate-700 py-1 px-1 text-center bg-[#c25900]"
            >
              Uniforme
            </th>
            {servicesList.map((srv) => (
              <th
                key={srv.id}
                className="border border-slate-700 py-1 px-1 text-center leading-tight font-semibold"
              >
                {isEditMode && canEdit ? (
                  <input
                    type="text"
                    value={srv.uniform}
                    onChange={(e) =>
                      handleServiceFieldChange(
                        srv.id,
                        'uniform',
                        e.target.value
                      )
                    }
                    className="w-full bg-amber-950/80 text-white text-center text-[9.5px] px-1 py-0.5 rounded border border-amber-300"
                  />
                ) : (
                  srv.uniform
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* Coordinador Servicio */}
          <tr>
            <td
              colSpan={2}
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10px] text-center px-1 py-1"
            >
              Coordinador Servicio
            </td>
            {servicesList.map((srv) =>
              renderMemberCell(
                srv,
                'coordinadorServicio',
                'Coordinador Servicio',
                srv.assignments.coordinadorServicio
              )
            )}
          </tr>

          {/* Segundo Coordinador / Coordinador 2 */}
          <tr>
            <td
              colSpan={2}
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10px] text-center px-1 py-1"
            >
              {secondCoordLabel}
            </td>
            {servicesList.map((srv) =>
              renderMemberCell(
                srv,
                'segundoCoordinador',
                secondCoordLabel,
                srv.assignments.segundoCoordinador
              )
            )}
          </tr>

          {/* Coordinador Niños */}
          <tr>
            <td
              colSpan={2}
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10px] text-center px-1 py-1"
            >
              Coordinador Niños
            </td>
            {servicesList.map((srv) =>
              renderMemberCell(
                srv,
                'coordinadorNinos',
                'Coordinador Niños',
                srv.assignments.coordinadorNinos
              )
            )}
          </tr>

          {/* Ayudas 1 to 6 */}
          {[0, 1, 2, 3, 4, 5].map((ayudaIdx) => (
            <tr key={`ayuda-row-${ayudaIdx}`}>
              <td className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10px] text-center">
                {ayudaIdx + 1}
              </td>
              {ayudaIdx === 0 && (
                <td
                  rowSpan={6}
                  className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10.5px] text-center align-middle"
                >
                  Ayudas
                </td>
              )}
              {servicesList.map((srv) =>
                renderMemberCell(
                  srv,
                  'ayuda',
                  `Ayuda #${ayudaIdx + 1}`,
                  srv.assignments.ayudas[ayudaIdx] ?? null,
                  ayudaIdx
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const filteredModalMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Top Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              Semana del Cuadro:
            </span>
          </div>

          <select
            value={activeSchedule.id}
            onChange={(e) => onSelectSchedule(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          >
            {schedules.map((s) => (
              <option key={s.id} value={s.id}>
                {s.dateFrom} al {s.dateTo}
              </option>
            ))}
          </select>

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowNewWeekModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Nuevo Cuadro Semanal
            </button>
          )}

          {isDiacono && schedules.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (
                  confirm('¿Estás seguro de eliminar este cuadro de privilegios?')
                ) {
                  onDeleteSchedule(activeSchedule.id);
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold cursor-pointer"
              title="Eliminar este cuadro"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Highlight current user's turns */}
          <button
            type="button"
            onClick={() => setHighlightMyTurns(!highlightMyTurns)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              highlightMyTurns
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            {highlightMyTurns ? 'Viendo Mis Turnos' : 'Resaltar Mis Turnos'}
          </button>

          {/* Toggle Edit Mode for Coordinador / Diácono */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-600/20'
              }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  Finalizar Edición
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  Editar Cuadro y Fotos
                </>
              )}
            </button>
          )}

          {/* Export to PDF */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Generando PDF...' : 'Exportar a PDF'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            title="Imprimir cuadro horizontal"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && canEdit && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Modo Edición Activo:</strong> Haz clic en cualquier celda
              de hermano para asignarlo, quitarlo o subir/cambiar su fotografía.
              También puedes editar las fechas, versículo, horarios y uniformes.
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
            Guardado Automático
          </span>
        </div>
      )}

      {/* Scrollable Container for the Official Cuadro de Privilegios (PC & Mobile friendly) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-5 shadow-md overflow-x-auto">
        <div
          id="cuadro-privilegios-printable"
          ref={printableRef}
          className="min-w-[1480px] bg-white text-slate-900 p-4 rounded-lg"
        >
          {/* ================= OFFICIAL PDF HEADER ================= */}
          <div className="flex items-stretch justify-between gap-4 mb-2.5 border-b-2 border-slate-800 pb-2">
            {/* Left Logo Box */}
            <div className="w-[185px] bg-black rounded-md px-3 py-2 flex items-center gap-2.5 shrink-0 border border-slate-800">
              <img
                src="/logo-sonido.png"
                alt="Sonido Logo"
                className="w-12 h-12 object-contain shrink-0"
              />
              <div className="text-white leading-tight">
                <div className="text-[9px] tracking-widest uppercase text-blue-300 font-semibold">
                  DEPARTAMENTO DE
                </div>
                <div className="text-sm font-black tracking-widest">
                  S O N I D O
                </div>
                <div className="text-[8px] text-slate-300">
                  Ministerios Ebenezer
                </div>
              </div>
            </div>

            {/* Center Titles, Dates & Bible Verse */}
            <div className="flex-1 flex flex-col justify-center text-center px-3">
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">
                Departamento de Sonido
              </h2>
              <h3 className="text-xs font-bold text-slate-800">
                {activeSchedule.title}
              </h3>

              <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-slate-900 mt-1">
                <span>Servicios</span>
                <span>del</span>
                {isEditMode && canEdit ? (
                  <input
                    type="text"
                    value={activeSchedule.dateFrom}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        dateFrom: e.target.value,
                      })
                    }
                    className="px-2 py-0.5 border border-blue-500 rounded bg-blue-50 text-center text-xs font-bold"
                  />
                ) : (
                  <span className="underline decoration-slate-400">
                    {activeSchedule.dateFrom}
                  </span>
                )}
                <span>al</span>
                {isEditMode && canEdit ? (
                  <input
                    type="text"
                    value={activeSchedule.dateTo}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        dateTo: e.target.value,
                      })
                    }
                    className="px-2 py-0.5 border border-blue-500 rounded bg-blue-50 text-center text-xs font-bold"
                  />
                ) : (
                  <span className="underline decoration-slate-400">
                    {activeSchedule.dateTo}
                  </span>
                )}
              </div>

              {isEditMode && canEdit ? (
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={activeSchedule.verseText}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        verseText: e.target.value,
                      })
                    }
                    className="flex-1 px-2 py-0.5 border border-blue-400 rounded text-[9.5px] bg-blue-50"
                  />
                  <input
                    type="text"
                    value={activeSchedule.verseRef}
                    onChange={(e) =>
                      onUpdateSchedule({
                        ...activeSchedule,
                        verseRef: e.target.value,
                      })
                    }
                    className="w-40 px-2 py-0.5 border border-blue-400 rounded text-[9.5px] font-bold bg-blue-50"
                  />
                </div>
              ) : (
                <p className="text-[9.5px] font-bold text-slate-800 max-w-3xl mx-auto mt-1 leading-snug">
                  {activeSchedule.verseText}
                  <span className="block">{activeSchedule.verseRef}</span>
                </p>
              )}
            </div>

            {/* Right Theme Box */}
            <div className="w-[155px] rounded-md bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-900 text-white p-2 flex flex-col items-center justify-center text-center shrink-0 border border-amber-600 shadow-inner">
              <span className="text-[9px] uppercase tracking-widest text-amber-200 font-semibold">
                Ministerios Ebenezer
              </span>
              {isEditMode && canEdit ? (
                <input
                  type="text"
                  value={activeSchedule.yearTheme}
                  onChange={(e) =>
                    onUpdateSchedule({
                      ...activeSchedule,
                      yearTheme: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-1 py-0.5 text-[10px] text-center bg-black/40 text-white rounded border border-amber-300"
                />
              ) : (
                <span className="text-xs font-black tracking-wide uppercase mt-0.5 text-amber-100">
                  {activeSchedule.yearTheme}
                </span>
              )}
            </div>
          </div>

          {/* ================= BLOCK 1: LUNES A VIERNES ================= */}
          <div className="mb-3">
            {renderScheduleBlock(weekdayServices, 'Segundo Coordinador')}
          </div>

          {/* ================= BLOCK 2: SÁBADO Y DOMINGO ================= */}
          <div>{renderScheduleBlock(weekendServices, 'Coordinador 2')}</div>
        </div>
      </div>

      {/* ================= MODAL FOR ASSIGNING MEMBER & PHOTO UPLOAD ================= */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-blue-400 font-bold">
                  {editingCell.dayGroup} • {editingCell.serviceName}
                </span>
                <h4 className="text-base font-bold">
                  Asignar: {editingCell.label}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currently assigned member & direct photo upload */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
              {editingCell.currentMemberId &&
              memberMap.get(editingCell.currentMemberId) ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        memberMap.get(editingCell.currentMemberId)!.photoUrl
                      }
                      alt="Avatar"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-blue-500 bg-slate-900"
                    />
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {memberMap.get(editingCell.currentMemberId)!.name}
                      </div>
                      <label className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold cursor-pointer transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        Cambiar Foto de este Hermano
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleQuickPhotoUpload(
                              editingCell.currentMemberId!,
                              e
                            )
                          }
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAssignMember(null)}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold cursor-pointer"
                  >
                    Dejar Vacío
                  </button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Ningún hermano asignado aún en este puesto. Selecciona uno de
                  la lista abajo:
                </div>
              )}
            </div>

            {/* Search bar */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar hermano por nombre o correo..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Member list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {filteredModalMembers.map((m) => {
                const isSelected = m.id === editingCell.currentMemberId;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-blue-600/15 border-blue-500'
                        : 'bg-white dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/70 hover:border-blue-400'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleAssignMember(m.id)}
                      className="flex items-center gap-3 flex-1 text-left cursor-pointer"
                    >
                      <img
                        src={m.photoUrl}
                        alt={m.name}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-300 dark:border-slate-600 bg-slate-900 shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {m.role.toUpperCase()} • {m.phone}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <label
                        title="Subir foto"
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-500 hover:text-white text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleQuickPhotoUpload(m.id, e)}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          handleAssignMember(m.id);
                          setEditingCell(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        Elegir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL FOR CREATING A NEW WEEKLY SCHEDULE ================= */}
      {showNewWeekModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewSchedule}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Crear Nuevo Cuadro de Privilegios
              </h3>
              <button
                type="button"
                onClick={() => setShowNewWeekModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Inicio (Lunes)
              </label>
              <input
                type="text"
                required
                value={newDateFrom}
                onChange={(e) => setNewDateFrom(e.target.value)}
                placeholder="Ej: lunes 30/noviembre/2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fecha Fin (Domingo)
              </label>
              <input
                type="text"
                required
                value={newDateTo}
                onChange={(e) => setNewDateTo(e.target.value)}
                placeholder="Ej: domingo 06/diciembre/2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={duplicateCurrent}
                onChange={(e) => setDuplicateCurrent(e.target.checked)}
                className="rounded text-blue-600"
              />
              Copiar asignaciones de la semana actual como base
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewWeekModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
              >
                Crear Cuadro
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
