export type Role =
  | 'diacono'
  | 'ayuda_directa'
  | 'ayuda_diacono'
  | 'coordinador'
  | 'servidor'
  | 'pendiente';

export function getRoleLabel(role: Role): string {
  switch (role) {
    case 'diacono':
      return 'Diácono';
    case 'ayuda_directa':
      return 'Ayuda Directa del Diácono';
    case 'ayuda_diacono':
      return 'Ayuda de Diácono';
    case 'coordinador':
      return 'Coordinador';
    case 'servidor':
      return 'Servidor';
    case 'pendiente':
      return 'Pendiente';
  }
}

/**
 * Rol 1 (Diácono) y Rol 2 (Ayuda directa del Diácono) son los únicos que pueden crear, editar o eliminar Cuadros de Privilegios.
 */
export function canEditSchedules(role: Role): boolean {
  return role === 'diacono' || role === 'ayuda_directa';
}

/**
 * Rol 1 (Diácono), Rol 2 (Ayuda directa del Diácono) y Rol 3 (Ayudas de Diácono) pueden aceptar hermanos en espera y gestionar usuarios.
 * Los Coordinadores (Rol 4) NO pueden dar acceso a los hermanos.
 */
export function canManageBrothers(role: Role): boolean {
  return (
    role === 'diacono' ||
    role === 'ayuda_directa' ||
    role === 'ayuda_diacono'
  );
}

/**
 * Rol 1, Rol 2, Rol 3 y Rol 4 (Coordinadores) pueden pasar asistencia en Servicios y exportar el reporte PDF del servicio.
 */
export function canTakeServiceAttendance(role: Role): boolean {
  return (
    role === 'diacono' ||
    role === 'ayuda_directa' ||
    role === 'ayuda_diacono' ||
    role === 'coordinador'
  );
}

/**
 * Rol 1, Rol 2, Rol 3 y Rol 4 pueden publicar avisos en el muro de Información.
 */
export function canPostAnnouncements(role: Role): boolean {
  return (
    role === 'diacono' ||
    role === 'ayuda_directa' ||
    role === 'ayuda_diacono' ||
    role === 'coordinador'
  );
}

export type AttendanceStatus = 'pendiente' | 'asistio' | 'no_asistio' | 'excusa' | 'tarde';

export interface UserMember {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  photoUrl: string;
  phone: string; // Formato estricto: +502 seguido de 6 dígitos numéricos
  active: boolean;
  createdAt?: string;
}

export interface ServiceAssignment {
  coordinadorServicio: string | null; // member ID
  segundoCoordinador: string | null;  // member ID
  coordinadorNinos: string | null;    // member ID
  ayudas: (string | null)[];          // array of 6 member IDs
}

export interface MemberAttendanceRecord {
  memberId: string;
  roleInService: string;
  status: AttendanceStatus;
  comment: string;
}

export interface ServiceAttendance {
  serviceId: string;
  generalComment: string;
  updatedBy?: string;
  updatedAt?: string;
  records: Record<string, MemberAttendanceRecord>; // key: slotKey
}

export interface ServiceColumn {
  id: string;
  dayGroup: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes' | 'Sábado' | 'Domingo';
  block: 'weekday' | 'weekend';
  name: string;
  time: string;
  uniform: string;
  assignments: ServiceAssignment;
}

export interface PrivilegeSchedule {
  id: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  verseText: string;
  verseRef: string;
  yearTheme: string;
  createdAt: string;
  isActive: boolean;
  services: ServiceColumn[];
  attendance: Record<string, ServiceAttendance>; // key: serviceId
}

export interface Announcement {
  id: string;
  title: string;
  category: 'Urgente' | 'Uniforme' | 'Capacitación' | 'General';
  content: string;
  authorId: string;
  authorName: string;
  authorRole: Role;
  createdAt: string;
  pinned?: boolean;
}
