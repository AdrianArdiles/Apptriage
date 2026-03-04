# Ambulancia Pro — Documentación del proyecto

Este documento describe el sistema desde dos perspectivas: **funcional** (qué hace, para quién, cómo se usa) y **técnica** (cómo está construido, tecnologías, arquitectura).

---

# Parte I — Enfoque funcional

## 1. Qué es el sistema

**Ambulancia Pro** es una aplicación de **gestión de atención prehospitalaria** pensada para:

- **Paramédicos en terreno**: registrar atenciones siguiendo el protocolo XABCDE, capturar signos vitales, enviar triaje a central y generar informes PDF.
- **Centro de mando (Manager)**: monitorizar en tiempo real las unidades activas, ver mapa GPS, enviar mensajes tácticos y consultar estadísticas.
- **Médico / Doctor**: autorizar o rechazar solicitudes de medicación enviadas por las unidades.
- **Exportación**: descargar historial en CSV/Excel y PDFs masivos para análisis o archivo.

La app se usa en **móvil (Android, vía Capacitor)** y en **navegador (versión web)** para gestión y doctor.

---

## 2. Usuarios y roles

| Rol | Acceso | Uso principal |
|-----|--------|----------------|
| **Paramédico** | Login con email/contraseña (Firebase Auth). Tras completar perfil (nombre, apellido, matrícula), accede al formulario de atención. | Registrar atenciones, protocolo XABCDE, enviar triaje, generar y compartir PDF, ver historial local y en la nube. |
| **Manager** | Clave de 4 dígitos (PIN) desde la pantalla de inicio o desde la pantalla del paramédico (“Sistema de Gestión”). Opcional: emails en `NEXT_PUBLIC_MANAGER_EMAILS` redirigen directo al panel. | Monitor en vivo (mapa + lista de unidades), mensajería táctica, estadísticas, personal, doctor, exportación. |
| **Doctor** | Mismo acceso que Manager; dentro del panel hay una pestaña “Doctor”. | Ver solicitudes de medicación pendientes, aprobar o rechazar con alertas sonoras y visuales. |

---

## 3. Flujos principales

### 3.1 Login y perfil

1. Pantalla de inicio: logo, formulario email/contraseña (o “Crear cuenta”).
2. Icono de escudo (esquina superior derecha): abre el modal de **Clave de Gestión** para entrar como Manager.
3. Si el usuario inicia sesión con Firebase y **no tiene perfil**: se muestra formulario de perfil (nombre, apellido, matrícula). Al guardar, los datos se usan como “operador” y en el PDF como “atendido por”.
4. Si tiene perfil y no es email de Manager: redirección a **/atencion** (formulario de atención).
5. Si el email está en la lista de Manager: redirección a **/manager** (Panel de Gestión).

### 3.2 Atención prehospitalaria (paramédico)

1. **Pantalla de atención** (`/atencion`): stepper de 12 pasos (Inicio → X, A, B, C, D, E → Signos vitales → Glasgow → Timestamps → Paciente → Enviar).
2. En cada paso se rellenan datos (hora de inicio, paciente, XABCDE, constantes, Glasgow, eventos con hora, etc.). Los datos se guardan en **localStorage** (ficha clínica) y se sincronizan a **Firebase** (intervenciones en vivo) para que el Manager vea el avance.
3. Al finalizar, se envía el **triaje** a la API (o a la cola si no hay conexión). Se muestra el resultado de gravedad (nivel 1–5) y recomendación.
4. El paramédico puede **“Enviar a central / Finalizar”**: se genera el PDF, se guarda en el dispositivo, se añade al historial local y a Firebase (`atenciones` e `historial_triage`). Luego puede usar **“Nueva atención”** para reiniciar el formulario.
5. **Nueva atención**: limpia ficha, borra la intervención en vivo en Firebase, reinicia el stepper a Inicio.

### 3.3 Historial de PDFs

1. **Pantalla Historial** (`/historial`): lista de informes (local + Firebase). Búsqueda por nombre de paciente.
2. Cada entrada muestra hora, paciente, unidad, operador y nombre de archivo. Acciones:
   - **Ver**: abre el PDF (en móvil con FileOpener; en web en nueva pestaña; si no hay archivo local, se regenera).
   - **Compartir**: vuelve a generar y compartir (Capacitor Share o Web Share API).
   - **Eliminar**: quita del historial local y de Firebase (`atenciones`).

