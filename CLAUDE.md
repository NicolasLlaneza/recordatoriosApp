@AGENTS.md

# Recordatorios — notas para Claude

App Expo (React Native, SDK 57, TypeScript) de chequeos de seguridad diarios.
Ver `README.md` para el detalle funcional y de arquitectura.

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
