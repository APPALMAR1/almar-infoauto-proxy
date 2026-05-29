-- Ejecutar en Supabase → SQL Editor → New query
-- Tabla para cachear el token JWT de Infoauto

CREATE TABLE IF NOT EXISTS infoauto_token (
  id                 INTEGER PRIMARY KEY DEFAULT 1,
  access_token       TEXT NOT NULL,
  refresh_token      TEXT NOT NULL,
  expires_at         TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ NOT NULL,
  updated_at         TIMESTAMPTZ NOT NULL
);

-- Restricción: solo puede existir un registro (el token activo)
ALTER TABLE infoauto_token 
  ADD CONSTRAINT single_row CHECK (id = 1);

-- Deshabilitar RLS para esta tabla (solo accede el proxy con secret key)
ALTER TABLE infoauto_token DISABLE ROW LEVEL SECURITY;