### 3.4 Panel de Gestión (Manager)

Acceso: PIN de gestión o email de Manager. Rutas bajo `/manager`:

- **Monitor en Vivo** (`/manager`): tarjetas de resumen (reportes locales, unidades activas), **mapa GPS** (60 % en escritorio) y **lista de unidades activas** (40 %) con mensajería (presets y mensaje libre). En móvil: mapa arriba, lista abajo.
- **Doctor** (`/manager/doctor`): solicitudes de medicación pendientes; alertas sonoras y visuales; botones Aprobar / Rechazar.
- **Estadísticas** (`/manager/estadisticas`): datos desde Firebase `historial_triage`. Filtros Hoy / Esta semana / Este mes. Gráficos (Recharts): RCP en el período, triaje por nivel (barras y circular), total atenciones.
- **Personal** (`/manager/personal`): listado de operadores y unidades a partir del historial local.
- **Exportar** (`/manager/exportar`): exportar historial a **CSV/Excel** y **descargar todos los PDFs** (uno por atención).

Al salir: **“Cerrar Gestión”** cierra la sesión de Manager y vuelve a la pantalla de inicio.

### 3.5 Dashboard de triaje (opcional)

- **Dashboard** (`/dashboard`): pantalla de “Pacientes en espera” por nivel de gravedad (1–5), con filtros y tabla. Se accede por URL directa o desde un enlace; puede usarse como vista de triaje en pantalla grande.

### 3.6 Solicitudes de medicación (Doctor)

- Las **solicitudes** se crean desde la app (paramédico) llamando a `pushSolicitudMedicacion` (Firebase path `solicitudes_medicacion`).
- En la vista **Doctor** se suscribe en tiempo real a esas solicitudes. Las **pendientes** se muestran como alertas; al aprobar o rechazar se actualiza el estado en Firebase (`resolverSolicitud`).

---

## 4. Resumen de pantallas (rutas)

| Ruta | Quién | Descripción |
|------|--------|-------------|
| `/` | Todos | Inicio: login, registro, acceso gestión (PIN), enlace a historial. Si ya hay perfil, redirección a `/atencion` o `/manager`. |
| `/atencion` | Paramédico | Formulario de atención XABCDE (stepper), envío de triaje, resultado, “Enviar a central”, “Nueva atención”. |
| `/historial` | Paramédico | Últimos PDFs (local + Firebase), Ver / Compartir / Eliminar. |
| `/manager` | Manager | Monitor en vivo: mapa + cuadrillas + mensajería. |
| `/manager/doctor` | Manager/Doctor | Autorización médica: solicitudes de medicación. |
| `/manager/estadisticas` | Manager | Estadísticas con gráficos y filtros por tiempo. |
| `/manager/personal` | Manager | Lista de operadores y unidades. |
| `/manager/exportar` | Manager | Exportar CSV/Excel y descarga masiva de PDFs. |
| `/dashboard` | Manager / directo | Dashboard de pacientes en espera por nivel (tabla + filtros). |

---

# Parte II — Enfoque técnico

## 1. Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 15 (App Router), React 19 |
| Lenguaje | TypeScript 5 |
| Estilos | Tailwind CSS 3, componentes tipo Shadcn (Radix UI) |
| Base de datos / Backend | Firebase Realtime Database, Firebase Auth; Prisma (generado, mock/API local según build) |
| API externa | Triaje: POST a API externa (configurable en `lib/api.ts`) |
| PDF | jsPDF + jspdf-autotable |
| Mapas | Leaflet, react-leaflet |
| Gráficos | Recharts |
| Móvil | Capacitor 8 (Android); `webDir: "out"` (export estático) |
| Build web | Next.js estándar con `BUILD_WEB=1` para Vercel/Netlify/Firebase Hosting |

### Configuración de Google Sign-In (botón "Continuar con Google")

Si el botón de Google falla con *"Se requiere un ID de cliente web"* o el ID aparece vacío:

