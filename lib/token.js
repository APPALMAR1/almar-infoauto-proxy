// lib/token.js
// Gestión del token JWT de Infoauto usando Supabase como cache
// El token dura 1 hora — lo renovamos automáticamente antes de que venza

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_SECRET  = process.env.SUPABASE_SECRET_KEY;
const IA_USER          = process.env.INFOAUTO_USER;
const IA_PASS          = process.env.INFOAUTO_PASS;
const IA_AUTH_URL      = 'https://api.infoauto.com.ar/cars/auth/login';
const IA_REFRESH_URL   = 'https://api.infoauto.com.ar/cars/auth/refresh';
const TOKEN_TABLE      = 'infoauto_token';

function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_SECRET);
}

// Obtener token válido (desde Supabase o renovando)
export async function getValidToken() {
  const sb = supabase();

  // 1. Buscar token guardado
  const { data } = await sb
    .from(TOKEN_TABLE)
    .select('*')
    .eq('id', 1)
    .single();

  if (data) {
    const expiresAt = new Date(data.expires_at).getTime();
    const now       = Date.now();
    const margin    = 5 * 60 * 1000; // 5 minutos de margen

    // Si el access token sigue vigente, usarlo
    if (expiresAt - now > margin) {
      return data.access_token;
    }

    // Si vencio el access token pero el refresh sigue vigente, renovar
    const refreshExpiresAt = new Date(data.refresh_expires_at).getTime();
    if (refreshExpiresAt - now > margin) {
      return await refreshToken(data.refresh_token);
    }
  }

  // Si no hay token o ambos vencieron, hacer login completo
  return await loginFresh();
}

// Login completo con usuario y contraseña
async function loginFresh() {
  const creds = Buffer.from(`${IA_USER}:${IA_PASS}`).toString('base64');
  const res = await fetch(IA_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${creds}`
    }
  });

  if (!res.ok) throw new Error(`Infoauto login failed: ${res.status}`);
  const json = await res.json();
  await saveToken(json);
  return json.access_token;
}

// Renovar usando refresh token
async function refreshToken(refreshTk) {
  const res = await fetch(IA_REFRESH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${refreshTk}`
    }
  });

  if (!res.ok) return await loginFresh(); // Si falla el refresh, login completo
  const json = await res.json();
  await saveToken(json);
  return json.access_token;
}

// Guardar token en Supabase
async function saveToken(json) {
  const sb = supabase();
  const now = Date.now();

  const record = {
    id: 1,
    access_token:       json.access_token,
    refresh_token:      json.refresh_token,
    expires_at:         new Date(now + 55 * 60 * 1000).toISOString(), // 55 min
    refresh_expires_at: new Date(now + 23 * 60 * 60 * 1000).toISOString(), // 23 hs
    updated_at:         new Date(now).toISOString()
  };

  await sb.from(TOKEN_TABLE).upsert(record);
}
