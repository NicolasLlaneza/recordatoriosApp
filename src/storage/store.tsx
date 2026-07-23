// Estado global + persistencia local (AsyncStorage). Sin backend ni login:
// todo vive en el dispositivo. Los grupos de convivientes (Fase 2) usan Supabase.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, MarksMap, ReminderMode, Reminder, Settings } from '../types';
import { dayKey } from '../lib/day';

const STORAGE_KEY = 'recordatorios.state.v1';
const KEEP_DAYS = 60; // podado del historial

const defaultSettings: Settings = {
  dailyCheckEnabled: true,
  dailyCheckHour: 22,
  dailyCheckMinute: 0,
  dailyCheckMessage: '¿Revisaste todos tus recordatorios?',
};

// Recordatorios de ejemplo en la primera apertura, para tener valor inmediato.
function seedReminders(): Reminder[] {
  const now = Date.now();
  const seeds: Array<[string, string]> = [
    ['🚪', 'Puerta con llave'],
    ['🔥', 'Llave del gas cerrada'],
    ['🚗', 'Auto cerrado'],
    ['🪟', 'Ventanas cerradas'],
  ];
  return seeds.map(([icon, title], i) => ({
    id: `seed-${i}`,
    icon,
    title,
    createdAt: now + i,
    order: i,
    mode: 'once' as ReminderMode,
  }));
}

const initialState: AppState = {
  reminders: [],
  completions: {},
  undos: {},
  settings: defaultSettings,
  loaded: false,
};

type Action =
  | { type: 'HYDRATE'; payload: Omit<AppState, 'loaded'> }
  | { type: 'ADD_REMINDER'; icon: string; title: string; mode: ReminderMode; target?: number }
  | { type: 'UPDATE_REMINDER'; id: string; icon: string; title: string; mode: ReminderMode; target?: number }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'ADD_MARK'; id: string; day: string }
  | { type: 'REMOVE_MARK'; id: string; day: string }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> };

/** Elimina días más viejos que KEEP_DAYS (sirve para marcas y para undos). */
function prune<T>(m: { [k: string]: T }): { [k: string]: T } {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cutoffKey = dayKey(cutoff);
  const out: { [k: string]: T } = {};
  for (const [k, v] of Object.entries(m)) if (k >= cutoffKey) out[k] = v;
  return out;
}

// --- Migración de datos guardados con el modelo viejo ----------------------

function migrateReminder(r: any): Reminder {
  return {
    id: String(r.id),
    title: String(r.title ?? ''),
    icon: r.icon ?? '✅',
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
    order: typeof r.order === 'number' ? r.order : 0,
    mode: (r.mode as ReminderMode) ?? 'once',
    target: typeof r.target === 'number' ? r.target : undefined,
  };
}

