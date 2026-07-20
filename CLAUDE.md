@AGENTS.md

# Recordatorios — notas para Claude

App Expo (React Native, **SDK 56**, TypeScript) de chequeos de seguridad diarios.
Ver `README.md` para el detalle funcional y de arquitectura.

## Versión de SDK (importante)

Se fija **SDK 56** a propósito, NO el último (57). Expo Go de las tiendas solo
trae el runtime del último SDK **publicado en stores**, que va por detrás del
último de npm. Un proyecto en SDK 57 (recién salido) da "Incompatible SDK
version" en Expo Go. Regla: apuntar al SDK que soporta la Expo Go de la tienda.
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
- Fase 2 (grupos de convivientes, backend Supabase) — pendiente.
- Fase 3 (aviso por ubicación con expo-location) — pendiente.
