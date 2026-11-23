import React, { useRef, useState, useEffect } from 'react';
import {
  PrivilegeSchedule,
  ServiceColumn,
  UserMember,
  canEditSchedules,
  getRoleLabel,
} from '../types';
import {
  exportScheduleElementToPdf,
  processUploadedPhoto,
} from '../utils/mediaAndPdf';
import {
  generateAvailableWeeks,
  buildWeekFromDate,
  WeekOption,
} from '../utils/weekDates';
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
  Maximize2,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Shirt,
  CalendarCheck,
  AlertCircle,
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

const DAYS_FILTER = [
  'Todos',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

const BASE_TABLE_WIDTH = 1280;

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
  const canEdit = canEditSchedules(currentUser.role);
  const isDiacono = canEditSchedules(currentUser.role);

  const [isEditMode, setIsEditMode] = useState(false);
  const [highlightMyTurns, setHighlightMyTurns] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingCell, setEditingCell] = useState<EditingCellTarget | null>(
    null
  );
  const [memberSearch, setMemberSearch] = useState('');
  const [showNewWeekModal, setShowNewWeekModal] = useState(false);
  const [duplicateCurrent, setDuplicateCurrent] = useState(true);

  // Automatic real calendar weeks (Lunes a Domingo)
  const availableWeeks = React.useMemo(
    () => generateAvailableWeeks(1, 10),
    []
  );

  // Check if a week already exists in schedules
  const isWeekAlreadyCreated = React.useCallback(
    (week: WeekOption) => {
      return schedules.some(
        (s) =>
          s.dateFrom.toLowerCase() === week.dateFrom.toLowerCase() &&
          s.dateTo.toLowerCase() === week.dateTo.toLowerCase()
      );
    },
    [schedules]
  );

  const [selectedWeekOption, setSelectedWeekOption] =
    useState<WeekOption>(() => {
      const firstFree = availableWeeks.find(
        (w) =>
          !schedules.some(
            (s) => s.dateFrom.toLowerCase() === w.dateFrom.toLowerCase()
          )
      );
      return firstFree || availableWeeks[1] || availableWeeks[0];
    });

  const [weekModalError, setWeekModalError] = useState('');

  // When opening the New Cuadro modal, pre-select the first available (not yet created) week
  const handleOpenNewWeekModal = () => {
    setWeekModalError('');
    const firstFree = availableWeeks.find((w) => !isWeekAlreadyCreated(w));
    if (firstFree) {
      setSelectedWeekOption(firstFree);
    }
    setShowNewWeekModal(true);
  };

  // Mobile-specific view mode ('panorama' vs 'tarjetas')
  const [mobileViewMode, setMobileViewMode] = useState<'panorama' | 'tarjetas'>(
    'panorama'
  );
  const [mobileDayFilter, setMobileDayFilter] = useState<string>('Todos');

  // Responsive auto-fit scale for BOTH PC (laptops/monitors narrower than 1280px) and Mobile
  const [fitScale, setFitScale] = useState<number>(1);
  const [customZoom, setCustomZoom] = useState<number | null>(null);
  const [tableNaturalHeight, setTableNaturalHeight] = useState<number>(880);
  const [containerAvailWidth, setContainerAvailWidth] = useState<number>(1280);

  const printableRef = useRef<HTMLDivElement>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMeasurements = () => {
      if (viewportContainerRef.current) {
        const style = window.getComputedStyle(viewportContainerRef.current);
        const padLeft = parseFloat(style.paddingLeft) || 0;
        const padRight = parseFloat(style.paddingRight) || 0;
        const innerW =
          viewportContainerRef.current.clientWidth - padLeft - padRight;

        if (innerW > 100) {
          setContainerAvailWidth(innerW);
          if (innerW < BASE_TABLE_WIDTH) {
            const calculated = Math.max(0.22, innerW / BASE_TABLE_WIDTH);
            setFitScale(calculated);
          } else {
            setFitScale(1);
          }
        }
      }
      if (printableRef.current) {
        setTableNaturalHeight(printableRef.current.offsetHeight || 880);
      }
    };

    updateMeasurements();
    const timer = setTimeout(updateMeasurements, 120);
    window.addEventListener('resize', updateMeasurements);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateMeasurements);
    };
  }, [activeSchedule, mobileViewMode, isEditMode]);

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

  // Count how many assignments exist in the current schedule (for the "Copiar asignaciones" info)
  const currentAssignedCount = React.useMemo(() => {
    let count = 0;
    activeSchedule.services.forEach((s) => {
      if (s.assignments.coordinadorServicio) count++;
      if (s.assignments.segundoCoordinador) count++;
      if (s.assignments.coordinadorNinos) count++;
      s.assignments.ayudas.forEach((a) => {
        if (a) count++;
      });
    });
    return count;
  }, [activeSchedule]);

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
      await new Promise((r) => setTimeout(r, 80));
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
    setWeekModalError('');

    if (isWeekAlreadyCreated(selectedWeekOption)) {
      setWeekModalError(
        `Ya existe un cuadro creado para la semana del ${selectedWeekOption.dateFrom} al ${selectedWeekOption.dateTo}. Selecciona otra semana disponible.`
      );
      return;
    }

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
      id: `sched-${selectedWeekOption.key}-${Date.now()}`,
      title: 'Cuadro de Privilegios',
      dateFrom: selectedWeekOption.dateFrom,
      dateTo: selectedWeekOption.dateTo,
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

  const openCellEditor = (
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
        onClick={() =>
          openCellEditor(srv, slotType, label, memberId, ayudaIndex)
        }
        className={`border border-slate-700 p-0 h-[36px] align-middle transition-colors relative ${
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
          <div className="flex items-center justify-between w-full h-[36px] px-1 gap-1">
            <span className="text-[10px] leading-[1.1] font-bold text-slate-900 text-center flex-1 break-words">
              {member.name}
            </span>
            <img
              src={member.photoUrl}
              alt={member.name}
              className="w-[30px] h-[34px] object-cover rounded-[2px] border border-slate-300 shrink-0 bg-slate-900"
            />
          </div>
        ) : (
          <div className="w-full h-[36px] flex items-center justify-center">
            {isEditMode && canEdit && (
              <span className="text-[9.5px] text-blue-600 font-medium opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
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
          <col className="w-[24px]" />
          <col className="w-[88px]" />
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
          <tr className="bg-[#c25900] text-white text-[9.5px] font-bold">
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
                    className="w-full bg-amber-950/80 text-white text-center text-[9px] px-1 py-0.5 rounded border border-amber-300"
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
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[9.5px] text-center px-1 py-1"
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
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[9.5px] text-center px-1 py-1"
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
              className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[9.5px] text-center px-1 py-1"
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
              <td className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[9.5px] text-center">
                {ayudaIdx + 1}
              </td>
              {ayudaIdx === 0 && (
                <td
                  rowSpan={6}
                  className="border border-slate-700 bg-[#d9e1f2] text-slate-900 font-bold text-[10px] text-center align-middle"
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

  // Helper to render a slot row inside the Mobile Card View
  const renderMobileCardSlot = (
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
    const isMe = member && member.id === currentUser.id;
    const highlight = highlightMyTurns && isMe;

    if (!member && !(isEditMode && canEdit)) return null;

    return (
      <div
        key={`${srv.id}-mob-${slotType}-${ayudaIndex ?? ''}`}
        onClick={() =>
          openCellEditor(srv, slotType, label, memberId, ayudaIndex)
        }
        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
          isEditMode && canEdit
            ? 'cursor-pointer hover:border-blue-500 active:scale-[0.99]'
            : ''
        } ${
          highlight
            ? 'bg-emerald-500/20 border-emerald-500'
            : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/80'
        }`}
      >
        <div className="min-w-0 pr-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
            {label}
          </span>
          {member ? (
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate block mt-0.5">
              {member.name}
            </span>
          ) : (
            <span className="text-xs text-blue-500 font-semibold flex items-center gap-1 mt-0.5">
              <Plus className="w-3.5 h-3.5" /> Tocar para asignar hermano
            </span>
          )}
        </div>

        {member && (
          <img
            src={member.photoUrl}
            alt={member.name}
            className="w-10 h-10 rounded-lg object-cover border border-slate-300 dark:border-slate-600 bg-slate-900 shrink-0"
          />
        )}
      </div>
    );
  };

  const filteredModalMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const mobileFilteredServices = activeSchedule.services.filter(
    (s) => mobileDayFilter === 'Todos' || s.dayGroup === mobileDayFilter
  );

  const effectiveScale = isExporting ? 1 : customZoom ?? fitScale;
  const isScaled = effectiveScale < 0.995;
  const renderTableWidth =
    containerAvailWidth >= BASE_TABLE_WIDTH && !isExporting
      ? containerAvailWidth
      : BASE_TABLE_WIDTH;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Top Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white">
              Semana:
            </span>
          </div>

          <select
            value={activeSchedule.id}
            onChange={(e) => onSelectSchedule(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
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
              onClick={handleOpenNewWeekModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Nuevo Cuadro
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

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          {/* Highlight current user's turns */}
          <button
            type="button"
            onClick={() => setHighlightMyTurns(!highlightMyTurns)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              highlightMyTurns
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              {highlightMyTurns ? 'Viendo Mis Turnos' : 'Mis Turnos'}
            </span>
          </button>

          {/* Toggle Edit Mode for Coordinador / Diácono */}
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isEditMode
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/25'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-md shadow-blue-600/20'
              }`}
            >
              {isEditMode ? (
                <>
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Finalizar Edición</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Editar Cuadro</span>
                </>
              )}
            </button>
          )}

          {/* Export to PDF */}
          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            {isExporting ? 'Generando PDF...' : 'Exportar a PDF'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
            title="Imprimir cuadro horizontal"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE VIEW MODE SWITCHER (Only visible on Mobile < lg) */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-sm space-y-3">
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileViewMode('panorama')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileViewMode === 'panorama'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            <span>Cuadro Completo</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileViewMode('tarjetas')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              mobileViewMode === 'tarjetas'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
            <span>Vista por Día</span>
          </button>
        </div>

        {mobileViewMode === 'panorama' && (
          <div className="flex items-center justify-between gap-2 px-1">
            <button
              type="button"
              onClick={() => setCustomZoom(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                customZoom === null
                  ? 'bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              Ajustar Todo a Pantalla
            </button>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setCustomZoom(
                    Math.max(fitScale, +(effectiveScale - 0.1).toFixed(2))
                  )
                }
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 w-11 text-center">
                {Math.round(effectiveScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() =>
                  setCustomZoom(Math.min(1, +(effectiveScale + 0.12).toFixed(2)))
                }
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {mobileViewMode === 'tarjetas' && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DAYS_FILTER.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setMobileDayFilter(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  mobileDayFilter === day
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && canEdit && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Modo Edición Activo:</strong> Haz clic en cualquier puesto
              para asignar al hermano, quitarlo o subir su fotografía.
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
            Guardado Automático
          </span>
        </div>
      )}

      {/* ================= MOBILE CARDS VIEW (Only shown on < lg when 'tarjetas' is selected) ================= */}
      {mobileViewMode === 'tarjetas' && (
        <div className="lg:hidden space-y-3">
          {mobileFilteredServices.map((srv) => {
            const secondLabel =
              srv.block === 'weekend' ? 'Coordinador 2' : 'Segundo Coordinador';
            const hasAnyAssigned =
              srv.assignments.coordinadorServicio ||
              srv.assignments.segundoCoordinador ||
              srv.assignments.coordinadorNinos ||
              srv.assignments.ayudas.some(Boolean);

            return (
              <div
                key={`mob-card-${srv.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="bg-[#1b365d] text-white px-4 py-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200 block">
                      {srv.dayGroup} • {srv.time}
                    </span>
                    <h4 className="text-sm font-black">{srv.name}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenServiceDetail(srv.id)}
                    className="px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-[11px] font-bold text-white"
                  >
                    Ver Servicio →
                  </button>
                </div>

                <div className="bg-[#c25900] text-white px-4 py-1.5 text-[11px] font-bold flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5 shrink-0" />
                  <span>{srv.uniform}</span>
                </div>

                <div className="p-3 space-y-2">
                  {!hasAnyAssigned && !(isEditMode && canEdit) ? (
                    <div className="text-xs text-slate-400 text-center py-3">
                      Sin hermanos asignados en este servicio.
                    </div>
                  ) : (
                    <>
                      {renderMobileCardSlot(
                        srv,
                        'coordinadorServicio',
                        'Coordinador Servicio',
                        srv.assignments.coordinadorServicio
                      )}
                      {renderMobileCardSlot(
                        srv,
                        'segundoCoordinador',
                        secondLabel,
                        srv.assignments.segundoCoordinador
                      )}
                      {renderMobileCardSlot(
                        srv,
                        'coordinadorNinos',
                        'Coordinador Niños',
                        srv.assignments.coordinadorNinos
                      )}
                      {[0, 1, 2, 3, 4, 5].map((idx) =>
                        renderMobileCardSlot(
                          srv,
                          'ayuda',
                          `Ayuda #${idx + 1}`,
                          srv.assignments.ayudas[idx] ?? null,
                          idx
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= OFFICIAL CUADRO DE PRIVILEGIOS TABLE (Auto-fitted to 100% of container on BOTH PC and Mobile!) ================= */}
      <div
        ref={viewportContainerRef}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 sm:p-4 shadow-md overflow-x-auto ${
          mobileViewMode === 'tarjetas' && !isExporting
            ? 'hidden lg:block'
            : 'block'
        }`}
      >
        <div
          style={
            isScaled && !isExporting
              ? {
                  width: `${Math.round(renderTableWidth * effectiveScale)}px`,
                  height: `${Math.round(tableNaturalHeight * effectiveScale)}px`,
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          <div
            id="cuadro-privilegios-printable"
            ref={printableRef}
            style={{
              width: `${renderTableWidth}px`,
              ...(isScaled && !isExporting
                ? {
                    transform: `scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                  }
                : {}),
            }}
            className="bg-white text-slate-900 p-3.5 rounded-lg"
          >
            {/* ================= OFFICIAL PDF HEADER ================= */}
            <div className="flex items-stretch justify-between gap-4 mb-2.5 border-b-2 border-slate-800 pb-2">
              {/* Left Logo Box */}
              <div className="w-[180px] bg-black rounded-md px-3 py-2 flex items-center gap-2.5 shrink-0 border border-slate-800">
                <img
                  src="/logo-sonido.png"
                  alt="Sonido Logo"
                  className="w-11 h-11 object-contain shrink-0"
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

                <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-slate-900 mt-1">
                  <span>Servicios del</span>
                  {isEditMode && canEdit ? (
                    <select
                      value={`${activeSchedule.dateFrom}|${activeSchedule.dateTo}`}
                      onChange={(e) => {
                        const [from, to] = e.target.value.split('|');
                        if (from && to) {
                          onUpdateSchedule({
                            ...activeSchedule,
                            dateFrom: from,
                            dateTo: to,
                          });
                        }
                      }}
                      className="px-2.5 py-0.5 border border-blue-500 rounded bg-blue-50 text-xs font-bold text-slate-900 cursor-pointer"
                    >
                      {/* Current schedule's week */}
                      <option
                        value={`${activeSchedule.dateFrom}|${activeSchedule.dateTo}`}
                      >
                        {activeSchedule.dateFrom} al {activeSchedule.dateTo}
                      </option>
                      {availableWeeks.map((w) => (
                        <option
                          key={w.key}
                          value={`${w.dateFrom}|${w.dateTo}`}
                        >
                          {w.dateFrom} al {w.dateTo}{' '}
                          {w.relativeBadge ? `(${w.relativeBadge})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <span className="underline decoration-slate-400">
                        {activeSchedule.dateFrom}
                      </span>
                      <span>al</span>
                      <span className="underline decoration-slate-400">
                        {activeSchedule.dateTo}
                      </span>
                    </>
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
              <div className="w-[150px] rounded-md bg-gradient-to-br from-amber-800 via-amber-700 to-yellow-900 text-white p-2 flex flex-col items-center justify-center text-center shrink-0 border border-amber-600 shadow-inner">
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
              {filteredModalMembers.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-6">
                  No hay hermanos registrados con acceso todavía. Aprueba o
                  agrega hermanos en el módulo "Hermanos".
                </div>
              ) : (
                filteredModalMembers.map((m) => {
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
                            {getRoleLabel(m.role)} • {m.phone}
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
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL FOR CREATING A NEW WEEKLY SCHEDULE (SMART CALENDAR WEEK PICKER) ================= */}
      {showNewWeekModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewSchedule}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CalendarCheck className="w-5 h-5 text-blue-400 shrink-0" />
                <div>
                  <h3 className="text-base font-extrabold">
                    Crear Nuevo Cuadro de Privilegios
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Selecciona una semana oficial (Lunes a Domingo)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewWeekModal(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {weekModalError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{weekModalError}</span>
                </div>
              )}

              {/* Selected Week Preview Card */}
              <div className="p-4 rounded-2xl bg-blue-600/10 border-2 border-blue-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Semana Seleccionada (Lunes a Domingo)
                  </span>
                  {selectedWeekOption.relativeBadge && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                      {selectedWeekOption.relativeBadge}
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Del <span className="text-blue-600 dark:text-blue-400">{selectedWeekOption.dateFrom}</span>
                </div>
                <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                  Al <span className="text-blue-600 dark:text-blue-400">{selectedWeekOption.dateTo}</span>
                </div>
              </div>

              {/* List of Available Upcoming Weeks */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                  Semanas Disponibles en el Calendario:
                </label>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {availableWeeks.map((week) => {
                    const alreadyCreated = isWeekAlreadyCreated(week);
                    const isSelected = selectedWeekOption.key === week.key;

                    return (
                      <button
                        key={week.key}
                        type="button"
                        disabled={alreadyCreated}
                        onClick={() => {
                          setSelectedWeekOption(week);
                          setWeekModalError('');
                        }}
                        className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                          alreadyCreated
                            ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-55 cursor-not-allowed'
                            : isSelected
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/20 cursor-pointer'
                            : 'bg-slate-50 dark:bg-slate-800/80 hover:border-blue-400 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold truncate">
                              {week.shortLabel}
                            </span>
                            {week.relativeBadge && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isSelected
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'
                                }`}
                              >
                                {week.relativeBadge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[11px] mt-0.5 truncate ${
                              isSelected
                                ? 'text-blue-100'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {week.dateFrom} al {week.dateTo}
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 ${
                            alreadyCreated
                              ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              : isSelected
                              ? 'bg-emerald-400 text-slate-950'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {alreadyCreated
                            ? 'Ya Creado'
                            : isSelected
                            ? 'Seleccionada'
                            : 'Disponible'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Native Date Picker fallback that auto-snaps to Monday-Sunday of the chosen week */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                    ¿Buscas otra fecha del año?
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Elige cualquier día y se calculará su Lunes a Domingo
                    automáticamente.
                  </p>
                </div>
                <input
                  type="date"
                  value={selectedWeekOption.mondayIso}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const customWeek = buildWeekFromDate(e.target.value);
                    setSelectedWeekOption(customWeek);
                    setWeekModalError('');
                  }}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
                />
              </div>

              {/* Copy assignments from current week checkbox */}
              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={duplicateCurrent}
                  onChange={(e) => setDuplicateCurrent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 dark:text-white block">
                    Copiar asignaciones de la semana actual como base
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {duplicateCurrent
                      ? `Se copiarán los puestos actuales (${currentAssignedCount} asignaciones de la semana ${activeSchedule.dateFrom}) para que solo edites los cambios.`
                      : 'El nuevo cuadro se creará totalmente en blanco sin ningún hermano asignado.'}
                  </span>
                </div>
              </label>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowNewWeekModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isWeekAlreadyCreated(selectedWeekOption)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-extrabold shadow-lg shadow-blue-600/25 cursor-pointer"
              >
                <CalendarCheck className="w-4 h-4" />
                Crear Cuadro de esta Semana
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
