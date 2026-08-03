// api/usuarios-list.js
// GET /api/usuarios-list
// Devuelve todos los usuarios (activos e inactivos) para el login y el
// panel de administración.

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sb = supabase();
    const { data, error } = await sb.from('app_usuarios').select('*').order('creado_en');
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true, usuarios: data || [] });
  } catch (err) {
    console.error('usuarios-list error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
