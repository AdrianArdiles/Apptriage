# Auditoría: flujo "Finalizar Atención" y sistema de datos

Objetivo: revisar la arquitectura completa para que el proceso sea **infalible**, con opción de cambiar el uso de Firebase o mover persistencia a Vercel.

---

## 1. Flujo actual "Finalizar Atención" (paso a paso)

| Orden | Acción | Dónde | Si falla |
|-------|--------|-------|----------|
| 1 | Comprobar `auth.currentUser` | Cliente | Mensaje "Sesión expirada", se aborta. |
| 2 | `getFirestoreInstance()` | Cliente (lib/firebase.ts) | "Firestore no disponible" (solo en SSR; en APK siempre hay `window`). |
| 3 | Construir `entry` (buildReportSummaryData) y sanitizar | Cliente | — |
| 4 | **Escribir en Firestore** `pushAtencionToFirestore()` → colección `atenciones`, `addDoc()` | Cliente → Firebase Firestore | Timeout 40s + 1 reintento. Si falla: alert, `setSyncError(true)`, **se aborta todo** (no se escribe en Realtime, no se genera PDF de esta atención en el flujo). |
| 5 | **Escribir en Realtime DB** `pushAtencionToFirebase()` → `atenciones/{id}` | Cliente → Firebase Realtime | Se hace `catch` y se ignora ("Realtime DB opcional"). |
| 6 | `removeIntervencionFromFirebase` | Cliente → Realtime | No crítico para el guardado. |
| 7 | Generar PDF y compartir/descargar | Cliente (jspdf, Filesystem) | Si falla: toast "Guardado OK. Error al generar PDF"; el usuario ya está "guardado" en Firestore. |
| 8 | `addToHistorialPdf(data, …)` | Cliente → **localStorage** | Solo caché local (máx. 30 entradas). |
| 9 | `onFinalizarSuccess` / nueva atención | Cliente | — |

**Resumen:** El único write que se considera obligatorio para "guardar en central" es **Firestore `atenciones`**. Realtime se trata como opcional. No hay ningún servidor (Vercel) en este flujo; todo es **cliente → Firebase**.

---

## 2. Dónde viven los datos (mapa)

| Dato | Dónde se escribe | Dónde se lee | Observación |
|------|-------------------|---------------|-------------|
| Atención (finalizar) | **Firestore** `atenciones` + **Realtime** `atenciones/{id}` | Historial y Manager exportar leen de **Realtime** (`getAtencionesFromFirebase`). No hay lectura de la colección Firestore `atenciones` en la app. | **Inconsistencia:** la app prioriza Firestore para escribir, pero el historial y la exportación usan solo Realtime. Si Firestore OK y Realtime falla, el usuario ve "guardado" pero la lista de atenciones (historial/exportar) no mostrará esa atención. |
| Historial PDF (lista local) | **localStorage** (`historial-pdf-storage`) | Pantalla Historial (lista + abrir PDF) | Solo dispositivo; se pierde al desinstalar/limpiar datos. |
| Triaje (nivel, recomendación) | **Vercel** `/api/triage` → Prisma/mock en servidor; opcional **Firestore** `triajes` si se usan Cloud Functions | Dashboard pacientes (Vercel `/api/dashboard/pacientes`) | Flujo de triaje ya pasa por backend. |
| Auth / usuarios autorizados | Firebase Auth; Firestore `users`, `authorized_users` | Cliente (auth-context, login) | Depende de red a Firebase. |

Conclusión: para "Finalizar Atención" hay **dos backends** (Firestore y Realtime) y **ningún backend propio** (Vercel) que reciba o persista esa atención.

---

## 3. Puntos de fallo (por qué el "sistema circulatorio" falla)

### 3.1 Red / entorno del cliente (APK o web)

- **Todo el write es cliente → Firebase.** Si en el dispositivo falla DNS (ej. "Unable to resolve host"), red lenta, cortes o firewall que bloquee Firebase, el `addDoc` a Firestore no llega o hace timeout.
- Los "parches" (timeout 40s, 1 reintento) no solucionan: red caída, DNS roto o Firebase inaccesible desde la red del usuario.

### 3.2 Un solo intento en memoria

- El payload de "Finalizar Atención" está solo en memoria (estado React). Si falla el write, **no se guarda en cola local** (IndexedDB/localStorage) para reintentar más tarde. El usuario puede perder el trabajo si cierra la app o si tras el reintento sigue fallando.

### 3.3 Doble write sin transacción

- Se escribe en **Firestore** y en **Realtime**. No hay transacción cruzada. Escenarios:
  - Firestore OK, Realtime falla → en Historial/Exportar no aparece (leen Realtime).
  - Firestore falla (timeout) → no se intenta Realtime en ese flujo como respaldo; directamente se muestra error.

### 3.4 Fuente de verdad repartida

- **Firestore `atenciones`**: escrita en "Finalizar Atención"; **no se lee en la app** para listar atenciones.
- **Realtime `atenciones`**: misma escritura; **sí se lee** en historial y Manager/exportar.
- Cualquier desincronización (uno OK y el otro no) genera datos "perdidos" para el usuario en una de las dos caras.

