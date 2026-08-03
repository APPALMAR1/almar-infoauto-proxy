// api/info-consulta-save.js
// POST /api/info-consulta-save
// body: { usuario_id, usuario_nom, marca, modelo, anio, precio }
import { createClient } from '@supabase/supabase-js';
function supabase(){ return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY); }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { usuario_id, usuario_nom, marca, modelo, anio, precio } = req.body || {};
    if (!usuario_id || !marca || !precio) {
      return res.status(400).json({ ok:false, error:'usuario_id, marca y precio son requeridos' });
    }
    const sb = supabase();
    const { error } = await sb.from('info_consultas').insert({
      usuario_id, usuario_nom: usuario_nom || '', marca, modelo: modelo || '',
      anio: anio || null, precio: Math.round(Number(precio))
    });
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok:true });
  } catch (err) {
    console.error('info-consulta-save error:', err.message);
    return res.status(500).json({ ok:false, error: err.message });
  }
}
