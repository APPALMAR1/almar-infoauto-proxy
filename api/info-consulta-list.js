// api/info-consulta-list.js
// GET /api/info-consulta-list?usuario_id=xxx&limit=30
import { createClient } from '@supabase/supabase-js';
function supabase(){ return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY); }

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { usuario_id } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    if (!usuario_id) return res.status(400).json({ ok:false, error:'usuario_id requerido' });
    const sb = supabase();
    const { data, error } = await sb.from('info_consultas')
      .select('*').eq('usuario_id', usuario_id)
      .order('consultado_en', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message);
    return res.status(200).json({ ok:true, consultas: data || [] });
  } catch (err) {
    console.error('info-consulta-list error:', err.message);
    return res.status(500).json({ ok:false, error: err.message });
  }
}
