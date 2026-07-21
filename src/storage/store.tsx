// Estado global + persistencia local (AsyncStorage). Sin backend ni login:
// todo vive en el dispositivo. Los grupos de convivientes (Fase 2) sumarán
// sincronización más adelante.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, CompletionMap, Reminder, Settings } from '../types';
import { dayKey } from '../lib/day';

const STORAGE_KEY = 'recordatorios.state.v1';
const KEEP_DAYS = 60; // podado del historial de completados

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
  | { type: 'ADD_REMINDER'; icon: string; title: string }
  | { type: 'UPDATE_REMINDER'; id: string; icon: string; title: string }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'SET_DONE'; id: string; day: string; done: boolean }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<Settings> };

/** Elimina días de completados más viejos que KEEP_DAYS. */
function prune(completions: CompletionMap): CompletionMap {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - KEEP_DAYS);
  const cutoffKey = dayKey(cutoff);
  const out: CompletionMap = {};
  for (const [k, v] of Object.entries(completions)) {
    if (k >= cutoffKey) out[k] = v;
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
      };
      return { ...state, reminders: [...state.reminders, reminder] };
    }

    case 'UPDATE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.map((r) =>
          r.id === action.id
            ? { ...r, icon: action.icon || r.icon, title: action.title.trim() }
            : r
        ),
      };

    case 'DELETE_REMINDER':
      return {
        ...state,
        reminders: state.reminders.filter((r) => r.id !== action.id),
      };

    case 'SET_DONE': {
      const dayMap = { ...(state.completions[action.day] ?? {}) };
      const undoMap = { ...(state.undos[action.day] ?? {}) };
      if (action.done) {
        dayMap[action.id] = Date.now();
        delete undoMap[action.id]; // al re-marcar, se limpia la nota de deshecho
      } else {
        delete dayMap[action.id];
        undoMap[action.id] = Date.now(); // se registra la hora del deshecho
      }
      return {
        ...state,
        completions: { ...state.completions, [action.day]: dayMap },
        undos: { ...state.undos, [action.day]: undoMap },
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
  addReminder: (icon: string, title: string) => void;
  updateReminder: (id: string, icon: string, title: string) => void;
  deleteReminder: (id: string) => void;
  setDone: (id: string, day: string, done: boolean) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  doneAt: (id: string, day: string) => number | undefined;
  undoneAt: (id: string, day: string) => number | undefined;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Hidratar al iniciar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Omit<AppState, 'loaded'>>;
          dispatch({
            type: 'HYDRATE',
            payload: {
              reminders: parsed.reminders ?? [],
              completions: prune(parsed.completions ?? {}),
              undos: prune(parsed.undos ?? {}),
              settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
            },
          });
        } else {
          dispatch({
            type: 'HYDRATE',
            payload: {
              reminders: seedReminders(),
              completions: {},
              undos: {},
              settings: defaultSettings,
            },
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

  // Persistir en cada cambio (una vez hidratado).
  useEffect(() => {
    if (!state.loaded) return;
    const { loaded, ...toSave } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch((e) =>
      console.warn('[store] no se pudo guardar:', e)
    );
  }, [state]);

  const addReminder = useCallback((icon: string, title: string) => {
    dispatch({ type: 'ADD_REMINDER', icon, title });
  }, []);
  const updateReminder = useCallback((id: string, icon: string, title: string) => {
    dispatch({ type: 'UPDATE_REMINDER', id, icon, title });
  }, []);
  const deleteReminder = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REMINDER', id });
  }, []);
  const setDone = useCallback((id: string, day: string, done: boolean) => {
    dispatch({ type: 'SET_DONE', id, day, done });
  }, []);
  const updateSettings = useCallback((settings: Partial<Settings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);
  const doneAt = useCallback(
    (id: string, day: string) => state.completions[day]?.[id],
    [state.completions]
  );
  const undoneAt = useCallback(
    (id: string, day: string) => state.undos[day]?.[id],
    [state.undos]
  );

  const value = useMemo<StoreValue>(
    () => ({
      state,
      addReminder,
      updateReminder,
      deleteReminder,
      setDone,
      updateSettings,
      doneAt,
      undoneAt,
    }),
    [state, addReminder, updateReminder, deleteReminder, setDone, updateSettings, doneAt, undoneAt]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <StoreProvider>');
  return ctx;
}
