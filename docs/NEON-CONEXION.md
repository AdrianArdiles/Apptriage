# Conexión a Neon Postgres

La base de datos del proyecto es **Neon Postgres** (`neon-charcoal-village`). Prisma usa la variable **`DATABASE_URL`**.

## 1. Obtener la URL en Neon

1. Entrá a [Neon](https://console.neon.tech) → tu proyecto → base de datos.
2. En **Quickstart** elegí la pestaña **Prisma** (o **.env.local**).
3. Clic en **Show secret** y copiá la **Connection string** (empieza con `postgresql://...`).

## 2. Local (desarrollo)

En la raíz del proyecto creá o editá **`.env`** y poné:

```env
DATABASE_URL="postgresql://...?sslmode=require"
```

(pegá la URL que copiaste de Neon).

Luego:

```bash
npx prisma generate
npx prisma db push
```

`db push` crea/actualiza las tablas `Consulta` y `Atencion` en Neon.

## 3. Vercel (producción)

1. En Vercel → tu proyecto **apptriage** → **Settings** → **Environment Variables**.
2. Añadí **`DATABASE_URL`** con el **mismo valor** que en Neon (la connection string).
3. Marcá **Production** y **Preview** (y Development si querés).
4. Guardá y volvé a desplegar (Redeploy).

Así el build y la API en Vercel usarán Neon.
