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

interface RawMemberSeed {
  id: string;
  name: string;
  role: 'diacono' | 'coordinador' | 'servidor';
  email: string;
  phone: string;
}

const RAW_MEMBERS: RawMemberSeed[] = [
  // 3 Usuarios Principales de Ejemplo para probar cada rol con correo y contraseña
  {
    id: 'm-diacono',
    name: 'Diácono Ejemplo',
    role: 'diacono',
    email: 'diacono@sonido.com',
    phone: '+502100001',
  },
  {
    id: 'm-coordinador',
    name: 'Coordinador Ejemplo',
    role: 'coordinador',
    email: 'coordinador@sonido.com',
    phone: '+502100002',
  },
  {
    id: 'm-servidor',
    name: 'Servidor Ejemplo',
    role: 'servidor',
    email: 'servidor@sonido.com',
    phone: '+502100003',
  },

  // Usuarios adicionales de ejemplo (sin nombres reales) para mostrar la estructura del cuadro
  {
    id: 'm-coord-2',
    name: 'Segundo Coord Ejemplo',
    role: 'coordinador',
    email: 'coordinador2@sonido.com',
    phone: '+502100004',
  },
  {
    id: 'm-coord-ninos',
    name: 'Coord Niños Ejemplo',
    role: 'coordinador',
    email: 'coordninos@sonido.com',
    phone: '+502100005',
  },
  {
    id: 'm-serv-2',
    name: 'Servidor Ejemplo 2',
    role: 'servidor',
    email: 'servidor2@sonido.com',
    phone: '+502100006',
  },
  {
    id: 'm-serv-3',
    name: 'Servidor Ejemplo 3',
    role: 'servidor',
    email: 'servidor3@sonido.com',
    phone: '+502100007',
  },
  {
    id: 'm-serv-4',
    name: 'Servidor Ejemplo 4',
    role: 'servidor',
    email: 'servidor4@sonido.com',
    phone: '+502100008',
  },
  {
    id: 'm-serv-5',
    name: 'Servidor Ejemplo 5',
    role: 'servidor',
    email: 'servidor5@sonido.com',
    phone: '+502100009',
  },
  {
    id: 'm-serv-6',
    name: 'Servidor Ejemplo 6',
    role: 'servidor',
    email: 'servidor6@sonido.com',
    phone: '+502100010',
  },
];

export const INITIAL_MEMBERS: UserMember[] = RAW_MEMBERS.map((m, idx) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  password: '123',
  role: m.role,
  photoUrl: createAvatarDataUri(m.name, idx),
  phone: m.phone,
  active: true,
}));

