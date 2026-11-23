import { UserMember, PrivilegeSchedule, Announcement } from '../types';

export function createAvatarDataUri(name: string, index: number): string {
  const palettes = [
    ['#1e3a8a', '#3b82f6'],
    ['#0f172a', '#334155'],
    ['#1e293b', '#475569'],
    ['#1d4ed8', '#60a5fa'],
    ['#312e81', '#6366f1'],
    ['#064e3b', '#10b981'],
    ['#7c2d12', '#f97316'],
    ['#4c1d95', '#8b5cf6'],
    ['#134e4a', '#14b8a6'],
    ['#831843', '#ec4899'],
  ];
  const [bg1, bg2] = palettes[index % palettes.length];
  const parts = name.trim().split(/\s+/);
  const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="12" fill="url(#g)"/>
    <circle cx="60" cy="44" r="21" fill="rgba(255,255,255,0.22)"/>
    <path d="M22 114 C22 86, 98 86, 98 114" fill="rgba(255,255,255,0.22)"/>
    <text x="60" y="104" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#ffffff" text-anchor="middle">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Helper for strict phone validation: "+502" followed by exactly 6 digits
export function sanitizeGuatemalaPhone6(rawDigits: string): string {
  const digitsOnly = rawDigits.replace(/\D/g, '').slice(0, 6);
  return digitsOnly;
}

export function isValidPhone502(phone: string): boolean {
  return /^\+502\d{6}$/.test(phone.trim());
}

export interface PasswordValidationResult {
  valid: boolean;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  message?: string;
}

/**
 * Exige una contraseña segura (mínimo 8 caracteres, al menos 1 mayúscula, 1 minúscula y 1 número).
 */
export function validateStrongPassword(password: string): PasswordValidationResult {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const valid = hasMinLength && hasUppercase && hasLowercase && hasNumber;
  let message: string | undefined;
  if (!valid) {
    message =
      'La contraseña debe tener al menos 8 caracteres, incluir una letra mayúscula, una minúscula y un número.';
  }

  return {
    valid,
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    message,
  };
}

// Base de usuarios 100% limpia para producción real
export const INITIAL_MEMBERS: UserMember[] = [];

const emptyAssignments = () => ({
  coordinadorServicio: null,
  segundoCoordinador: null,
  coordinadorNinos: null,
  ayudas: [null, null, null, null, null, null] as (string | null)[],
});

export const INITIAL_SCHEDULE: PrivilegeSchedule = {
  id: 'sched-produccion-1',
  title: 'Cuadro de Privilegios',
  dateFrom: 'lunes 23/noviembre/2026',
  dateTo: 'domingo 29/noviembre/2026',
  verseText:
    'Ahora pues, si están animados por estar en Cristo, si están consolados por su amor, si comparten juntos en el Espíritu, si tienen compasión y simpatía, entonces completen mi alegría teniendo un mismo modo de pensar y amar, permaneciendo espiritualmente unidos y con un mismo propósito',
  verseRef: 'VBL Filipenses 2:1-2',
  yearTheme: '2026 Año del Deleite',
  createdAt: new Date().toISOString(),
  isActive: true,
  attendance: {},
  services: [
    // ================= BLOQUE 1: LUNES A VIERNES =================
    {
      id: 'srv-lun-familiar',
      dayGroup: 'Lunes',
      block: 'weekday',
      name: 'Servicio Familiar',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-mar-damas',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Servicio Damas',
      time: '2:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-mar-voces',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Ensayo Voces',
      time: '6:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-mar-doctrina',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Escuela Doctrina',
      time: '6:30 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-mie-intercesion',
      dayGroup: 'Miércoles',
      block: 'weekday',
      name: 'Intercesión',
      time: '8:30 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-mie-devocional',
      dayGroup: 'Miércoles',
      block: 'weekday',
      name: 'Servicio Devocional',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-jue-ensayo-general',
      dayGroup: 'Jueves',
      block: 'weekday',
      name: 'Ensayo General',
      time: '6:30 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-vie-intercesion',
      dayGroup: 'Viernes',
      block: 'weekday',
      name: 'Intercesión',
      time: '8:30 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-vie-devocional',
      dayGroup: 'Viernes',
      block: 'weekday',
      name: 'Servicio Devocional',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },

    // ================= BLOQUE 2: SÁBADO Y DOMINGO =================
    {
      id: 'srv-sab-prejuveniles',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Prejuveniles',
      time: '8:00 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-sab-ensayo-ninos',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo de niños',
      time: '2:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-sab-gibbor',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Gibbor',
      time: '12:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-sab-ensayo-general',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo General',
      time: '5:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-sab-ensayo-prejuveniles',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo de prejuveniles',
      time: '5:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-dom-primero',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Primer Servicio',
      time: '6:30 a.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-dom-segundo',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Segundo Servicio',
      time: '10:00 a.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-dom-tercero',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Tercer Servicio',
      time: '1:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
    {
      id: 'srv-dom-cuarto',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Cuarto Servicio',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: emptyAssignments(),
    },
  ],
};

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-bienvenida',
    title: 'Bienvenidos a la Plataforma Oficial del Departamento de Sonido',
    category: 'General',
    content:
      'Bendiciones hermanos del Departamento de Sonido — Producción de Audio (Ministerios Ebenezer). Desde esta plataforma podrán consultar el Cuadro de Privilegios semanal de Lunes a Domingo, revisar el uniforme correspondiente a cada servicio y mantenerse informados de los comunicados oficiales.',
    authorId: 'system',
    authorName: 'Departamento de Sonido',
    authorRole: 'diacono',
    createdAt: new Date().toISOString(),
    pinned: true,
  },
];
