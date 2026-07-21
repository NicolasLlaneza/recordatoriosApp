// Modelo de datos de la app de recordatorios.

/** Un recordatorio / chequeo diario (ej: "Llave del gas"). */
export type Reminder = {
  id: string;
  title: string;
  icon: string; // emoji, ej: "🔑"
  createdAt: number;
  order: number;
};

/**
 * Completados por día. La clave externa es el día (YYYY-MM-DD) y la interna
 * el id del recordatorio → timestamp (ms) del momento en que se marcó hecho.
 *
 * Guardar por día hace que el "reinicio a medianoche" sea automático: cada
 * día nuevo tiene su propio mapa vacío y además queda el historial.
 */
export type CompletionMap = {
  [dayKey: string]: { [reminderId: string]: number };
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
  completions: CompletionMap;
  /** Momento (ms) en que se deshizo un "hecho", por día y recordatorio. */
  undos: CompletionMap;
  settings: Settings;
  /** true una vez que se hidrató desde el almacenamiento. */
  loaded: boolean;
};
