// Estado de sesión (login con email + contraseña).
//
// Requiere que en Supabase esté DESACTIVADO "Confirm email" (Authentication →
// Providers → Email), así el registro deja la sesión abierta sin mandar mail.
//
// Google / Apple: se agregan más adelante con un development build (no
// funcionan en Expo Go). Ver roadmap en README.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

type Result = { error?: string };

type AuthValue = {
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (email: string, password: string) => Promise<Result>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

/** Traduce los mensajes de error más comunes de Supabase. */
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ese email ya tiene cuenta. Probá iniciar sesión.';
  if (m.includes('password') && m.includes('6')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (m.includes('unable to validate email') || m.includes('invalid email'))
    return 'El email no es válido.';
  if (m.includes('email logins are disabled')) return 'El login por email está deshabilitado en Supabase.';
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<Result> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return error ? { error: translate(error.message) } : {};
  };

  const signUp = async (email: string, password: string): Promise<Result> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) return { error: translate(error.message) };
    // Si "Confirm email" está activo, no hay sesión hasta confirmar el mail.
    if (!data.session) {
      return {
        error:
          'Falta confirmar el email. En Supabase, desactivá "Confirm email" (Authentication → Providers → Email) para entrar directo.',
      };
    }
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      loading,
      session,
      email: session?.user?.email ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
