// api/verif-get.js
// GET /api/verif-get
// Devuelve todas las verificaciones de Infoauto guardadas, como
// { dominio: { precio, descripcion, exacto, verificado_en } }

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sb = supabase();
    const { data, error } = await sb.from('infoauto_verificaciones').select('*');
    if (error) throw new Error(error.message);

    const result = {};
    (data || []).forEach(row => {
      result[row.dominio] = {
        precio: row.precio,
        descripcion: row.descripcion,
        exacto: row.exacto,
        verificado_en: row.verificado_en
      };
    });

    return res.status(200).json({ ok: true, verificaciones: result });

  } catch (err) {
    console.error('verif-get error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
