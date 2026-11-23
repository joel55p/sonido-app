export type Role = 'diacono' | 'coordinador' | 'servidor';

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
  block: 'weekday' | 'weekend'; // 'weekday' = Lunes a Viernes table, 'weekend' = Sábado y Domingo table
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
