# Configuración Firebase — Ambulancia Pro

## Lo que ya está verificado en el proyecto

- **Package name**: `com.adrian.triaje` en `android/app/build.gradle` coincide con la app "Ambulancia Pro APK" en Firebase.
- **google-services.json**: Existe en `android/app/google-services.json` con `project_id: ambulanciapro` y el mismo package.
- **Firebase (web)**: `lib/firebase.ts` tiene `projectId`, `authDomain`, `databaseURL` y `appId` correctos.
- **Reglas (según tus capturas)**:
  - **Firestore**: `allow read, write: if request.auth != null` → cualquier usuario autenticado puede leer/escribir. Suficiente para operar.
  - **Realtime Database**: `.read` y `.write` con `auth != null` → mismo criterio.

Con esto, **no falta ninguna configuración en el código** para que la base de datos (Firestore y Realtime) funcione para usuarios logueados. Los errores que teníamos (undefined en `sintomas_texto`, crash en signOut, documento en `users`) se resolvieron en el código.

---

## Lo que solo vos podés hacer en la consola de Firebase

### 1. Huellas SHA-1 (importante para Google Sign-In en Android)

Si el **inicio de sesión con Google** o el **cierre de sesión** fallan o crashean en el APK, suele ser porque la **huella SHA-1** del keystore con el que compilás no está registrada en Firebase.

En la consola: **Configuración del proyecto → Apps para Android → Ambulancia Pro APK → Agregar huella digital**.

- **Debug (desarrollo)**  
  En PowerShell (Windows), desde cualquier carpeta:

  ```powershell
  keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
  ```

  Copiá la línea **SHA1** (ej. `A1:26:7C:F2:...`) y agregala en Firebase.

- **Release**  
  Si firmás con un keystore propio, repetí el comando con ese keystore y alias y agregá también esa SHA-1.

- **Google Play App Signing**  
  Si publicás en Play y usás firma gestionada por Google, en Play Console → Tu app → Configuración → Integridad de la app (o App signing) vas a ver dos certificados. Agregá en Firebase las SHA-1 de **clave de carga** y de **clave de firma de la app**.

Mientras la SHA-1 del build que estás usando no esté en Firebase, Google Sign-In puede fallar o dar NPE en nativo. **Esto solo se configura en la consola**, no desde el código.

### 2. Reglas más estrictas (opcional)

Hoy tenés “cualquier usuario autenticado puede leer/escribir todo”. Para producción podés restringir después, por ejemplo:

- **Firestore**: que cada usuario solo pueda escribir su propio documento en `users/{uid}` y que `atenciones` solo sea escritura para autenticados.
- **Realtime Database**: limitar por path (ej. `users/$uid`) si usás rutas por usuario.

No es obligatorio para que la app opere; es una mejora de seguridad para más adelante.

### 3. google-services.json actualizado

Si en Firebase agregás o cambiás una app Android, o las SHA-1, volvé a descargar **google-services.json** desde la misma pantalla de la app Android y reemplazá el archivo en `android/app/google-services.json`.

---

## Resumen

| Qué | ¿Quién lo hace? |
|-----|------------------|
| Package, `google-services.json`, reglas actuales, código (sanitización, signOut, users) | Ya está listo en el repo |
| Agregar SHA-1 (debug/release/Play) en Firebase | **Vos** en la consola |
| Descargar de nuevo `google-services.json` si cambiaste algo en la app Android | **Vos** desde la consola |
| Endurecer reglas (opcional) | **Vos** cuando quieras |

No hay ninguna configuración adicional que se pueda “ejecutar” desde el proyecto para la base de datos: con las reglas que mostraste, **si el usuario está autenticado**, Firestore y Realtime Database están listos para operar. Lo único crítico que a veces falta es **registrar todas las SHA-1** que usás para compilar el APK.
