// api/health.js
// Endpoint: GET /api/health
// Verifica que el proxy esté funcionando y el token de Infoauto sea válido

import { getValidToken } from '../lib/token.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getValidToken();
    const preview = token ? token.substring(0, 20) + '...' : 'null';

    return res.status(200).json({
      ok:        true,
      status:    'Proxy ALMAR-Infoauto operativo',
      token:     preview,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      ok:    false,
      error: err.message
    });
  }
}