1. **Firebase Console** → **Authentication** → **Sign-in method** → **Google** → activar y copiar el **ID de cliente web** (termina en `.apps.googleusercontent.com`).
2. Crear o editar **`.env.local`** en la raíz del proyecto y agregar:
   ```bash
   NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID=el_id_que_copiaste.apps.googleusercontent.com
   ```
3. Reiniciar el servidor de desarrollo (`npm run dev`). En build de producción, la variable debe estar definida en el entorno (Vercel, etc.).

El mismo ID debe estar en `capacitor.config.ts` y en `android/app/src/main/res/values/strings.xml` para que Google funcione en la app Android. Ver `.env.example` para referencia.

---

## 2. Estructura del proyecto

```
├── app/
│   ├── layout.tsx              # Layout raíz
│   ├── page.tsx                # Página de inicio (login, perfil, home paramédico)
│   ├── atencion/
│   │   └── page.tsx            # Formulario de atención (ChecklistXABCDE)
│   ├── historial/
│   │   └── page.tsx            # Historial de PDFs (local + Firebase)
│   ├── dashboard/
│   │   └── page.tsx            # Dashboard pacientes en espera por nivel
│   ├── manager/
│   │   ├── layout.tsx          # Layout con pestañas y sesión Manager
│   │   ├── page.tsx            # Monitor en vivo (mapa + lista)
│   │   ├── doctor/
│   │   │   └── page.tsx        # Autorización médica
│   │   ├── estadisticas/
│   │   │   └── page.tsx        # Estadísticas (Recharts)
│   │   ├── personal/
│   │   │   └── page.tsx        # Personal (operadores/unidades)
│   │   └── exportar/
│   │       └── page.tsx        # Exportar CSV y PDFs masivos
│   └── api/                    # Rutas API (triaje, dashboard); ocultas en build Android
├── components/
│   ├── checklist-xabcde.tsx   # Stepper XABCDE y formulario de atención
│   ├── triage-result.tsx      # Resultado de triaje y flujo “Enviar a central”
│   ├── manager-map.tsx         # Mapa Leaflet (unidades activas)
│   ├── logo-ekg.tsx, spinner-medico.tsx, toast-timestamp.tsx, modal-confirmacion-ingreso.tsx
│   └── ui/                     # Button, Card, Dialog, Input, Label, Select, Table, etc.
├── lib/
│   ├── firebase.ts             # Inicialización Firebase (Auth + Realtime Database)
│   ├── firebase-auth.ts        # Login, registro, perfil (users)
│   ├── firebase-intervenciones.ts  # intervenciones/{movilId} (en vivo)
│   ├── firebase-mensajes.ts    # mensajes/{movilId} (mensajería Manager)
│   ├── firebase-historial.ts   # historial_triage (estadísticas Manager)
│   ├── firebase-atenciones.ts  # atenciones (historial de informes)
│   ├── firebase-solicitudes-medicacion.ts  # solicitudes_medicacion (Doctor)
│   ├── auth-context.tsx       # Estado de usuario y perfil
│   ├── operador-storage.ts    # operadorId, unidadId, atendido_por (localStorage)
│   ├── ficha-clinica-storage.ts   # Ficha clínica en curso (localStorage)
│   ├── historial-pdf-storage.ts   # Historial local de PDFs (localStorage)
│   ├── manager-session.ts      # Sesión Manager (sessionStorage)
│   ├── manager-auth.ts         # Validación PIN Manager
│   ├── api.ts                  # Cliente API (triaje, apiUrl)
│   ├── types.ts                # RegistroTriage, NivelGravedad, SignosVitales, etc.
│   ├── report-summary.ts       # ReportSummaryData, texto del informe
│   ├── pdf-export.ts           # Generación PDF (jsPDF)
│   ├── share-pdf.ts           # Compartir/guardar PDF (Capacitor Filesystem + Share)
│   ├── report-queue.ts         # Cola de reportes sin conexión
│   ├── use-gps-sync.ts         # Sincronización GPS a Firebase
│   ├── notification-sound.ts  # Sonido de notificación (Web Audio API)
│   ├── haptics.ts              # Vibración (Capacitor)
│   ├── registro-to-finalize.ts
│   ├── triage-logic.ts / triage-llm.ts
│   ├── mock-db.ts, prisma.ts   # Mock/Prisma (API local)
│   ├── cors.ts, utils.ts, logo-image.ts
│   └── ...
├── scripts/                    # hide-api-for-export, restore-api-after-export, prebuild/postbuild Capacitor
├── android/                    # Proyecto Capacitor Android
├── prisma/
│   └── schema.prisma
├── next.config.mjs             # output: "export" condicionado a BUILD_WEB
├── capacitor.config.ts         # appId, webDir: "out"
├── tailwind.config.ts, postcss.config.mjs, tsconfig.json
└── docs/
    └── DOCUMENTACION.md        # Este archivo
```

