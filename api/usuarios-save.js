// api/usuarios-save.js
// POST /api/usuarios-save   body: { id, name, ini, role, col, pin, activo }
// Alta, edición o baja (activo:false) de un usuario. "id" nuevo = alta.

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { id, name, ini, role, col, pin, activo } = req.body || {};
    if (!id || !name || !role || !pin) {
      return res.status(400).json({ ok: false, error: 'id, name, role y pin son requeridos' });
    }
    if (!/^\d{4}$/.test(String(pin))) {
      return res.status(400).json({ ok: false, error: 'El PIN debe ser de 4 dígitos' });
    }
    if (!['vendedor','supervisor','gerencia','master'].includes(role)) {
      return res.status(400).json({ ok: false, error: 'Rol inválido' });
    }

    const sb = supabase();

    // Evitar PIN duplicado entre usuarios activos distintos
    const { data: existentes } = await sb.from('app_usuarios').select('id,name,pin').eq('activo', true);
    const choque = (existentes || []).find(u => u.id !== id && u.pin === String(pin));
    if (choque) {
      return res.status(409).json({ ok: false, error: `Ese PIN ya lo usa ${choque.name}` });
    }

    const { error } = await sb.from('app_usuarios').upsert({
      id, name, ini: ini || name.slice(0,2).toUpperCase(), role,
      col: col || '#0069b4', pin: String(pin), activo: activo !== false
    });
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('usuarios-save error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
