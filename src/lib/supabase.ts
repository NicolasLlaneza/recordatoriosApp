// Cliente de Supabase (backend para login y grupos).
//
// Las credenciales se leen de variables de entorno EXPO_PUBLIC_* (archivo .env
// en la raíz), con respaldo en las constantes de abajo. La "anon key" es
// pública por diseño: la seguridad real la dan las políticas RLS en la base de
// datos, no el secreto de la key — por eso el .env está versionado y no hay
// problema en repetir los valores acá.
//
// El respaldo existe porque hay entornos que NO soportan .env, en particular
// **Expo Snack**, donde `process.env.EXPO_PUBLIC_*` llega vacío y sin esto la
// app quedaría sin backend.
import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Polyfill de crypto.getRandomValues. Es un módulo nativo y puede no estar
// disponible en Snack; solo hace falta para el flujo PKCE, no para
// email + contraseña, así que su ausencia no debe tumbar la app.
try {
  require('react-native-get-random-values');
} catch (e) {
  console.warn('[supabase] polyfill getRandomValues no disponible:', e);
}

const FALLBACK_URL = 'https://jwjelqvfitejbdwhlrnh.supabase.co';
const FALLBACK_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3amVscXZmaXRlamJkd2hscm5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjE0NTEsImV4cCI6MjEwMDE5NzQ1MX0.qrfjjNPuIhVUnBFTkUf3YD1xJmdKnsKqOUAA86o9ut8';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

/** true si hay credenciales utilizables (env o respaldo). */
export const isSupabaseConfigured = url.length > 0 && anonKey.length > 0;

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refrescar el token solo mientras la app está en primer plano.
if (isSupabaseConfigured) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
