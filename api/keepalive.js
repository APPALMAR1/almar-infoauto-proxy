// api/keepalive.js
// Cron job diario: hace un SELECT real contra una tabla (no solo pega al root
// de la API) para que cuente como actividad de base de datos y Supabase no
// pause el proyecto por inactividad.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.headers['x-vercel-cron'] !== '1')
    return res.status(405).end();

  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

    const { data, error } = await sb
      .from('infoauto_token')
      .select('id')
      .limit(1);

    if (error) throw new Error(error.message);

    console.log('[keepalive] Query OK,', new Date().toISOString());

    return res.status(200).json({
      ok: true,
      message: 'Supabase keepalive OK (query real ejecutada)',
      rows: data?.length ?? 0,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[keepalive] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
