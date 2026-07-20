# Recordatorios — "¿Me quedé tranquilo?"

App móvil (Android + iOS) para esos chequeos de seguridad de todos los días:
_¿cerré con llave?_, _¿dejé la llave del gas abierta?_, _¿cerré el auto?_.
Creás tus recordatorios y los vas marcando como hechos deslizando un switch;
cada día arranca de cero.

Hecha con **React Native + Expo** (un solo código para Android e iOS).

## Qué hace (Fase 1 — actual)

- **Crear y personalizar recordatorios** — nombre + ícono (🔑 🚪 🔥 🚗 …).
- **Marcar como hecho con un switch deslizable** — se corre a la derecha y se
  pone **verde**, guardando la **hora exacta** ("Hecho a las 23:14").
- **Deshacer** — tocás el recordatorio hecho para volverlo a "pendiente".
- **Reinicio automático a la medianoche** — cada día la lista arranca vacía
  (el historial se conserva internamente).
- **Aviso diario configurable** — una notificación a la hora y con el texto que
  vos elijas (por defecto 22:00, "¿Revisaste todos tus recordatorios?").

Todo se guarda **en el teléfono** (sin cuenta ni servidor).

## Próximas fases

- **Fase 2 — Grupos de convivientes**: crear un grupo y que al otro le llegue
  el aviso cuando hacés una tarea. Requiere backend (previsto: Supabase).
- **Fase 3 — Aviso por ubicación**: detectar cuando te alejás de casa y
  preguntarte "¿Echaste llave?".

## Cómo correrla

Necesitás [Node.js](https://nodejs.org/) y la app **Expo Go** en tu teléfono
(Play Store / App Store).

```bash
npm install       # instalar dependencias (solo la primera vez)
npm start         # levanta el servidor de Expo y muestra un QR
```

Escaneá el QR con Expo Go (Android) o con la cámara (iOS) y la app se abre en
tu teléfono. También: `npm run android` / `npm run ios`.

> **Notificaciones:** las notificaciones locales pueden estar limitadas en
> Expo Go en Android (SDK 53+). Para probar el aviso diario end-to-end conviene
> un _development build_ (`npx expo run:android`). La lógica de la app ya está
> lista; es solo una limitación del entorno de prueba.

## Estructura

```
App.tsx                     Raíz: navegación + providers + notificaciones
src/
  types.ts                  Modelo de datos (Reminder, Settings, ...)
  theme.ts                  Colores y espaciados (tema oscuro)
  navigation.ts             Tipos de navegación
  lib/
    day.ts                  Clave de día y reinicio a medianoche
    notifications.ts        Aviso diario configurable (expo-notifications)
  storage/
    store.tsx               Estado global + persistencia (AsyncStorage)
  components/
    SlideToConfirm.tsx      Switch deslizable (Animated + PanResponder)
    ReminderRow.tsx         Tarjeta de un recordatorio
  screens/
    HomeScreen.tsx          Lista del día
    EditReminderScreen.tsx  Crear / editar / eliminar
    SettingsScreen.tsx      Aviso diario configurable
```

## Decisiones técnicas

- **Sin backend en Fase 1**: los datos viven en el dispositivo vía
  `AsyncStorage`. Simple, sin login, funciona offline.
- **Reinicio a medianoche sin borrar nada**: los completados se guardan por día
  (`YYYY-MM-DD → { reminderId: timestamp }`). Un día nuevo es un mapa vacío, así
  que el "reset" es natural y además queda historial.
- **Switch deslizable con el core de RN** (`Animated` + `PanResponder`) en vez
  de Reanimated, para evitar configuración nativa extra y máxima compatibilidad.