---

## 3. Firebase (Realtime Database)

Configuración en `lib/firebase.ts` (apiKey, authDomain, databaseURL, etc.).

| Path | Uso |
|------|-----|
| `intervenciones/{movilId}` | Estado en vivo de cada unidad (paso, paciente, XABCDE, GPS, RCP, etc.). Escritura desde la app de atención; lectura en Manager. Se borra al “Nueva atención” o al finalizar. |
| `mensajes/{movilId}` | Mensajes del Manager a la unidad; acuse de leído. |
| `historial_triage` | Registros de triaje finalizados para estadísticas (Manager). Escritura al enviar triaje; lectura en Estadísticas. |
| `atenciones/{id}` | Atenciones con informe (datos del PDF). Escritura al guardar informe; lectura en Historial y Exportar. |
| `solicitudes_medicacion/{id}` | Solicitudes de medicación; estado pendiente/aprobado/rechazado. Escritura desde app y desde Doctor; lectura en vista Doctor. |

Autenticación: Firebase Auth (email/contraseña). Perfil en `users/{uid}` (nombre, apellido, matrícula, etc.).

---

## 4. API y triaje

- **Cliente**: `lib/api.ts` — `postTriage(payload)` envía a la URL configurada (p. ej. `TRIAGE_API_URL`). Si no hay conexión, el registro se encola en `lib/report-queue.ts` y se reintenta al recuperar conexión.
- **Rutas API** (Next.js):
  - `app/api/triage/route.ts`: recibe triaje, puede usar mock-db/Prisma y devolver nivel/recomendación.
  - `app/api/dashboard/pacientes/route.ts`: lista de pacientes para el dashboard (mock-db/Prisma).

En build para Android y para Firebase Hosting se usa **export estático**; las rutas bajo `app/api` se ocultan con scripts en el build Android. En producción web (Firebase Hosting) y móvil la app puede apuntar a un backend externo para la API de triaje si se configura en `lib/api.ts`.

---

## 5. Build y despliegue

### Android (Capacitor)

1. `npm run build:android`: oculta `app/api`, ejecuta `prisma generate && next build` (export estático a `/out`), restaura `app/api`, ejecuta `cap copy android` y `cap sync android`.
2. `next.config.mjs`: con la variable por defecto **no** se define `BUILD_WEB`, por lo que se usa `output: "export"`.
3. `capacitor.config.ts`: `webDir: "out"`. El proyecto Android en `android/` sirve la app desde esa carpeta.

### Web (Firebase Hosting — raíz única)

