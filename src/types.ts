// Modelo de datos de la app de recordatorios.

/**
 * Modo de repetición diaria:
 * - once:  una vez al día (switch verde clásico).
 * - count: N veces al día (objetivo); se completa al llegar a `target`.
 * - free:  libre / contador sin objetivo (se marca cuantas veces haga falta).
 */
export type ReminderMode = 'once' | 'count' | 'free';

/** Un recordatorio / chequeo diario (ej: "Llave del gas"). */
export type Reminder = {
  id: string;
  title: string;
  icon: string; // emoji, ej: "🔑"
  createdAt: number;
  order: number;
  mode: ReminderMode;
  /** Objetivo de veces por día (solo modo 'count'). */
  target?: number;
};

/**
 * Marcas por día. La clave externa es el día (YYYY-MM-DD) y la interna el id
 * del recordatorio → lista de timestamps (ms), uno por cada vez que se marcó.
 *
 * Guardar por día hace que el "reinicio a medianoche" sea automático: cada
 * día nuevo tiene su propio mapa vacío y además queda el historial.
 */
export type MarksMap = {
  [dayKey: string]: { [reminderId: string]: number[] };
};

/** Configuración del recordatorio-aviso diario (todo configurable por el usuario). */
export type Settings = {
  dailyCheckEnabled: boolean;
  dailyCheckHour: number; // 0-23
  dailyCheckMinute: number; // 0-59
  dailyCheckMessage: string;
};

export type AppState = {
  reminders: Reminder[];
  completions: MarksMap;
  /** Log de deshechos: lista de timestamps (ms) por día y recordatorio. */
  undos: MarksMap;
  settings: Settings;
  /** true una vez que se hidrató desde el almacenamiento. */
  loaded: boolean;
};
