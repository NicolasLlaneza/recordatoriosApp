# Rama `snack`

Esta rama es **exactamente `main`, pero sin los assets binarios** (los PNG de
íconos) y con `app.json` sin las referencias a esos archivos.

## Para qué

Existe para poder importar el proyecto en [Expo Snack](https://snack.expo.dev)
y abrir la app en el teléfono **sin tener que levantar el servidor de desarrollo
en la compu**. El importador de Snack falla al subir archivos binarios
(`Failed to upload file asset`), y los íconos no aportan nada a la vista previa.

## Cómo importar

1. Entrar a <https://snack.expo.dev>.
2. En el panel de la izquierda, los tres puntos (⋯) al lado de **Project** →
   **Import git repository**.
3. Pegar:

   ```
   https://github.com/NicolasLlaneza/recordatoriosApp/tree/snack
   ```

4. Elegir SDK **54** si lo pregunta (Snack soporta 50–55; la app está fijada a 54
   porque es el que soporta la app Expo Go de las tiendas).
5. **Save** para que el Snack quede publicado con una URL propia. Desde ese
   momento se puede abrir en el teléfono cuando se quiera, sin la compu.
6. Pestaña **My Device** → escanear el QR con la cámara (iOS) o Expo Go
   (Android).

## Limitaciones conocidas

- **Variables de entorno**: Snack no soporta `.env` / `process.env.EXPO_PUBLIC_*`.
  Por eso `src/lib/supabase.ts` tiene las credenciales como constantes de
  respaldo. Son públicas por diseño (la seguridad la dan las políticas RLS).
- **Notificaciones**: limitadas dentro de Snack y de Expo Go.
- No es un reemplazo de una app instalada: cada vez se descarga el bundle.

## Mantenerla al día

La rama no se actualiza sola. Después de cambios en `main`:

```bash
git checkout -B snack main
git rm -r --cached assets && rm -rf assets   # sacar los binarios
# quitar de app.json: icon, adaptiveIcon, web.favicon
git commit -am "chore(snack): sincronizar con main"
git push -f origin snack
```

Después, en Snack, volver a importar para tomar los cambios.
