# API en Firebase Cloud Functions

Las rutas que antes corrían en Vercel (`/api/triage` y `/api/dashboard/pacientes`) ahora están desplegadas como **Cloud Functions** en Firebase. El front (Hosting o APK) llama a estas funciones por URL.

## URLs de las funciones

- **Triaje (POST):** `https://us-central1-ambulanciapro.cloudfunctions.net/apiTriage`
- **Dashboard pacientes (GET):** `https://us-central1-ambulanciapro.cloudfunctions.net/apiDashboardPacientes`

El cliente usa estas URLs por defecto (configurable con `NEXT_PUBLIC_API_URL` en el build).

## Despliegue

1. **Configurar OpenAI (opcional pero recomendado)**  
   La clasificación por IA usa `OPENAI_API_KEY`. Sin ella, se usa la lógica de fallback (sin LLM).

   ```bash
   firebase functions:config:set openai.api_key="sk-..."
   ```

   Luego en el código de la función hay que leer la config. En la versión actual la clave se lee de **variables de entorno** al desplegar:

   ```bash
   firebase deploy --only functions
   ```

   Para definir variables de entorno en Cloud Functions (Firebase v2):

   - En la consola: Firebase → Functions → tu función → Editar → Variables de entorno.
   - O con CLI: `firebase functions:secrets:set OPENAI_API_KEY` (recomendado para claves).

2. **Compilar y desplegar**

   Desde la raíz del proyecto:

   ```bash
   npm run build
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions
   ```

   O desde la raíz, el predeploy de `firebase.json` ya ejecuta `npm run build` dentro de `functions`:

   ```bash
   firebase deploy --only functions
   ```

3. **Reglas de Firestore**  
   La colección `triajes` está protegida: solo las Cloud Functions (Admin SDK) escriben; los clientes autenticados pueden leer. Las reglas están en `firestore.rules`. Despliega reglas con:

   ```bash
   firebase deploy --only firestore:rules
   ```

## Variables de entorno / secretos

- **OPENAI_API_KEY**: para que la función de triaje use GPT (clasificación por IA). Sin ella, se usa la lógica de fallback (reglas locales).
  - **Opción A (rápida):** Google Cloud Console → Cloud Functions → `apiTriage` → Editar → Variables de entorno → añadir `OPENAI_API_KEY`.
  - **Opción B (recomendada):** Secret Manager: `firebase functions:secrets:set OPENAI_API_KEY` y en la función usar `runWith({ secrets: ["OPENAI_API_KEY"] })` para que se inyecte en `process.env`.
- En el **front**, `NEXT_PUBLIC_API_URL` en el build permite apuntar a otra base URL si lo necesitás.

## Colección Firestore `triajes`

Cada triaje se guarda como un documento en la colección `triajes`. El dashboard lee esa colección vía la función `apiDashboardPacientes` (ordenado por nivel de gravedad descendente).

## Resumen de cambios frente a Vercel

| Antes (Vercel)              | Ahora (Firebase)                          |
|----------------------------|-------------------------------------------|
| `/api/triage` (POST)       | `apiTriage` → Firestore `triajes`         |
| `/api/dashboard/pacientes` (GET) | `apiDashboardPacientes` → lectura de `triajes` |
| Prisma + SQLite/mock       | Solo Firestore (sin Prisma en functions)  |
| Lista en memoria (mock-db) | Persistencia en Firestore                 |

La app web y la APK siguen usando `lib/api.ts`, que ahora apunta a las Cloud Functions por defecto.
