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
- Fase 2b (grupos de convivientes: crear/unirse, avisar al otro) — pendiente.
- Fase 3 (aviso por ubicación con expo-location) — pendiente.

## Backend / auth

- Credenciales de Supabase en `.env` (EXPO_PUBLIC_*), versionado a propósito
  (anon key es pública; la seguridad la dan las RLS). Nunca commitear
  service_role.
- Google / Apple sign-in: pendientes para cuando se haga el **development
  build** (no funcionan en Expo Go; Apple además requiere cuenta de developer
  paga). Ese build hace falta igual para push notifications reales.
