-- Tabla para cachear marcas y modelos (evita llamadas repetidas a Infoauto)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS infoauto_cache (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE infoauto_cache DISABLE ROW LEVEL SECURITY;
