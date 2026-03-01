# Build APK Android (sin caché antigua)

- **next.config.mjs**: `output: 'export'` solo se activa con `IS_CAPACITOR=true`. Incluye `images: { unoptimized: true }` para export estático. En Vercel no se define esa variable, así que las API Routes siguen funcionando.
- La carpeta **`out`** (Capacitor `webDir`) solo se genera con `npm run build:android` (o `build:android:clean`). Ese script hace prebuild (stub de `/api/triage` para permitir export), build con `IS_CAPACITOR=true`, postbuild (restaura la ruta) y `npx cap sync`. No ejecutes `npx cap copy` sin haber corrido antes `npm run build:android`.

Para que la APK envíe **datos reales del formulario** y no quede atrapada en caché con código viejo:

## 1. Desinstalar la app anterior del celular

En el dispositivo Android: **Ajustes → Aplicaciones → TriajeMedico → Desinstalar**.

## 2. Build limpio (recomendado la primera vez)

```bash
npm install
npm run build:android:clean
```

Esto borra `out/` y `.next/`, hace un build nuevo con `IS_CAPACITOR=true` y sincroniza con `android/`.

## 3. Build normal (siguientes veces)

```bash
npm run build:android
```

Equivalente a `IS_CAPACITOR=true npm run build && npx cap sync`.

## 4. Abrir en Android Studio y generar APK

```bash
npx cap open android
```

En Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. Instala la APK en el dispositivo.

## CORS

La API en `/api/triage` ya envía `Access-Control-Allow-Origin: *` en todas las respuestas (POST y OPTIONS) para que el celular pueda llamar sin bloqueos.

## Si sigue apareciendo 400

- En los logs de Vercel revisa **"=== TEXTO RECIBIDO ==="** para ver el body que llega.
- En la app, el mensaje de error muestra **"Recibido:"** con el objeto que devolvió el servidor.
- Asegúrate de haber ejecutado **build:android:clean**, desinstalado la app e instalado la nueva APK.
