// =============================================================================
// schedule.ts — Real-time store schedule & opening status calculator.
// =============================================================================
// Calcula si un taller artesanal se encuentra abierto o cerrado en tiempo real
// con respecto a la zona horaria oficial de Nicaragua (America/Managua, UTC-6).
//
// Reglas de negocio:
//   - Lee `store.schedule` (JSON estructurado por día) o fallback a `schedule_text`.
//   - Si la hora actual de Managua está entre open y close:
//       -> isOpen = true ("Abierto ahora", "Cierra a las 5:00 PM")
//   - Si está fuera del horario:
//       -> isOpen = false ("Cerrado", "Abre mañana a las 8:00 AM")
//   - Distingue claramente el estado de horario del feature `is_demonstrative`
//     (Taller Demostrativo con exhibición en vivo de técnicas ancestrales).
import type { Lang } from '@/i18n/ui';

export interface DaySchedule {
  open: string;  // formato "HH:MM", ej: "08:00"
  close: string; // formato "HH:MM", ej: "17:00"
  closed?: boolean;
}

export type StoreSchedule = Record<string, DaySchedule>;

export interface StoreScheduleInput {
  schedule?: StoreSchedule | null;
  schedule_text?: string | null;
  is_demonstrative?: boolean | null;
}

export interface StoreScheduleStatus {
  /** ¿Está abierto en este momento exacto? */
  isOpen: boolean;
  /** Texto conciso de estado: "Abierto ahora", "Cerrado hoy", "Cerrado" */
  statusText: string;
  /** Subtítulo contextual: "Cierra a las 5:00 PM", "Abre mañana a las 8:00 AM" */
  nextChangeText: string;
  /** Resumen general del horario: "Lun - Sáb: 8:00 AM - 5:00 PM" */
  scheduleSummary: string;
  /** Color para el punto indicador (verde esmeralda o rojo ámbar) */
  dotColorClass: string;
  /** Clase de color de texto */
  textColorClass: string;
  /** Si ofrece demostración en vivo de artesanía */
  isDemonstrative: boolean;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** Convierte hora militar "17:00" a formato amigable "5:00 PM" */
export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // 0 -> 12
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mFormatted} ${ampm}`;
}

/** Convierte "HH:MM" en minutos transcurridos desde medianoche */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
}

/** Obtiene la fecha/hora actual desglosada en la zona horaria de Nicaragua */
export function getNicaraguaNow(baseDate: Date = new Date()): {
  dayKey: (typeof DAY_KEYS)[number];
  dayIndex: number;
  currentMinutes: number;
} {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Managua',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(baseDate);
  let weekdayShort = 'mon';
  let hour = 12;
  let minute = 0;

  for (const p of parts) {
    if (p.type === 'weekday') weekdayShort = p.value.toLowerCase().slice(0, 3);
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
  }

  // Mapear weekday a DAY_KEYS
  const dayIndex = DAY_KEYS.indexOf(weekdayShort as any) >= 0
    ? DAY_KEYS.indexOf(weekdayShort as any)
    : 1;

  return {
    dayKey: DAY_KEYS[dayIndex],
    dayIndex,
    currentMinutes: hour * 60 + minute,
  };
}

const SCHEDULE_I18N: Record<
  Lang,
  {
    openNow: string;
    closesAt: (t: string) => string;
    closedToday: string;
    closed: string;
    opensTomorrow: (t: string) => string;
    opensToday: (t: string) => string;
    closedTemporarily: string;
    opensBusinessDays: string;
    defaultSummary: string;
  }
> = {
  es: {
    openNow: 'Abierto ahora',
    closesAt: (t) => `Cierra a las ${t}`,
    closedToday: 'Cerrado hoy',
    closed: 'Cerrado',
    opensTomorrow: (t) => `Abre mañana a las ${t}`,
    opensToday: (t) => `Abre hoy a las ${t}`,
    closedTemporarily: 'Cerrado temporalmente',
    opensBusinessDays: 'Abre en días hábiles',
    defaultSummary: 'Lun - Sáb: 8:00 AM - 5:00 PM',
  },
  en: {
    openNow: 'Open now',
    closesAt: (t) => `Closes at ${t}`,
    closedToday: 'Closed today',
    closed: 'Closed',
    opensTomorrow: (t) => `Opens tomorrow at ${t}`,
    opensToday: (t) => `Opens today at ${t}`,
    closedTemporarily: 'Temporarily closed',
    opensBusinessDays: 'Opens on business days',
    defaultSummary: 'Mon - Sat: 8:00 AM - 5:00 PM',
  },
  miq: {
    openNow: 'Kala sa',
    closesAt: (t) => `Taim ${t} ra prawisa`,
    closedToday: 'Naiwa prawan sa',
    closed: 'Prawan',
    opensTomorrow: (t) => `Yauka taim ${t} ra kalisa`,
    opensToday: (t) => `Naiwa taim ${t} ra kalisa`,
    closedTemporarily: 'Prawan kumi kau',
    opensBusinessDays: 'Wark yua nani ra kalisa',
    defaultSummary: 'Mande - Sadidi: 8:00 AM - 5:00 PM',
  },
};

/**
 * Evalúa el estado de apertura en tiempo real para cualquier tienda con soporte multilenguaje.
 */
export function getStoreScheduleStatus(
  store: StoreScheduleInput,
  overrideNow?: Date,
  lang: Lang = 'es',
): StoreScheduleStatus {
  const i18n = SCHEDULE_I18N[lang] || SCHEDULE_I18N.es;
  const isDemonstrative = Boolean(store.is_demonstrative ?? true);
  const scheduleSummary = store.schedule_text || i18n.defaultSummary;

  const { dayKey, dayIndex, currentMinutes } = getNicaraguaNow(overrideNow);

  // Si no hay horario estructurado, usar valores por defecto artesanal
  const schedule = store.schedule || {
    mon: { open: '08:00', close: '17:00', closed: false },
    tue: { open: '08:00', close: '17:00', closed: false },
    wed: { open: '08:00', close: '17:00', closed: false },
    thu: { open: '08:00', close: '17:00', closed: false },
    fri: { open: '08:00', close: '17:00', closed: false },
    sat: { open: '08:00', close: '17:00', closed: false },
    sun: { open: '09:00', close: '13:00', closed: false },
  };

  const todaySchedule = schedule[dayKey];

  if (!todaySchedule || todaySchedule.closed) {
    // Buscar el próximo día que abra
    const nextDayIndex = (dayIndex + 1) % 7;
    const nextDayKey = DAY_KEYS[nextDayIndex];
    const nextDaySchedule = schedule[nextDayKey];
    const nextOpen = nextDaySchedule && !nextDaySchedule.closed
      ? i18n.opensTomorrow(formatTime12h(nextDaySchedule.open))
      : i18n.closedTemporarily;

    return {
      isOpen: false,
      statusText: i18n.closedToday,
      nextChangeText: nextOpen,
      scheduleSummary,
      dotColorClass: 'bg-rose-500',
      textColorClass: 'text-rose-600 dark:text-rose-400',
      isDemonstrative,
    };
  }

  const openMinutes = timeToMinutes(todaySchedule.open || '08:00');
  const closeMinutes = timeToMinutes(todaySchedule.close || '17:00');

  // Caso 1: Dentro del horario -> ABIERTO
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      isOpen: true,
      statusText: i18n.openNow,
      nextChangeText: i18n.closesAt(formatTime12h(todaySchedule.close || '17:00')),
      scheduleSummary,
      dotColorClass: 'bg-emerald-500 animate-pulse',
      textColorClass: 'text-emerald-600 dark:text-emerald-400',
      isDemonstrative,
    };
  }

  // Caso 2: Aún no abre hoy
  if (currentMinutes < openMinutes) {
    return {
      isOpen: false,
      statusText: i18n.closed,
      nextChangeText: i18n.opensToday(formatTime12h(todaySchedule.open || '08:00')),
      scheduleSummary,
      dotColorClass: 'bg-amber-500',
      textColorClass: 'text-amber-600 dark:text-amber-400',
      isDemonstrative,
    };
  }

  // Caso 3: Ya cerró por hoy -> abre mañana
  const nextDayIndex = (dayIndex + 1) % 7;
  const nextDayKey = DAY_KEYS[nextDayIndex];
  const nextDaySchedule = schedule[nextDayKey];
  const nextOpen = nextDaySchedule && !nextDaySchedule.closed
    ? i18n.opensTomorrow(formatTime12h(nextDaySchedule.open || '08:00'))
    : i18n.opensBusinessDays;

  return {
    isOpen: false,
    statusText: i18n.closed,
    nextChangeText: nextOpen,
    scheduleSummary,
    dotColorClass: 'bg-rose-500',
    textColorClass: 'text-rose-600 dark:text-rose-400',
    isDemonstrative,
  };
}