/** Convierte el mapa de completados: antes era 1 timestamp, ahora una lista. */
function migrateMarks(raw: any): MarksMap {
  const out: MarksMap = {};
  for (const [day, m] of Object.entries(raw ?? {})) {
    const dayOut: { [id: string]: number[] } = {};
    for (const [id, v] of Object.entries((m as any) ?? {})) {
      if (Array.isArray(v)) dayOut[id] = v.filter((n) => typeof n === 'number') as number[];
      else if (typeof v === 'number') dayOut[id] = [v];
    }
    out[day] = dayOut;
  }
  return out;
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload, loaded: true };

    case 'ADD_REMINDER': {
      const maxOrder = state.reminders.reduce((m, r) => Math.max(m, r.order), -1);
      const reminder: Reminder = {
        id: `r-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
        icon: action.icon || '✅',
        title: action.title.trim(),
        createdAt: Date.now(),
        order: maxOrder + 1,
        mode: action.mode,
        target: action.mode === 'count' ? action.target : undefined,
      };
      return { ...state, reminders: [...state.reminders, reminder] };
    }

    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.id
            ? {
                ...r,
                icon: action.icon || r.icon,
                title: action.title.trim(),
                mode: action.mode,
                target: action.mode === 'count' ? action.target : undefined,
              }
            : r
        ),
      };

    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter((r) => r.id !== action.id),
      };

    case 'ADD_MARK': {
      const dayMarks = { ...(state.completions[action.day] ?? {}) };
      dayMarks[action.id] = [...(dayMarks[action.id] ?? []), Date.now()];
      return {
        ...state,
        completions: { ...state.completions, [action.day]: dayMarks },
      };
    }

    case 'REMOVE_MARK': {
      const dayMarks = { ...(state.completions[action.day] ?? {}) };
      const list = [...(dayMarks[action.id] ?? [])];
      if (list.length === 0) return state;
      list.pop(); // quita la última marca
      if (list.length === 0) delete dayMarks[action.id];
      else dayMarks[action.id] = list;
      // Se registra el deshecho en el log (no se pierde el rastro).
      const undoDay = { ...(state.undos[action.day] ?? {}) };
      undoDay[action.id] = [...(undoDay[action.id] ?? []), Date.now()];
      return {
        ...state,
        completions: { ...state.completions, [action.day]: dayMarks },
        undos: { ...state.undos, [action.day]: undoDay },
      };
    }

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    default:
      return state;
  }
}

type StoreValue = {
  state: AppState;
  addReminder: (icon: string, title: string, mode: ReminderMode, target?: number) => void;
  updateReminder: (id: string, icon: string, title: string, mode: ReminderMode, target?: number) => void;
  deleteReminder: (id: string) => void;
  addMark: (id: string, day: string) => void;
  removeMark: (id: string, day: string) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  marksFor: (id: string, day: string) => number[];
  undosFor: (id: string, day: string) => number[];
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as any;
          dispatch({
            type: 'HYDRATE',
            payload: {
              reminders: (parsed.reminders ?? []).map(migrateReminder),
              completions: prune(migrateMarks(parsed.completions)),
              undos: prune(migrateMarks(parsed.undos)),
              settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
            },
          });
        } else {
          dispatch({
            type: 'HYDRATE',
            payload: { reminders: seedReminders(), completions: {}, undos: {}, settings: defaultSettings },
          });
        }
      } catch (e) {
        console.warn('[store] no se pudo hidratar:', e);
        dispatch({
          type: 'HYDRATE',
          payload: { reminders: seedReminders(), completions: {}, undos: {}, settings: defaultSettings },
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const { loaded, ...toSave } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch((e) =>
      console.warn('[store] no se pudo guardar:', e)
    );
  }, [state]);

  const addReminder = useCallback((icon: string, title: string, mode: ReminderMode, target?: number) => {
    dispatch({ type: 'ADD_REMINDER', icon, title, mode, target });
  }, []);
  const updateReminder = useCallback(
    (id: string, icon: string, title: string, mode: ReminderMode, target?: number) => {
      dispatch({ type: 'UPDATE_REMINDER', id, icon, title, mode, target });
    },
    []
  );
  const deleteReminder = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REMINDER', id });
  }, []);
  const addMark = useCallback((id: string, day: string) => {
    dispatch({ type: 'ADD_MARK', id, day });
  }, []);
  const removeMark = useCallback((id: string, day: string) => {
    dispatch({ type: 'REMOVE_MARK', id, day });
  }, []);
  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);
  const marksFor = useCallback(
    (id: string, day: string) => state.completions[day]?.[id] ?? [],
    [state.completions]
  );
  const undosFor = useCallback(
    (id: string, day: string) => state.undos[day]?.[id] ?? [],
    [state.undos]
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      addReminder,
      updateReminder,
      deleteReminder,
      addMark,
      removeMark,
      updateSettings,
      marksFor,
      undosFor,
    }),
    [state, addReminder, updateReminder, deleteReminder, addMark, removeMark, updateSettings, marksFor, undosFor]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
