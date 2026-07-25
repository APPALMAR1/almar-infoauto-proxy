// api/verif-save.js
// POST /api/verif-save   body: { dominio, precio, descripcion, exacto }
// Guarda (upsert) el precio de Infoauto ya verificado para un vehículo del
// stock consignado, así no hace falta re-consultar la API en cada sesión.

import { createClient } from '@supabase/supabase-js';

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { dominio, precio, descripcion, exacto } = req.body || {};
    if (!dominio || !precio) {
      return res.status(400).json({ ok: false, error: 'dominio y precio son requeridos' });
    }

    const sb = supabase();
    const { error } = await sb.from('infoauto_verificaciones').upsert({
      dominio,
      precio: Math.round(Number(precio)),
      descripcion: descripcion || null,
      exacto: exacto !== false,
      verificado_en: new Date().toISOString()
    });

    if (error) throw new Error(error.message);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('verif-save error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
