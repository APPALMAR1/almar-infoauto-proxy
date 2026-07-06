// api/keepalive.js
// Cron job: ping simple a Supabase cada 3 dias para evitar pausa

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.headers['x-vercel-cron'] !== '1')
    return res.status(405).end();

  try {
    // Ping HTTP simple a Supabase — solo verifica que responda
    // No requiere permisos de tabla
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SECRET_KEY;

    const pingRes = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    // Cualquier respuesta (200, 404, etc) significa que Supabase está activo
    const alive = pingRes.status < 500;

    console.log('[keepalive] Supabase status:', pingRes.status, new Date().toISOString());

    return res.status(200).json({
      ok: alive,
      message: alive ? 'Supabase keepalive OK' : 'Supabase no responde',
      supabase_status: pingRes.status,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[keepalive] Error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
