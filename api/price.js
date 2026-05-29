// api/price.js
// Endpoint: GET /api/price?codia=12345&year=2022
// Devuelve el precio Infoauto (usado) para un modelo y año dados
// El precio viene en miles de pesos → lo multiplicamos por 1000

import { getValidToken } from '../lib/token.js';

const IA_BASE = 'https://api.infoauto.com.ar/cars/pub';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { codia, year } = req.query;

  if (!codia) return res.status(400).json({ error: 'Parámetro codia requerido' });
  if (!year)  return res.status(400).json({ error: 'Parámetro year requerido' });

  try {
    const token = await getValidToken();

    // Obtener todos los precios usados del modelo
    const iaRes = await fetch(`${IA_BASE}/models/${codia}/prices/`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!iaRes.ok) throw new Error(`Infoauto prices error: ${iaRes.status}`);

    const prices = await iaRes.json();

    // Buscar el precio del año solicitado
    const yearNum = parseInt(year);
    const match = (Array.isArray(prices) ? prices : []).find(p => p.year === yearNum);

    if (!match) {
      // Si no hay precio exacto para ese año, devolver el más cercano
      const sorted = (Array.isArray(prices) ? prices : [])
        .filter(p => p.price > 0)
        .sort((a, b) => Math.abs(a.year - yearNum) - Math.abs(b.year - yearNum));

      if (sorted.length === 0) {
        return res.status(404).json({ ok: false, error: 'Sin precio disponible para este modelo' });
      }

      const closest = sorted[0];
      return res.status(200).json({
        ok:       true,
        codia:    parseInt(codia),
        year:     closest.year,
        yearReq:  yearNum,
        precio:   closest.price * 1000, // Infoauto devuelve en miles
        exacto:   false,
        nota:     `Precio del año ${closest.year} (el más cercano a ${yearNum})`
      });
    }

    return res.status(200).json({
      ok:     true,
      codia:  parseInt(codia),
      year:   match.year,
      precio: match.price * 1000, // Infoauto devuelve en miles
      exacto: true
    });

  } catch (err) {
    console.error('Price error:', err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
