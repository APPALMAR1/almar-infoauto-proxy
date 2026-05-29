# ALMAR Infoauto Proxy

Proxy serverless para la API de Infoauto. Corre en Vercel y usa Supabase para cachear el token JWT.

## Endpoints

| Endpoint | Descripción |
|---|---|
| `GET /api/health` | Estado del proxy y token |
| `GET /api/search?q=peugeot+208&year=2022` | Busca modelos en Infoauto |
| `GET /api/price?codia=12345&year=2022` | Precio usado de un modelo |

## Setup en Vercel

### 1. Variables de entorno (Settings → Environment Variables)

```
INFOAUTO_USER       = (usuario de Infoauto corporativo)
INFOAUTO_PASS       = (contraseña de Infoauto corporativo)
SUPABASE_URL        = (Project URL de Supabase)
SUPABASE_SECRET_KEY = (Secret key de Supabase)
```

### 2. Tabla en Supabase

Ejecutar en Supabase → SQL Editor:

```sql
CREATE TABLE infoauto_token (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  access_token    TEXT NOT NULL,
  refresh_token   TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL
);

-- Solo puede haber un registro (el token activo)
ALTER TABLE infoauto_token ADD CONSTRAINT single_row CHECK (id = 1);
```

### 3. Deploy

```bash
# Conectar repo en Vercel → Import → Deploy
# Vercel detecta automáticamente las API routes
```

## Arquitectura

```
LAB Cotizador (Cloudflare)
    ↓ fetch /api/search o /api/price
Vercel Serverless Function
    ↓ lee/escribe token
Supabase (cache JWT)
    ↓ si token vencido
API Infoauto (login/refresh)
```

## Notas importantes

- Los precios de Infoauto vienen en **miles de pesos** → el proxy los multiplica por 1000
- El token se renueva automáticamente 5 minutos antes de vencer
- No generar un token nuevo por cada consulta (Infoauto puede bloquear)
