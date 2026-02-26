# Triage Médico

Aplicación de triaje médico con Next.js, Tailwind CSS y componentes tipo Shadcn UI.

## Requisitos

- Node.js 18+
- npm, pnpm o yarn

## Instalación

```bash
npm install
```

Copia `.env.example` a `.env` y, si usas la BD local, deja `DATABASE_URL="file:./prisma/dev.db"`. Luego crea las tablas:

```bash
npm run db:push
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura

- **`app/`** — App Router: página principal y API de triaje (`/api/triage`).
- **`components/`** — Formulario de síntomas, resultado de triaje y componentes UI (Shadcn-style).
- **`lib/`** — Tipos TypeScript, mock de base de datos, lógica de evaluación de gravedad y recomendación.

## Base de datos (Prisma)

La tabla **Consultas** persiste cada triaje:

| Campo             | Tipo     | Descripción                          |
|-------------------|----------|--------------------------------------|
| `id`              | String   | ID único (cuid)                      |
| `nombre_paciente` | String   | Nombre o ID del paciente             |
| `dni`             | String?  | DNI (opcional)                       |
| `sintomas`        | String   | Descripción de síntomas             |
| `gravedad_ia`     | Int      | 1 (no urgente) a 5 (resucitación)    |
| `color_alerta`   | String   | green, yellow, orange, red, darkred  |
| `timestamp`       | DateTime | Fecha y hora del registro            |

Por defecto se usa **SQLite** (`file:./prisma/dev.db`). Para **Supabase**, en `prisma/schema.prisma` cambia `provider` a `"postgresql"` y en `.env` pon la connection string de Supabase (Settings > Database).

## Aviso legal

El cumplimiento HIPAA indicado en el proyecto es **simulado** y con fines educativos. Cada resultado de triaje muestra un disclaimer indicando que no sustituye el consejo médico profesional.
