// api/keepalive.js
// Cron job: se ejecuta cada 3 días para mantener Supabase activo

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const isGet = req.method === 'GET';
  if (!isGet && req.headers['x-vercel-cron'] !== '1') return res.status(405).end();

  try {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // Ping usando rpc simple — solo verifica conexión sin necesitar permisos de tabla
    const { error } = await sb.rpc('now');

    // Si falla rpc, intentar con una query básica
    if (error) {
      const { error: err2 } = await sb
        .from('infoauto_token')
        .select('id')
        .limit(1);
      if (err2) throw new Error(err2.message);
    }

    console.log('[keepalive] Supabase activo:', new Date().toISOString());
    return res.status(200).json({
      ok: true,
      message: 'Supabase keepalive OK',
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[keepalive] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