export const INITIAL_SCHEDULE: PrivilegeSchedule = {
  id: 'sched-ejemplo-semanal',
  title: 'Cuadro de Privilegios',
  dateFrom: 'lunes 23/noviembre/2026',
  dateTo: 'domingo 29/noviembre/2026',
  verseText:
    'Ahora pues, si están animados por estar en Cristo, si están consolados por su amor, si comparten juntos en el Espíritu, si tienen compasión y simpatía, entonces completen mi alegría teniendo un mismo modo de pensar y amar, permaneciendo espiritualmente unidos y con un mismo propósito',
  verseRef: 'VBL Filipenses 2:1-2',
  yearTheme: '2026 Año del Deleite',
  createdAt: '2026-11-22T18:00:00.000Z',
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
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          null,
          null,
        ],
      },
    },
    {
      id: 'srv-mar-damas',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Servicio Damas',
      time: '2:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: null,
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: [null, null, null, null, null, null],
      },
    },
    {
      id: 'srv-mar-voces',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Ensayo Voces',
      time: '6:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: null,
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: [null, null, null, null, null, null],
      },
    },
    {
      id: 'srv-mar-doctrina',
      dayGroup: 'Martes',
      block: 'weekday',
      name: 'Escuela Doctrina',
      time: '6:30 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: null,
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: [null, null, null, null, null, null],
      },
    },
    {
      id: 'srv-mie-intercesion',
      dayGroup: 'Miércoles',
      block: 'weekday',
      name: 'Intercesión',
      time: '8:30 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: null,
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: [null, null, null, null, null, null],
      },
    },
    {
      id: 'srv-mie-devocional',
      dayGroup: 'Miércoles',
      block: 'weekday',
      name: 'Servicio Devocional',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: null,
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },
    {
      id: 'srv-jue-ensayo-general',
      dayGroup: 'Jueves',
      block: 'weekday',
      name: 'Ensayo General',
      time: '6:30 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          null,
          null,
        ],
      },
    },
    {
      id: 'srv-vie-intercesion',
      dayGroup: 'Viernes',
      block: 'weekday',
      name: 'Intercesión',
      time: '8:30 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: [null, null, null, null, null, null],
      },
    },
    {
      id: 'srv-vie-devocional',
      dayGroup: 'Viernes',
      block: 'weekday',
      name: 'Servicio Devocional',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: null,
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },

    // ================= BLOQUE 2: SÁBADO Y DOMINGO =================
    {
      id: 'srv-sab-prejuveniles',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Prejuveniles',
      time: '8:00 a.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: ['m-servidor', 'm-serv-2', null, null, null, null],
      },
    },
    {
      id: 'srv-sab-ensayo-ninos',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo de niños',
      time: '2:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: ['m-serv-3', 'm-serv-4', null, null, null, null],
      },
    },
    {
      id: 'srv-sab-gibbor',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Gibbor',
      time: '12:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: ['m-servidor', 'm-serv-2', 'm-serv-3', null, null, null],
      },
    },
    {
      id: 'srv-sab-ensayo-general',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo General',
      time: '5:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: null,
        coordinadorNinos: null,
        ayudas: ['m-serv-4', 'm-serv-5', null, null, null, null],
      },
    },
    {
      id: 'srv-sab-ensayo-prejuveniles',
      dayGroup: 'Sábado',
      block: 'weekend',
      name: 'Ensayo de prejuveniles',
      time: '5:00 p.m.',
      uniform: 'Chaleco y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: null,
        segundoCoordinador: null,
        coordinadorNinos: 'm-coord-ninos',
        ayudas: ['m-servidor', 'm-serv-2', null, null, null, null],
      },
    },
    {
      id: 'srv-dom-primero',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Primer Servicio',
      time: '6:30 a.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },
    {
      id: 'srv-dom-segundo',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Segundo Servicio',
      time: '10:00 a.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },
    {
      id: 'srv-dom-tercero',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Tercer Servicio',
      time: '1:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },
    {
      id: 'srv-dom-cuarto',
      dayGroup: 'Domingo',
      block: 'weekend',
      name: 'Cuarto Servicio',
      time: '5:00 p.m.',
      uniform: 'Camisa y gafete – uniforme negro',
      assignments: {
        coordinadorServicio: 'm-coordinador',
        segundoCoordinador: 'm-coord-2',
        coordinadorNinos: 'm-coord-ninos',
        ayudas: [
          'm-servidor',
          'm-serv-2',
          'm-serv-3',
          'm-serv-4',
          'm-serv-5',
          'm-serv-6',
        ],
      },
    },
  ],
};

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    title: 'Lineamientos de Uniforme y Puntualidad de la Semana',
    category: 'Uniforme',
    content:
      'Bendiciones hermanos del Departamento de Sonido. Les recordamos verificar en el Cuadro de Privilegios si en su servicio corresponde "Camisa y gafete – uniforme negro" o "Chaleco y gafete – uniforme negro". Por favor presentarse 30 minutos antes del inicio de cada servicio para prueba de línea y oración.',
    authorId: 'm-diacono',
    authorName: 'Diácono Ejemplo',
    authorRole: 'diacono',
    createdAt: '2026-11-22T15:30:00.000Z',
    pinned: true,
  },
  {
    id: 'ann-2',
    title: 'Ensayo General de Jueves y Cuidado de Equipos',
    category: 'Capacitación',
    content:
      'A todos los coordinadores de servicio y ayudas: al finalizar cada turno y el Ensayo General, por favor dejar las baterías recargables en su estación de carga y anotar en los comentarios generales de asistencia del servicio si algún micrófono o cable presentó novedad.',
    authorId: 'm-coordinador',
    authorName: 'Coordinador Ejemplo',
    authorRole: 'coordinador',
    createdAt: '2026-11-22T17:00:00.000Z',
    pinned: false,
  },
];
