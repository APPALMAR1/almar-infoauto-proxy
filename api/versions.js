// api/versions.js
// GET /api/versions?brand_id=X&grupo=RANGER&year=2022
// Devuelve versiones (CODIAs) de un modelo para un año dado

import { getValidToken } from '../lib/token.js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { brand_id, grupo, year } = req.query;
  if (!brand_id || !grupo) return res.status(400).json({ error: 'brand_id y grupo requeridos' });

  try {
    const token = await getValidToken();

    // Search for models matching brand + group + year
    const params = new URLSearchParams({
      query_string: grupo,
      query_mode: 'similarity',
      prices: 'true',
      page_size: '20',
      page: '1',
    });
    if (year) params.set('price_at', year);

    const iaRes = await fetch(`${IA_BASE}/search/?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!iaRes.ok) throw new Error(`Infoauto versions error: ${iaRes.status}`);
    const data = await iaRes.json();

    const yearNum = year ? parseInt(year) : null;
    const results = (data.results || data || [])
      .filter(m => m.brand?.id === parseInt(brand_id) || !brand_id)
      .filter(m => !yearNum || (m.prices_from <= yearNum && m.prices_to >= yearNum))
      .map(m => ({
        codia: m.codia,
        descripcion: m.description,
        marca: m.brand?.name || '',
        grupo: m.group?.name || '',
        anioDesde: m.prices_from,
        anioHasta: m.prices_to,
      }));

    return res.status(200).json({ ok: true, versions: results });

  } catch (err) {
    console.error('Versions error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