### 3.5 Sin API de respaldo en Vercel

- No existe un endpoint tipo `POST /api/atenciones` que reciba el payload y lo persista (en BD en Vercel o en Firebase desde servidor). Si Firebase desde el cliente no funciona, no hay plan B por backend.

---

## 4. Resumen de hallazgos (auditoría)

| # | Hallazgo | Severidad |
|---|----------|-----------|
| 1 | Persistencia de "Finalizar Atención" es 100% cliente → Firebase (Firestore + Realtime). Sin backend (Vercel) en el flujo. | Alta |
| 2 | Si la red/DNS del dispositivo falla, no hay forma de que el dato llegue a ningún servidor. | Alta |
| 3 | No hay cola local ni reintentos persistentes; un fallo definitivo implica pérdida del payload en memoria. | Alta |
| 4 | Firestore se usa para escribir; Historial y Exportar leen solo Realtime. Doble fuente de verdad y riesgo de desincronización. | Media |
| 5 | Realtime se considera "opcional" en el código; si falla, el usuario cree que guardó pero la lista no se actualiza. | Media |
| 6 | Timeout + reintento mejoran solo el caso "red lenta pero que acaba respondiendo"; no resuelven red caída o Firebase inaccesible. | Contexto |

---

## 5. Opciones para hacer el proceso infalible (o mucho más robusto)

### Opción A: Backend en Vercel como dueño de "atenciones"

- Añadir **POST /api/atenciones** en Vercel que reciba el mismo payload que hoy se envía a Firestore.
- Persistir en **base de datos en Vercel** (ej. Vercel Postgres, o Supabase/Neon con Prisma). Una sola fuente de verdad.
- Cliente: primero intentar **POST a Vercel**. Si responde 200, considerar "guardado"; opcionalmente seguir escribiendo en Firebase para Manager/Realtime si se mantiene esa parte.
- Ventaja: desde el móvil solo hace falta llegar a Vercel (misma infra que ya usan para triaje). El servidor tiene red estable y puede reintentar o escribir en BD sin depender del estado del cliente.
- Permite más adelante: cola en servidor, reintentos, y un único lugar donde leer atenciones (API GET desde Vercel).

### Opción B: Una sola base en Firebase (simplificar)

- Elegir **una** base: solo Firestore **o** solo Realtime para "atenciones".
- Si solo Firestore: cambiar Historial y Manager/exportar a leer de Firestore `atenciones` (y dejar de usar Realtime para atenciones).
- Si solo Realtime: escribir solo en Realtime en "Finalizar Atención" y seguir leyendo como ahora. Eliminar el write a Firestore en este flujo.
- Reduce desincronización pero **no** soluciona red/DNS del cliente; el write sigue siendo cliente → Firebase.

### Opción C: Cola local + reintentos (sin cambiar backend aún)

- Antes de "Finalizar", guardar el payload en **IndexedDB** (o localStorage) como "pendiente de enviar".
- Flujo: intentar Firestore (y Realtime si se mantiene). Si falla, dejar en cola y mostrar "Guardado localmente; se enviará cuando haya conexión".
- Un worker o la misma app al abrir/reanudar intenta enviar la cola (a Firebase o, si se implementa, a Vercel).
- Mejora la resiliencia frente a cortes puntuales; si Firebase sigue inaccesible desde el cliente, la cola no se vacía hasta que haya camino (por eso A sigue siendo la más robusta a largo plazo).

### Opción D: Híbrido (recomendado para "infalible")

- **Backend en Vercel** (POST /api/atenciones) como destino principal; BD en Vercel (Postgres/Supabase) como fuente de verdad.
- **Cliente:** enviar a Vercel. Si 200 → OK. Si falla (red, 5xx): guardar en **cola local** y reintentar más tarde (y/o al abrir la app).
- Opcional: desde Vercel (o un job) sincronizar a Firebase (Firestore o Realtime) si se quiere mantener integración con Manager/estadísticas en Firebase. Así el cliente no depende de escribir directo a Firebase para que el dato exista.

---

## 6. Conclusión de la auditoría

- El fallo no es solo "timeout" o "mensaje": es **arquitectura**. Todo el guardado de "Finalizar Atención" depende de que el **cliente** hable bien con Firebase; si la red del dispositivo falla, no hay alternativa.
- Para que el proceso sea **infalible** (o el más robusto posible), hace falta:
  - **Un backend que reciba y persista** (Vercel + BD), y/o
  - **Cola local + reintentos** para no perder el dato cuando falle el envío.
- Unificar **una** fuente de verdad para atenciones (Vercel BD o solo Firestore o solo Realtime) evita que "guardado" en un lado no se vea en el otro.

Este documento sirve como base para decidir: mantener solo Firebase con una sola base + cola local (B+C), o dar el paso a Vercel como dueño de atenciones (A o D) para tener un "corazón" de datos estable aunque la red del dispositivo falle.
