// api/keepalive.js
// Cron job: se ejecuta cada 3 días para mantener Supabase activo
// Vercel llama a este endpoint automáticamente según el schedule en vercel.json

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Solo permitir llamadas del cron de Vercel o GET directo
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const isGet = req.method === 'GET';
  if (!isVercelCron && !isGet) return res.status(405).end();

  try {
    const sb = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY
    );

    // Ping simple a Supabase — solo leer una fila del cache
    const { data, error } = await sb
      .from('infoauto_cache')
      .select('key, updated_at')
      .limit(1);

    if (error) throw new Error(error.message);

    console.log('[keepalive] Supabase activo:', new Date().toISOString());

    return res.status(200).json({
      ok: true,
      message: 'Supabase keepalive OK',
      timestamp: new Date().toISOString(),
      cache_rows: data?.length ?? 0
    });

  } catch (err) {
    console.error('[keepalive] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
