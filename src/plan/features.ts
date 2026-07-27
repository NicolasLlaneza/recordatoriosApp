// Punto ÚNICO donde vive qué habilita cada plan.
//
// Regla de oro: lo que hoy ya es gratis, sigue gratis para siempre. Acá solo se
// declaran features NUEVAS (a construir) y límites que aún no están aplicados.
// Todo gating de la app debe pasar por `can()` / `FREE_LIMITS`: si mañana cambia
// el empaquetado, se toca este archivo y nada más.

export type Plan = 'free' | 'pro' | 'business';

export type Feature =
  // --- Pro (personal) ---
  | 'stats'                       // estadísticas, rachas, calendario del mes
  | 'full_history'                // historial completo (free: últimos 30 días)
  | 'cloud_sync'                  // respaldar/sincronizar recordatorios personales
  | 'per_reminder_notifications'  // horarios propios por recordatorio
  | 'location_alerts'             // aviso al alejarse de casa
  | 'unlimited_groups'            // más de un grupo
  | 'custom_appearance'           // temas e íconos
  // --- Business (empresas) ---
  | 'business_groups'             // crear grupos de tipo negocio
  | 'roles'                       // encargado arma la lista, empleado marca
  | 'reports_export'              // reportes por período + PDF/Excel
  | 'time_windows'                // ventana horaria y marcado tardío
  | 'photo_evidence'              // foto como evidencia de la marca
  | 'multi_location';             // varios locales en una cuenta

/** Qué planes habilitan cada feature. */
const MATRIX: Record<Feature, Plan[]> = {
  stats: ['pro', 'business'],
  full_history: ['pro', 'business'],
  cloud_sync: ['pro', 'business'],
  per_reminder_notifications: ['pro', 'business'],
  location_alerts: ['pro', 'business'],
  unlimited_groups: ['pro', 'business'],
  custom_appearance: ['pro', 'business'],

  business_groups: ['business'],
  roles: ['business'],
  reports_export: ['business'],
  time_windows: ['business'],
  photo_evidence: ['business'],
  multi_location: ['business'],
};

/** Límites del plan gratuito. Aún NO aplicados: son el contrato a futuro. */
export const FREE_LIMITS = {
  groups: 1,
  membersPerGroup: 3,
  historyDays: 30,
};

export function can(plan: Plan, feature: Feature): boolean {
  return MATRIX[feature].includes(plan);
}

export function planLabel(plan: Plan): string {
  switch (plan) {
    case 'pro':
      return 'Pro';
    case 'business':
      return 'Empresa';
    default:
      return 'Gratis';
  }
}

export function isValidPlan(value: unknown): value is Plan {
  return value === 'free' || value === 'pro' || value === 'business';
}