1. **Build estático**: `npm run build:hosting` (equivale a `prisma generate && next build`). No se usa `BUILD_WEB=1`, por lo que en `next.config.mjs` se aplica `output: "export"` y la salida es la carpeta **`out`**.
2. **Configuración**: `firebase.json` apunta `hosting.public` a `out`. Las rutas que no coinciden con un archivo estático se reescriben a `/index.html` (SPA), de modo que `/manager`, `/doctor`, etc. funcionan sin 404.
3. **Despliegue**: `npm run deploy:hosting` (build + `firebase deploy --only hosting`). Proyecto por defecto en `.firebaserc`: `ambulanciapro`.
4. **Caché**: Encabezados en `firebase.json`: `/_next/static/**` y assets con hash tienen `max-age=31536000, immutable`; `index.html` tiene `max-age=0, must-revalidate` para que las actualizaciones se vean enseguida en móviles.
5. **API Keys de Firebase**: La configuración en `lib/firebase.ts` es la de producción (proyecto `ambulanciapro`). En [Google Cloud Console](https://console.cloud.google.com/) puedes restringir la API key por dominio (p. ej. `ambulanciapro.web.app`, `ambulanciapro.firebaseapp.com`) para mayor seguridad.

---

## 6. Variables de entorno relevantes

| Variable | Uso |
|----------|-----|
| `NEXT_PUBLIC_MANAGER_EMAILS` | Lista de emails (separados por coma) que redirigen al Panel de Gestión tras login. |
| `BUILD_WEB` | Si es `1`, el build no usa `output: "export"` (build web estándar). |
| Configuración Firebase | En `lib/firebase.ts` (o .env si se externaliza): apiKey, authDomain, databaseURL, etc. |
| API de triaje | En `lib/api.ts`: `API_BASE_URL`, `TRIAGE_API_URL`. |

---

## 7. Almacenamiento local (navegador / Capacitor)

- **localStorage**: ficha clínica en curso, historial de PDFs (lista de entradas con `fileUri` si existe), cola de reportes pendientes, operador/unidad/atendido_por.
- **sessionStorage**: sesión de Manager (`ambulancia-pro-manager-session`) para proteger rutas `/manager/*`.

---

## 8. Sistema de usuarios y control de acceso

- **Inicio de sesión**: Google (popup) o email/contraseña (Firebase Auth). El botón "Continuar con Google" requiere tener **Google** habilitado en Firebase Console → Authentication → Sign-in method.
- **Control estricto**: Antes de permitir el acceso al Dashboard o a la app, el sistema comprueba si el email del usuario está en la colección **Firestore** `authorized_users`.
- **Estructura de cada documento en `authorized_users`**:
  - `email` (string): email en minúsculas (se compara en minúsculas).
  - `rol` (string): `"PARAMEDICO"`, `"DOCTOR"` o `"ADMIN"`.
  - `nombre` (string): nombre completo del profesional.
  - `matricula` (string): matrícula o identificador.
- **Redirección por rol**: Si el usuario está autorizado, `ADMIN` y `DOCTOR` van al Panel de Gestión (`/manager`); `PARAMEDICO` va a Atención (`/atencion`). La variable `NEXT_PUBLIC_MANAGER_EMAILS` sigue pudiendo usarse para incluir más emails como manager.
- **Pantalla de bloqueo**: Si el usuario inicia sesión pero su email **no** está en `authorized_users`, se muestra "Acceso denegado" y se redirige a **`/acceso-pendiente`** (o se muestra el mensaje en la misma pantalla con botón "Volver al inicio").
- **Admin sin colección**: El email `adrianadroco@gmail.com` siempre tiene rol ADMIN y puede entrar aunque la colección `authorized_users` esté vacía (para poder configurar el resto).
- **Crear el primer documento en Firestore**: Una vez logueado como admin, en la **consola del navegador** (F12 → Console) ejecutá:  
  `await window.crearPrimerAdminFirestore()`  
  Eso crea un documento en `authorized_users` con el administrador. Luego podés agregar más usuarios desde la consola de Firestore o desde tu backend.
- **Persistencia**: La sesión de Firebase Auth se mantiene con `onAuthStateChanged`; el paramédico no tiene que volver a iniciar sesión cada vez que abre la app en el móvil (salvo que cierre sesión o expire el token).

---

## 9. Seguridad y buenas prácticas

- Las rutas `/manager/*` comprueban sesión Manager (sessionStorage); si no existe, redirección a `/`.
- Los componentes de Estadísticas y Exportar solo se cargan dentro del panel Manager (no en la app del paramédico).
- Firebase Realtime Database debe configurarse con reglas que restrinjan lectura/escritura según autenticación y rutas (p. ej. `atenciones`, `solicitudes_medicacion`, `intervenciones`, `mensajes`).
- **Firestore**: La colección `authorized_users` debe tener reglas que permitan solo lectura a usuarios autenticados (o solo desde el backend) para no exponer la lista completa.
- No se almacenan contraseñas en el cliente; se usa Firebase Auth. El PIN de Manager está en `lib/manager-auth.ts` (por defecto 1234; en producción conviene externalizarlo o usar un backend).

---

*Documentación generada para el proyecto Ambulancia Pro (Triage Médico). Versión del documento: 1.0.*
