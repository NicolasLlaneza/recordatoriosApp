// Cliente de Supabase (backend para login y grupos, Fase 2).
//
// Las credenciales se leen de variables de entorno EXPO_PUBLIC_* (archivo .env
// en la raíz). La "anon key" es pública por diseño: la seguridad real la dan
// las políticas RLS en la base de datos, no el secreto de la key.
import 'react-native-url-polyfill/auto';
import 'react-native-get-random-values';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** true si el .env tiene las credenciales cargadas. */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

// Fallbacks para no romper createClient si aún no se configuró el .env.
export const supabase = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

// Refrescar el token solo mientras la app está en primer plano.
if (isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
