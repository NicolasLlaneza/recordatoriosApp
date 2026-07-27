@AGENTS.md

# Recordatorios — notas para Claude

App Expo (React Native, **SDK 54**, TypeScript) de chequeos de seguridad diarios.
Ver `README.md` para el detalle funcional y de arquitectura.

## Versión de SDK (importante)

Se fija **SDK 54** a propósito, NO el último (57). Expo Go de las tiendas solo
trae el runtime del último SDK **publicado en stores**, que va por detrás del
último de npm. Un proyecto en SDK 57 (recién salido) da "Incompatible SDK
version" en Expo Go. Regla: apuntar al SDK que soporta la Expo Go instalada
(el usuario tiene SDK 54 en su teléfono). Expo Go muestra su SDK soportado.
Para subir de SDK: `npm pack expo@<ver>`, leer su `bundledNativeModules.json`
y fijar a mano las versiones de react/react-native/expo-*.

## Contexto de entorno

- El proxy de esta sesión **bloquea `api.expo.dev` y `reactnative.directory`**,
  así que `npx expo install` falla al resolver versiones. Para agregar paquetes:
  leer las versiones compatibles de `node_modules/expo/bundledNativeModules.json`
  y usar `npm install <pkg>@<version>`.
- `npm` (registry.npmjs.org) sí funciona directo.

## Verificación

```bash
npx tsc --noEmit                                             # typecheck
npx expo export --platform android --output-dir /tmp/exp     # valida el bundle
```

## Estado

- Fase 1 (app local) — completa.
- Fase 2a (login) — **email + contraseña** vía Supabase. Requiere "Confirm
  email" DESACTIVADO en Supabase (Authentication → Providers → Email). Se
  descartó el login por código de email por la fricción con SMTP/templates.
- Fase 2b (grupos: crear/unirse por código, recordatorios compartidos,
  completados con atribución y tiempo real, aviso al otro) — implementada.
  Requiere correr `supabase/schema.sql` en el SQL Editor de Supabase.
- Fase 3 (aviso por ubicación con expo-location) — pendiente.

## Frecuencia (varias veces por día)

- Personales y grupos soportan modo `once` / `count` (objetivo N) / `free`.
  Personal: store con LISTA de marcas por día (`completions` y `undos` son
  MarksMap: day -> {id: number[]}); actividad = hechos + deshechos.
  Grupos: `group_completions` pasó a un registro por marca (id PK, varias por
  día); `group_reminders` tiene `mode`/`target`; actividad con nombre vía
  MarkList (`by`). Deshacer en grupos borra la última marca PROPIA (RLS).

## Grupos (Fase 2b)

- Esquema + RLS + RPC (create_group / join_group) en `supabase/schema.sql`
  (idempotente). Realtime habilitado en group_completions y group_reminders.
- Código de la app: `src/groups/api.ts` + pantallas Groups / GroupDetail /
  EditGroupReminder. Aviso al otro = notificación local al recibir evento
  realtime de otro usuario (push con app cerrada = pendiente dev build).

## Groundwork monetización (hecho)

Estructura lista para empresas y freemium, sin gatear nada de lo existente
(regla: lo que ya es gratis sigue gratis; solo se cobra lo nuevo).

- `groups.kind` = 'home' | 'business'; `group_members.role` = owner/admin/member.
  Permiso de gestión vía `can_manage_group(g)`: en hogar cualquier miembro
  (comportamiento previo intacto), en negocio solo owner/admin. Espejado en la
  app con `canManageGroup(kind, role)`.
- `profiles.plan` = free/pro/business, protegido por el trigger `protect_plan`.
  **El trigger NO debe ser SECURITY DEFINER**: bajo definer `current_user` es el
  dueño de la función y la protección no aplica (bug encontrado y corregido).
- Punto único de gating en la app: `src/plan/features.ts` (matriz de features +
  FREE_LIMITS) y `usePlan()` de `src/plan/PlanProvider.tsx`. Nada está gateado
  todavía: las features Pro/Empresa aún no existen.

### Probar el SQL localmente

Hay Postgres 16 en el contenedor. Se puede levantar una instancia temporal
(`initdb` + `pg_ctl` como usuario postgres), stubear `auth.users`/`auth.uid()`,
el rol `authenticated` y la publicación `supabase_realtime`, y correr
`schema.sql` contra base vacía y contra el esquema viejo para validar migración
e idempotencia. Vale la pena: así se detectó el bug del trigger.

## Backend / auth

- Credenciales de Supabase en `.env` (EXPO_PUBLIC_*), versionado a propósito
  (anon key es pública; la seguridad la dan las RLS). Nunca commitear
  service_role.
- Google / Apple sign-in: pendientes para cuando se haga el **development
  build** (no funcionan en Expo Go; Apple además requiere cuenta de developer
  paga). Ese build hace falta igual para push notifications reales.
