# Vercel Postgres + Atenciones (Opción D)

## Configuración de la base de datos

### En Vercel (producción)

1. En el proyecto de Vercel: **Storage** → **Create Database** → **Postgres** (Vercel Postgres).
2. Conecta el store al proyecto si te lo pide.
3. En **Settings** → **Environment Variables** verás `POSTGRES_URL` (o `DATABASE_URL`) generada por Vercel. Si solo tienes `POSTGRES_URL`, añade en Variables:
   - **Name:** `DATABASE_URL`
   - **Value:** el mismo valor que `POSTGRES_URL` (connection string directa o con `?pgbouncer=true` si usas pooler).
4. Para usar Prisma con Postgres en Vercel, en `prisma/schema.prisma` cambia el datasource a:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
5. En el **Build Command** del proyecto no debe forzarse `DATABASE_URL="file:./prisma/dev.db"`; deja que Vercel inyecte `DATABASE_URL` desde las variables.
6. Tras el primer deploy con Postgres, ejecuta las migraciones desde tu máquina (con `DATABASE_URL` apuntando al mismo Postgres de Vercel) o usa `prisma db push` en un script de build si lo tienes configurado.

### Desarrollo local

- **Con Postgres:** Crea una base en [Neon](https://neon.tech) o [Supabase](https://supabase.com) (gratis) y en `.env` pon:
  ```env
  DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
  ```
  Usa el mismo `provider = "postgresql"` en `schema.prisma`.
- **Con SQLite:** Deja `provider = "sqlite"` y `DATABASE_URL="file:./prisma/dev.db"`. La tabla `Atencion` se crea con `npx prisma db push`.

## Tabla `Atencion`

- **id:** CUID generado por Prisma (fuente de verdad).
- **report_id:** ID del cliente (ej. `pdf-1234567890-abc`) para enlazar con el PDF.
- **created_at:** Fecha/hora de guardado en servidor.
- **nombre_paciente, paciente_id:** Obligatorios (valores por defecto "Sin nombre" / "sin-id" si vienen vacíos).
- **paramedico_nombre, paramedico_email, operador_id, unidad_id, diagnostico_codigo:** Opcionales.
- **data:** JSON con todos los campos del triaje, signos vitales y datos del paciente (objeto `ReportSummaryData`).

## API POST /api/atenciones

- Recibe el mismo JSON que antes se enviaba a Firestore.
- Valida y aplica valores por defecto (no deja null en campos requeridos).
- Guarda en Vercel Postgres (Prisma).
- Responde `200 OK` con `{ "id": "<cuid>", "report_id": "<id cliente o null>" }`.
- **(Opcional)** Sincronizar con Firebase: desde el celular, tras recibir 200, se puede seguir llamando a Firestore/Realtime para mantener el historial viejo; o implementar sync en servidor con Firebase Admin si se desea.
