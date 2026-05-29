// api/search.js
// Endpoint: GET /api/search?q=peugeot+208&year=2022
// Busca modelos en Infoauto y devuelve marca, modelo, CODIA

import { getValidToken } from '../lib/token.js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q, year } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Parámetro q requerido (mínimo 2 caracteres)' });
  }

  try {
    const token = await getValidToken();

    // Construir URL de búsqueda
    const params = new URLSearchParams({
      query_string: q.trim(),
      query_mode:   'similarity',
      prices:       'true',      // Solo modelos con precio usado
      page_size:    '10',
      page:         '1'
    });

    // Filtrar por año si se especifica
    if (year) {
      params.set('price_at', year);
    }

    const iaRes = await fetch(`${IA_BASE}/search/?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!iaRes.ok) {
      throw new Error(`Infoauto search error: ${iaRes.status}`);
    }

    const data = await iaRes.json();

    // Mapear resultados al formato que necesita el LAB
    const results = (data.results || data || []).map(m => ({
      codia:       m.codia,
      descripcion: m.description,
      marca:       m.brand?.name || '',
      grupo:       m.group?.name || '',
      anioDesde:   m.prices_from,
      anioHasta:   m.prices_to,
      tienePrecio: m.prices
    }));

    return res.status(200).json({ ok: true, results });

  } catch (err) {
    console.error('Search error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
