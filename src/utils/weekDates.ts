const MONTHS_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export interface WeekOption {
  key: string; // YYYY-MM-DD of Monday
  mondayIso: string;
  sundayIso: string;
  dateFrom: string; // e.g. "lunes 23/noviembre/2026"
  dateTo: string;   // e.g. "domingo 29/noviembre/2026"
  shortLabel: string; // e.g. "23 nov – 29 nov 2026"
  relativeBadge?: string; // e.g. "Semana Actual", "Próxima Semana"
}

/**
 * Given any Date, returns the Monday (00:00:00 local time) of that week.
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Formats a Date into "lunes 23/noviembre/2026" or "domingo 29/noviembre/2026"
 */
export function formatSpanishServiceDate(
  date: Date,
  dayName: 'lunes' | 'domingo'
): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const monthName = MONTHS_ES[date.getMonth()];
  const yyyy = date.getFullYear();
  return `${dayName} ${dd}/${monthName}/${yyyy}`;
}

export function toIsoDateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Builds a complete WeekOption (Monday to Sunday) from any Date or ISO string (YYYY-MM-DD).
 */
export function buildWeekFromDate(
  input: Date | string,
  referenceToday: Date = new Date()
): WeekOption {
  let parsed: Date;
  if (typeof input === 'string') {
    const [y, m, d] = input.split('-').map(Number);
    parsed = new Date(y, (m || 1) - 1, d || 1);
  } else {
    parsed = input;
  }

  const monday = getMondayOfWeek(parsed);
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6
  );

  const todayMonday = getMondayOfWeek(referenceToday);
  const diffDays = Math.round(
    (monday.getTime() - todayMonday.getTime()) / (1000 * 60 * 60 * 24)
  );
  const diffWeeks = Math.round(diffDays / 7);

  let relativeBadge: string | undefined;
  if (diffWeeks === 0) relativeBadge = 'Semana Actual';
  else if (diffWeeks === 1) relativeBadge = 'Próxima Semana';
  else if (diffWeeks === -1) relativeBadge = 'Semana Pasada';
  else if (diffWeeks > 1) relativeBadge = `En ${diffWeeks} semanas`;

  const mDay = String(monday.getDate()).padStart(2, '0');
  const sDay = String(sunday.getDate()).padStart(2, '0');
  const mMonShort = MONTHS_ES[monday.getMonth()].slice(0, 3);
  const sMonShort = MONTHS_ES[sunday.getMonth()].slice(0, 3);

  return {
    key: toIsoDateString(monday),
    mondayIso: toIsoDateString(monday),
    sundayIso: toIsoDateString(sunday),
    dateFrom: formatSpanishServiceDate(monday, 'lunes'),
    dateTo: formatSpanishServiceDate(sunday, 'domingo'),
    shortLabel: `${mDay} ${mMonShort} – ${sDay} ${sMonShort} ${sunday.getFullYear()}`,
    relativeBadge,
  };
}

/**
 * Generates a list of consecutive weeks (Monday to Sunday) around today
 * so the Coordinator or Diácono can pick from valid available weeks with 1 click.
 */
export function generateAvailableWeeks(
  weeksBefore = 1,
  weeksAfter = 8,
  referenceToday: Date = new Date()
): WeekOption[] {
  const baseMonday = getMondayOfWeek(referenceToday);
  const list: WeekOption[] = [];

  for (let i = -weeksBefore; i <= weeksAfter; i++) {
    const targetMonday = new Date(
      baseMonday.getFullYear(),
      baseMonday.getMonth(),
      baseMonday.getDate() + i * 7
    );
    list.push(buildWeekFromDate(targetMonday, referenceToday));
  }

  return list;
}
