// Plan del usuario disponible en toda la app. Sin sesión (o sin backend) el
// plan es 'free'. El valor real vive en `profiles.plan` y solo el backend puede
// cambiarlo: el cliente nunca puede darse un plan a sí mismo (trigger en la DB).
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { Feature, FREE_LIMITS, Plan, can as canWithPlan, isValidPlan, planLabel } from './features';

type PlanValue = {
  plan: Plan;
  label: string;
  loading: boolean;
  can: (feature: Feature) => boolean;
  limits: typeof FREE_LIMITS;
  refresh: () => Promise<void>;
};

const PlanContext = createContext<PlanValue | null>(null);

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!isSupabaseConfigured || !session) {
      setPlan('free');
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', session.user.id)
        .maybeSingle();
      setPlan(isValidPlan(data?.plan) ? data.plan : 'free');
    } catch (e) {
      console.warn('[plan] no se pudo leer el plan:', e);
      setPlan('free');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const value = useMemo<PlanValue>(
    () => ({
      plan,
      label: planLabel(plan),
      loading,
      can: (feature: Feature) => canWithPlan(plan, feature),
      limits: FREE_LIMITS,
      refresh: load,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, loading]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan debe usarse dentro de <PlanProvider>');
  return ctx;
}
